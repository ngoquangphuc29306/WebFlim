/**
 * Sort episode-like records in natural ascending order without mutating the
 * provider response.
 */
export function sortEpisodeItems<T extends { name: string; slug: string }>(items: T[]): T[] {
  if (!Array.isArray(items) || items.length <= 1) return items;

  const extractEpisodeNumber = (episode: T): number => {
    const nameMatch = episode.name.trim().match(/(\d+(?:\.\d+)?)/);
    if (nameMatch) return Number.parseFloat(nameMatch[1]);

    const slugMatch = episode.slug.match(/(\d+(?:\.\d+)?)/);
    if (slugMatch) return Number.parseFloat(slugMatch[1]);

    return Number.NaN;
  };

  return [...items].sort((a, b) => {
    const numberA = extractEpisodeNumber(a);
    const numberB = extractEpisodeNumber(b);
    const hasNumberA = Number.isFinite(numberA);
    const hasNumberB = Number.isFinite(numberB);

    if (hasNumberA && hasNumberB && numberA !== numberB) return numberA - numberB;
    if (hasNumberA !== hasNumberB) return hasNumberA ? -1 : 1;

    return a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' });
  });
}
