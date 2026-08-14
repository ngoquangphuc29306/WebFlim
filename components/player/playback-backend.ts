export type PlaybackBackend = 'native-hls' | 'hls-js' | 'embed' | 'unavailable';

export interface PlaybackBackendInput {
  hasDirectHls: boolean;
  nativeHlsSupported: boolean;
  hlsJsSupported: boolean;
  hasTrustedEmbed: boolean;
}

export function isNativeHlsSupported(canPlayTypeResult: string, userAgent: string): boolean {
  const isWebKitHlsBrowser =
    /Safari/i.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg/i.test(userAgent);
  return canPlayTypeResult === 'probably' ||
    (canPlayTypeResult !== '' && isWebKitHlsBrowser);
}

export function selectPlaybackBackend({
  hasDirectHls,
  nativeHlsSupported,
  hlsJsSupported,
  hasTrustedEmbed,
}: PlaybackBackendInput): PlaybackBackend {
  if (hasDirectHls && nativeHlsSupported) return 'native-hls';
  if (hasDirectHls && hlsJsSupported) return 'hls-js';
  if (hasTrustedEmbed) return 'embed';
  return 'unavailable';
}
