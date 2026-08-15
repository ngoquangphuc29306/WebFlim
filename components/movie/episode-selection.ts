export interface EpisodeSelectionItem {
  slug: string;
}

export function normalizeServerIndex(serverIndex: number, serverCount: number): number {
  if (
    serverCount <= 0 ||
    !Number.isInteger(serverIndex) ||
    serverIndex < 0 ||
    serverIndex >= serverCount
  ) {
    return 0;
  }

  return serverIndex;
}

export function resolveEpisodeForServer<T extends EpisodeSelectionItem>({
  requestedEpisodeSlug,
  targetEpisodes,
}: {
  requestedEpisodeSlug?: string;
  targetEpisodes: readonly T[];
}): T | null {
  if (targetEpisodes.length === 0) return null;

  return (
    targetEpisodes.find((episode) => episode.slug === requestedEpisodeSlug) ??
    targetEpisodes[0] ??
    null
  );
}
