import { describe, expect, it } from 'vitest';
import {
  getPlayerSourceKey,
  isEditableKeyboardTarget,
} from '@/components/player/player-logic';
import {
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
  });
});
