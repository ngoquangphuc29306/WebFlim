import { describe, expect, it } from 'vitest';
import {
  isNativeHlsSupported,
  selectPlaybackBackend,
} from '@/components/player/playback-backend';

describe('playback backend selection', () => {
  it('does not mistake Chromium ambiguous HLS support for native playback', () => {
    expect(isNativeHlsSupported('maybe', 'Mozilla/5.0 Chrome/140.0 Safari/537.36')).toBe(false);
    expect(isNativeHlsSupported('probably', 'Mozilla/5.0 Chrome/140.0 Safari/537.36')).toBe(true);
  });

  it('allows ambiguous HLS support for WebKit/Safari', () => {
    expect(isNativeHlsSupported('maybe', 'Mozilla/5.0 Version/18.0 Safari/605.1.15')).toBe(true);
  });

  it('uses native HLS when the browser supports it', () => {
    expect(
      selectPlaybackBackend({
        hasDirectHls: true,
        nativeHlsSupported: true,
        hlsJsSupported: true,
        hasTrustedEmbed: true,
      })
    ).toBe('native-hls');
  });

  it('uses HLS.js when native HLS is unavailable', () => {
    expect(
      selectPlaybackBackend({
        hasDirectHls: true,
        nativeHlsSupported: false,
        hlsJsSupported: true,
        hasTrustedEmbed: true,
      })
    ).toBe('hls-js');
  });

  it('falls back to the trusted embed when no HLS backend is available', () => {
    expect(
      selectPlaybackBackend({
        hasDirectHls: true,
        nativeHlsSupported: false,
        hlsJsSupported: false,
        hasTrustedEmbed: true,
      })
    ).toBe('embed');
  });

  it('uses the trusted embed when the normalized source has no HLS URL', () => {
    expect(
      selectPlaybackBackend({
        hasDirectHls: false,
        nativeHlsSupported: false,
        hlsJsSupported: false,
        hasTrustedEmbed: true,
      })
    ).toBe('embed');
  });

  it('returns unavailable when neither direct HLS nor embed is available', () => {
    expect(
      selectPlaybackBackend({
        hasDirectHls: false,
        nativeHlsSupported: false,
        hlsJsSupported: false,
        hasTrustedEmbed: false,
      })
    ).toBe('unavailable');
  });
});
