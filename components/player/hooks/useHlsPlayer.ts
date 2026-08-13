import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type Hls from 'hls.js';
import {
  isNativeHlsSupported,
  selectPlaybackBackend,
} from '@/components/player/playback-backend';
import type { PlaybackBackend } from '@/components/player/playback-backend';

export type PlayerMode = PlaybackBackend;

export const MAX_NETWORK_RECOVERY_ATTEMPTS = 2;
export const MAX_MEDIA_RECOVERY_ATTEMPTS = 2;

export type HlsRecoveryAction = 'network' | 'media' | 'fallback';

export function getHlsRecoveryAction(
  errorType: string,
  networkRecoveryCount: number,
  mediaRecoveryCount: number,
  errorTypes: { network: string; media: string }
): HlsRecoveryAction {
  if (
    errorType === errorTypes.network &&
    networkRecoveryCount < MAX_NETWORK_RECOVERY_ATTEMPTS
  ) {
    return 'network';
  }

  if (errorType === errorTypes.media && mediaRecoveryCount < MAX_MEDIA_RECOVERY_ATTEMPTS) {
    return 'media';
  }

  return 'fallback';
}

interface UseHlsPlayerOptions {
  useDirectStream: boolean;
  m3u8Url?: string;
  embedUrl: string;
  getVideoElement: () => HTMLVideoElement | null;
  hlsRef: MutableRefObject<Hls | null>;
  sourceGenerationRef: MutableRefObject<number>;
  networkRecoveryCountRef: MutableRefObject<number>;
  mediaRecoveryCountRef: MutableRefObject<number>;
  fallbackTriggeredRef: MutableRefObject<boolean>;
  countdownTimerRef: MutableRefObject<NodeJS.Timeout | null>;
  setPlayerMode: Dispatch<SetStateAction<PlayerMode>>;
  fallbackToEmbed: (reason?: string) => void;
}

export function useHlsPlayer({
  useDirectStream,
  m3u8Url,
  embedUrl,
  getVideoElement,
  hlsRef,
  sourceGenerationRef,
  networkRecoveryCountRef,
  mediaRecoveryCountRef,
  fallbackTriggeredRef,
  countdownTimerRef,
  setPlayerMode,
  fallbackToEmbed,
}: UseHlsPlayerOptions): void {
  useEffect(() => {
    let isCancelled = false;
    const currentGen = ++sourceGenerationRef.current;

    // Reset recovery counters on new source setup
    networkRecoveryCountRef.current = 0;
    mediaRecoveryCountRef.current = 0;
    fallbackTriggeredRef.current = false;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // Clear previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!useDirectStream || !m3u8Url) {
      queueMicrotask(() => {
        if (!isCancelled && sourceGenerationRef.current === currentGen) {
          setPlayerMode(embedUrl ? 'embed' : 'unavailable');
        }
      });
      return;
    }

    const video = getVideoElement();
    if (!video) return;

    // Chromium may report "maybe" for HLS while still lacking native
    // playback. Treat a definite "probably" as native everywhere and allow
    // the ambiguous result only for WebKit/Safari, where native HLS is real.
    const nativeHlsResult = video.canPlayType('application/vnd.apple.mpegurl');
    const canNative = isNativeHlsSupported(nativeHlsResult, navigator.userAgent);

    if (canNative) {
      queueMicrotask(() => {
        if (!isCancelled && sourceGenerationRef.current === currentGen) {
          setPlayerMode('native-hls');
        }
      });
      video.src = m3u8Url;
    } else {
      // Direct HLS stream requires hls.js on non-native browsers -> Dynamically import hls.js
      import('hls.js')
        .then(({ default: HlsClass }) => {
          if (isCancelled || sourceGenerationRef.current !== currentGen) {
            return;
          }

          const backend = selectPlaybackBackend({
            hasDirectHls: true,
            nativeHlsSupported: canNative,
            hlsJsSupported: HlsClass.isSupported(),
            hasTrustedEmbed: Boolean(embedUrl),
          });

          if (backend !== 'hls-js') {
            fallbackToEmbed('HLS not supported in this browser environment');
            return;
          }

          const currentVideo = getVideoElement();
          if (!currentVideo) return;

          queueMicrotask(() => {
            if (!isCancelled && sourceGenerationRef.current === currentGen) {
              setPlayerMode('hls-js');
            }
          });

          const hls = new HlsClass({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hlsRef.current = hls;

          hls.loadSource(m3u8Url);
          hls.attachMedia(currentVideo);

          hls.on(HlsClass.Events.ERROR, (_event, data) => {
            if (isCancelled || sourceGenerationRef.current !== currentGen) return;
            if (data.fatal) {
              console.warn('HLS.js fatal error encountered:', data.type, data.details);
              const recoveryAction = getHlsRecoveryAction(
                data.type,
                networkRecoveryCountRef.current,
                mediaRecoveryCountRef.current,
                {
                  network: HlsClass.ErrorTypes.NETWORK_ERROR,
                  media: HlsClass.ErrorTypes.MEDIA_ERROR,
                }
              );

              switch (recoveryAction) {
                case 'network':
                  networkRecoveryCountRef.current += 1;
                  console.info(
                    `HLS.js network recovery attempt ${networkRecoveryCountRef.current}/${MAX_NETWORK_RECOVERY_ATTEMPTS}`
                  );
                  hls.startLoad();
                  break;
                case 'media':
                  mediaRecoveryCountRef.current += 1;
                  console.info(
                    `HLS.js media recovery attempt ${mediaRecoveryCountRef.current}/${MAX_MEDIA_RECOVERY_ATTEMPTS}`
                  );
                  hls.recoverMediaError();
                  break;
                default:
                  if (
                    data.type === HlsClass.ErrorTypes.NETWORK_ERROR ||
                    data.type === HlsClass.ErrorTypes.MEDIA_ERROR
                  ) {
                    fallbackToEmbed(
                      data.type === HlsClass.ErrorTypes.NETWORK_ERROR
                        ? 'Exhausted network recovery retries'
                        : 'Exhausted media recovery retries'
                    );
                  } else {
                    fallbackToEmbed('Unrecoverable HLS error');
                  }
                  break;
              }
            }
          });
        })
        .catch((err) => {
          if (isCancelled || sourceGenerationRef.current !== currentGen) return;
          console.error('Failed to dynamically load hls.js engine:', err);
          fallbackToEmbed('Failed to initialize HLS engine');
        });
    }

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [
    useDirectStream,
    m3u8Url,
    embedUrl,
    getVideoElement,
    hlsRef,
    sourceGenerationRef,
    networkRecoveryCountRef,
    mediaRecoveryCountRef,
    fallbackTriggeredRef,
    countdownTimerRef,
    setPlayerMode,
    fallbackToEmbed,
  ]);
}
