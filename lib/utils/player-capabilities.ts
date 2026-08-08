import { PlayerCapabilities } from '@/types/movie';

/**
 * Capability preset for iframe embedded player sources (cross-origin).
 * Cross-origin embeds cannot expose DOM/time/seek APIs directly without a provider postMessage bridge.
 */
export const EMBED_PLAYER_CAPABILITIES: PlayerCapabilities = {
  canReadCurrentTime: false,
  canReadDuration: false,
  canSeek: false,
  canDetectEnded: false,
  canChangePlaybackRate: false,
};

/**
 * Capability preset for direct media streams (HLS / HTML5 Video) where media elements expose full DOM state.
 */
export const DIRECT_PLAYER_CAPABILITIES: PlayerCapabilities = {
  canReadCurrentTime: true,
  canReadDuration: true,
  canSeek: true,
  canDetectEnded: true,
  canChangePlaybackRate: true,
};
