import {
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type Hls from 'hls.js';
import type Plyr from 'plyr';
import {
  isNativeHlsSupported,
  selectPlaybackBackend,
} from '@/components/player/playback-backend';
import { isCurrentPlayerSourceGeneration } from '@/components/player/player-logic';
import type { PlaybackBackend } from '@/components/player/playback-backend';

export type PlayerMode = PlaybackBackend;

export const MAX_NETWORK_RECOVERY_ATTEMPTS = 2;
export const MAX_MEDIA_RECOVERY_ATTEMPTS = 2;

export type HlsRecoveryAction = 'network' | 'media' | 'fallback';

export interface PlayerCleanupResources {
  video: HTMLVideoElement | null;
  host: HTMLDivElement | null;
  hls: Pick<Hls, 'destroy'> | null;
  plyr: Pick<Plyr, 'destroy'> | null;
  clearFallbackTimer: () => void;
  clearCountdownTimer: () => void;
  removeListeners: () => void;
  invalidateSource: () => void;
  clearRefs?: () => void;
}

export function createPlayerCleanup({
  video,
  host,
  hls,
  plyr,
  clearFallbackTimer,
  clearCountdownTimer,
  removeListeners,
  invalidateSource,
  clearRefs,
}: PlayerCleanupResources): () => void {
  let cleaned = false;

  return () => {
    if (cleaned) return;
    cleaned = true;

    invalidateSource();
    clearFallbackTimer();
    clearCountdownTimer();

    try {
      video?.pause();
    } catch {
      // Cleanup must remain safe when a browser has already detached media.
    }

    try {
      removeListeners();
    } catch {
      // Listener cleanup is best-effort and idempotent.
    }

    try {
      plyr?.destroy();
    } catch {
      // Plyr may already have released its wrapper during unmount.
    }

    try {
      hls?.destroy();
    } catch {
      // HLS.js may already be detached during a source transition.
    }

    if (video) {
      try {
        video.removeAttribute('src');
        video.load();
      } catch {
        // Some browsers reject load after a media node is detached.
      }
    }

    try {
      host?.replaceChildren();
    } catch {
      // The host may already have been removed by React.
    }

    clearRefs?.();
  };
}

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

export interface UseHlsPlayerOptions {
  useDirectStream: boolean;
  m3u8Url?: string;
  embedUrl: string;
  videoHostRef: MutableRefObject<HTMLDivElement | null>;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  hlsRef: MutableRefObject<Hls | null>;
  plyrRef: MutableRefObject<Plyr | null>;
  directCleanupRef: MutableRefObject<(() => void) | null>;
  sourceGenerationRef: MutableRefObject<number>;
  networkRecoveryCountRef: MutableRefObject<number>;
  mediaRecoveryCountRef: MutableRefObject<number>;
  fallbackTriggeredRef: MutableRefObject<boolean>;
  countdownTimerRef: MutableRefObject<NodeJS.Timeout | null>;
  setPlayerMode: Dispatch<SetStateAction<PlayerMode>>;
  fallbackToEmbed: (reason?: string, sourceGeneration?: number) => void;
  onLoadedMetadata?: () => void;
  onCanPlay?: () => void;
  onPlaying?: () => void;
  onTimeUpdate?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  onEnterPiP?: () => void;
  onLeavePiP?: () => void;
}

export function useHlsPlayer({
  useDirectStream,
  m3u8Url,
  embedUrl,
  videoHostRef,
  videoRef,
  hlsRef,
  plyrRef,
  directCleanupRef,
  sourceGenerationRef,
  networkRecoveryCountRef,
  mediaRecoveryCountRef,
  fallbackTriggeredRef,
  countdownTimerRef,
  setPlayerMode,
  fallbackToEmbed,
  onLoadedMetadata,
  onCanPlay,
  onPlaying,
  onTimeUpdate,
  onPause,
  onEnded,
  onError,
  onEnterPiP,
  onLeavePiP,
}: UseHlsPlayerOptions): void {
  // Keep fresh references to event handlers to avoid re-triggering player mounts
  const handlersRef = useRef({
    onLoadedMetadata,
    onCanPlay,
    onPlaying,
    onTimeUpdate,
    onPause,
    onEnded,
    onError,
    onEnterPiP,
    onLeavePiP,
  });

  useEffect(() => {
    handlersRef.current = {
      onLoadedMetadata,
      onCanPlay,
      onPlaying,
      onTimeUpdate,
      onPause,
      onEnded,
      onError,
      onEnterPiP,
      onLeavePiP,
    };
  });

  useEffect(() => {
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout | null = null;
    directCleanupRef.current?.();
    const currentGen = ++sourceGenerationRef.current;

    // Reset recovery counters on new source setup
    networkRecoveryCountRef.current = 0;
    mediaRecoveryCountRef.current = 0;
    fallbackTriggeredRef.current = false;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    const host = videoHostRef.current;

    if (!useDirectStream || !m3u8Url || !host) {
      videoRef.current = null;
      queueMicrotask(() => {
        if (!isCancelled && isCurrentPlayerSourceGeneration(sourceGenerationRef.current, currentGen)) {
          setPlayerMode(embedUrl ? 'embed' : 'unavailable');
        }
      });
      return;
    }

    // Imperatively create and mount video element inside unmanaged host div
    // This isolates Plyr DOM mutations from React virtual DOM reconciliation
    host.replaceChildren();
    const video = document.createElement('video');
    video.className = 'w-full h-full bg-black object-contain';
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    host.appendChild(video);
    videoRef.current = video;

    const handleLoadedMetadata = () => handlersRef.current.onLoadedMetadata?.();
    const handleTimeUpdate = () => handlersRef.current.onTimeUpdate?.();
    const handlePause = () => handlersRef.current.onPause?.();
    const handleEnded = () => handlersRef.current.onEnded?.();
    const handleDirectError = () => handlersRef.current.onError?.();
    const handleEnterPiP = () => handlersRef.current.onEnterPiP?.();
    const handleLeavePiP = () => handlersRef.current.onLeavePiP?.();

    const cancelFallbackTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const handleCanPlay = () => {
      cancelFallbackTimer();
      handlersRef.current.onCanPlay?.();
    };
    const handlePlaying = () => {
      cancelFallbackTimer();
      handlersRef.current.onPlaying?.();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleDirectError);
    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    // Safety timeout: If direct m3u8 does not load metadata within 7s and embedUrl is available, fallback to embed
    if (embedUrl) {
      timeoutId = setTimeout(() => {
        if (
          !isCancelled &&
          isCurrentPlayerSourceGeneration(sourceGenerationRef.current, currentGen) &&
          !fallbackTriggeredRef.current
        ) {
          if (video.readyState < 1) {
            console.warn('Direct stream connection timed out, falling back to embed player.');
            fallbackToEmbed('Timeout connecting to direct stream', currentGen);
          }
        }
      }, 7000);
    }

    const nativeHlsResult = video.canPlayType('application/vnd.apple.mpegurl');
    const canNative = isNativeHlsSupported(nativeHlsResult, navigator.userAgent);

    const initPlyr = () => {
      if (
        isCancelled ||
        !isCurrentPlayerSourceGeneration(sourceGenerationRef.current, currentGen) ||
        plyrRef.current
      ) return;
      void import('plyr')
        .then(({ default: PlyrClass }) => {
          if (
            isCancelled ||
            !isCurrentPlayerSourceGeneration(sourceGenerationRef.current, currentGen) ||
            plyrRef.current
          ) return;
          type PlyrRuntimeOptions = NonNullable<ConstructorParameters<typeof PlyrClass>[1]> & {
            fullscreen: { enabled: boolean; fallback: boolean; iosNative: boolean };
          };
          const playerOptions: PlyrRuntimeOptions = {
            controls: ['play-large', 'play', 'progress', 'current-time', 'fullscreen'],
            captions: { active: false, update: false },
            fullscreen: { enabled: true, fallback: true, iosNative: true },
          };
          const player = new PlyrClass(video, playerOptions);
          if (isCancelled) {
            player.destroy();
            return;
          }
          ownedPlyr = player;
          plyrRef.current = player;
        })
        .catch(() => {
          // Native controls / custom overlay remain functional
        });
    };

    if (canNative) {
      queueMicrotask(() => {
        if (!isCancelled && isCurrentPlayerSourceGeneration(sourceGenerationRef.current, currentGen)) {
          setPlayerMode('native-hls');
        }
      });
      video.src = m3u8Url;
      initPlyr();
    } else {
      // Direct HLS stream requires hls.js on non-native browsers -> Dynamically import hls.js
      import('hls.js')
        .then(({ default: HlsClass }) => {
          if (isCancelled || !isCurrentPlayerSourceGeneration(sourceGenerationRef.current, currentGen)) {
            return;
          }

          const backend = selectPlaybackBackend({
            hasDirectHls: true,
            nativeHlsSupported: canNative,
            hlsJsSupported: HlsClass.isSupported(),
            hasTrustedEmbed: Boolean(embedUrl),
          });

          if (backend !== 'hls-js') {
            fallbackToEmbed('HLS not supported in this browser environment', currentGen);
            return;
          }

          queueMicrotask(() => {
            if (!isCancelled && isCurrentPlayerSourceGeneration(sourceGenerationRef.current, currentGen)) {
              setPlayerMode('hls-js');
            }
          });

          const hls = new HlsClass({
            enableWorker: true,
            lowLatencyMode: false,
          });
          ownedHls = hls;
          hlsRef.current = hls;

          hls.loadSource(m3u8Url);
          hls.attachMedia(video);

          hls.on(HlsClass.Events.ERROR, (_event, data) => {
            if (isCancelled || !isCurrentPlayerSourceGeneration(sourceGenerationRef.current, currentGen)) return;
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
                        : 'Exhausted media recovery retries',
                      currentGen
                    );
                  } else {
                    fallbackToEmbed('Unrecoverable HLS error', currentGen);
                  }
                  break;
              }
            }
          });

          initPlyr();
        })
        .catch((err) => {
          if (isCancelled || !isCurrentPlayerSourceGeneration(sourceGenerationRef.current, currentGen)) return;
          console.error('Failed to dynamically load hls.js engine:', err);
          fallbackToEmbed('Failed to initialize HLS engine', currentGen);
        });
    }

    let ownedHls: Hls | null = null;
    let ownedPlyr: Plyr | null = null;
    const removeListeners = () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleDirectError);
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };

    const cleanupDirectBackend = createPlayerCleanup({
      video,
      host,
      hls: { destroy: () => ownedHls?.destroy() },
      plyr: { destroy: () => ownedPlyr?.destroy() },
      clearFallbackTimer: cancelFallbackTimer,
      clearCountdownTimer: () => {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      },
      removeListeners,
      invalidateSource: () => {
        isCancelled = true;
        sourceGenerationRef.current += 1;
      },
      clearRefs: () => {
        if (hlsRef.current === ownedHls) hlsRef.current = null;
        if (plyrRef.current === ownedPlyr) plyrRef.current = null;
        if (videoRef.current === video) videoRef.current = null;
      },
    });
    directCleanupRef.current = cleanupDirectBackend;

    return () => {
      cleanupDirectBackend();
      if (directCleanupRef.current === cleanupDirectBackend) {
        directCleanupRef.current = null;
      }
    };
  }, [
    useDirectStream,
    m3u8Url,
    embedUrl,
    videoHostRef,
    videoRef,
    hlsRef,
    plyrRef,
    directCleanupRef,
    sourceGenerationRef,
    networkRecoveryCountRef,
    mediaRecoveryCountRef,
    fallbackTriggeredRef,
    countdownTimerRef,
    setPlayerMode,
    fallbackToEmbed,
  ]);
}
