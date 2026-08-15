import { useEffect, type MutableRefObject } from 'react';
import type Plyr from 'plyr';

export const PLYR_CONTROLS = [
  'play-large',
  'play',
  'progress',
  'current-time',
  'fullscreen',
] as const;

export interface UsePlyrPlayerOptions {
  enabled: boolean;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  videoMountKey?: number;
  plyrRef: MutableRefObject<Plyr | null>;
}

/** Creates one Plyr instance for the existing HLS/native video element. */
export function usePlyrPlayer({
  enabled,
  videoRef,
  videoMountKey,
  plyrRef,
}: UsePlyrPlayerOptions): void {
  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;
    if (!enabled || !video) return;

    void import('plyr').then(({ default: PlyrClass }) => {
      if (cancelled || plyrRef.current || !videoRef.current) return;

      const player = new PlyrClass(video, {
        controls: [...PLYR_CONTROLS],
        captions: { active: false, update: false },
      });

      if (cancelled) {
        player.destroy();
        return;
      }
      plyrRef.current = player;
    }).catch(() => {
      // The native video remains usable if the optional control layer fails to load.
    });

    return () => {
      cancelled = true;
      if (plyrRef.current) {
        plyrRef.current.destroy();
        plyrRef.current = null;
      }
    };
  }, [enabled, videoRef, videoMountKey, plyrRef]);
}
