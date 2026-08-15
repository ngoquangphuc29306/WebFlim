import { describe, expect, it } from 'vitest';
import {
  getPlayerSourceKey,
  isCurrentPlayerSourceGeneration,
  isEditableKeyboardTarget,
  isPlayerShortcutBlockedTarget,
} from '@/components/player/player-logic';
import {
  createPlayerCleanup,
  getHlsRecoveryAction,
  MAX_MEDIA_RECOVERY_ATTEMPTS,
  MAX_NETWORK_RECOVERY_ATTEMPTS,
} from '@/components/player/hooks/useHlsPlayer';

describe('player deterministic logic', () => {
  describe('keyboard target eligibility', () => {
    it('excludes form controls and contenteditable targets', () => {
      expect(isEditableKeyboardTarget(Object.assign(new EventTarget(), { tagName: 'INPUT' }))).toBe(true);
      expect(isEditableKeyboardTarget(Object.assign(new EventTarget(), { tagName: 'TEXTAREA' }))).toBe(true);
      expect(isEditableKeyboardTarget(Object.assign(new EventTarget(), { tagName: 'SELECT' }))).toBe(true);
      expect(isEditableKeyboardTarget(Object.assign(new EventTarget(), { isContentEditable: true }))).toBe(true);
    });

    it('allows ordinary player/container targets', () => {
      expect(isEditableKeyboardTarget(Object.assign(new EventTarget(), { tagName: 'DIV' }))).toBe(false);
      expect(isEditableKeyboardTarget(null)).toBe(false);
    });
  });

  describe('player shortcut guard', () => {
    it('blocks buttons and Plyr menus from global player shortcuts', () => {
      expect(isPlayerShortcutBlockedTarget(Object.assign(new EventTarget(), { tagName: 'BUTTON' }))).toBe(true);
      expect(isPlayerShortcutBlockedTarget(Object.assign(new EventTarget(), { role: 'menuitem' }))).toBe(true);
      expect(
        isPlayerShortcutBlockedTarget(
          Object.assign(new EventTarget(), {
            classList: { contains: (className: string) => className === 'plyr__menu' },
          })
        )
      ).toBe(true);
    });
  });

  describe('HLS recovery policy', () => {
    const errorTypes = { network: 'networkError', media: 'mediaError' };

    it('recovers network and media errors within their existing limits', () => {
      expect(getHlsRecoveryAction('networkError', 0, 0, errorTypes)).toBe('network');
      expect(getHlsRecoveryAction('mediaError', 0, 0, errorTypes)).toBe('media');
      expect(
        getHlsRecoveryAction('networkError', MAX_NETWORK_RECOVERY_ATTEMPTS, 0, errorTypes)
      ).toBe('fallback');
      expect(
        getHlsRecoveryAction('mediaError', 0, MAX_MEDIA_RECOVERY_ATTEMPTS, errorTypes)
      ).toBe('fallback');
    });

    it('falls back for unknown fatal errors', () => {
      expect(getHlsRecoveryAction('bufferStalledError', 0, 0, errorTypes)).toBe('fallback');
    });
  });

  describe('source identity', () => {
    const source = {
      movieSlug: 'movie',
      episodeSlug: 'episode-1',
      serverIndex: 0,
      embedUrl: 'https://player.example/embed/1',
    };

    it('changes when episode, server, or selected source changes', () => {
      const initial = getPlayerSourceKey(source);
      expect(getPlayerSourceKey({ ...source, episodeSlug: 'episode-2' })).not.toBe(initial);
      expect(getPlayerSourceKey({ ...source, serverIndex: 1 })).not.toBe(initial);
      expect(
        getPlayerSourceKey({ ...source, m3u8Url: 'https://stream.example/episode-1.m3u8' })
      ).not.toBe(initial);
    });

    it('rejects stale source generations', () => {
      expect(isCurrentPlayerSourceGeneration(4, 4)).toBe(true);
      expect(isCurrentPlayerSourceGeneration(5, 4)).toBe(false);
    });
  });

  describe('direct backend cleanup', () => {
    it('is idempotent and cancels all local cleanup resources once', () => {
      const calls = {
        pause: 0,
        load: 0,
        hls: 0,
        plyr: 0,
        fallbackTimer: 0,
        countdown: 0,
        listeners: 0,
        invalidated: 0,
        host: 0,
      };
      const video = {
        pause: () => calls.pause++,
        removeAttribute: () => undefined,
        load: () => calls.load++,
      } as unknown as HTMLVideoElement;
      const host = { replaceChildren: () => calls.host++ } as unknown as HTMLDivElement;

      const cleanup = createPlayerCleanup({
        video,
        host,
        hls: { destroy: () => calls.hls++ },
        plyr: { destroy: () => calls.plyr++ },
        clearFallbackTimer: () => calls.fallbackTimer++,
        clearCountdownTimer: () => calls.countdown++,
        removeListeners: () => calls.listeners++,
        invalidateSource: () => calls.invalidated++,
      });

      cleanup();
      cleanup();

      expect(calls).toEqual({
        pause: 1,
        load: 1,
        hls: 1,
        plyr: 1,
        fallbackTimer: 1,
        countdown: 1,
        listeners: 1,
        invalidated: 1,
        host: 1,
      });
    });
  });
});
