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

export function isPlayerShortcutBlockedTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;

  const element = target as {
    tagName?: string;
    role?: string | null;
    isContentEditable?: boolean;
    classList?: { contains: (className: string) => boolean };
    closest?: (selector: string) => Element | null;
  };

  if (
    isEditableKeyboardTarget(target) ||
    ['BUTTON', 'MENU', 'MENUITEM'].includes(element.tagName ?? '') ||
    ['button', 'menu', 'menuitem'].includes(element.role ?? '') ||
    element.classList?.contains('plyr__controls') ||
    element.classList?.contains('plyr__menu')
  ) {
    return true;
  }

  if (typeof element.closest === 'function') {
    return Boolean(
      element.closest(
        'button, [role="button"], [role="menu"], [role="menuitem"], input, textarea, select, [contenteditable="true"], .plyr__controls, .plyr__menu'
      )
    );
  }

  return false;
}

export function isCurrentPlayerSourceGeneration(
  currentGeneration: number,
  expectedGeneration: number
): boolean {
  return currentGeneration === expectedGeneration;
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
