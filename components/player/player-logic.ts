export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;

  const element = target as { tagName?: string; isContentEditable?: boolean };
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable === true
  );
}

interface PlayerSourceKeyInput {
  movieSlug: string;
  episodeSlug: string;
  serverIndex?: number;
  m3u8Url?: string;
  embedUrl: string;
}

export function getPlayerSourceKey({
  movieSlug,
  episodeSlug,
  serverIndex,
  m3u8Url,
  embedUrl,
}: PlayerSourceKeyInput): string {
  return `${movieSlug}:${episodeSlug}:${serverIndex ?? 0}:${m3u8Url ?? embedUrl}`;
}
