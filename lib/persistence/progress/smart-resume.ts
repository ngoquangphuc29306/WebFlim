import { PlaybackProgress, ServerGroupModel } from '@/types/movie';
import { MIN_RESUME_SECONDS } from './progress.types';

export interface SmartResumeTarget {
  mode: 'start' | 'resume' | 'next' | 'replay';
  episodeSlug: string;
  episodeName: string;
  serverIndex: number;
  serverName?: string;
  currentTime?: number;
  duration?: number;
  label: string;
  subLabel?: string;
}

export function formatSecondsToTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function resolveResumeTarget({
  movieSlug,
  movieType,
  episodes = [],
  progressRecords = [],
}: {
  movieSlug: string;
  movieType?: string;
  episodes: ServerGroupModel[];
  progressRecords: PlaybackProgress[];
}): SmartResumeTarget {
  const isSingleMovie = movieType === 'single';
  const defaultServerIdx = 0;
  const defaultServer = episodes[defaultServerIdx] || episodes[0];
  const defaultEp = defaultServer?.items?.[0] || { name: '1', slug: 'tap-1' };

  // Filter progress records for this movie
  const movieProgresses = progressRecords
    .filter((p) => p.movieSlug === movieSlug)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const latestProgress = movieProgresses[0];

  // Case A: Never watched or invalid
  if (!latestProgress) {
    return {
      mode: 'start',
      episodeSlug: defaultEp.slug,
      episodeName: defaultEp.name,
      serverIndex: defaultServerIdx,
      serverName: defaultServer?.serverName,
      label: isSingleMovie ? 'Xem Phim Ngay' : 'Xem từ Tập 1',
    };
  }

  const sIndex =
    typeof latestProgress.serverIndex === 'number' &&
    latestProgress.serverIndex >= 0 &&
    latestProgress.serverIndex < episodes.length
      ? latestProgress.serverIndex
      : defaultServerIdx;

  const serverGroup = episodes[sIndex] || defaultServer;
  const items = serverGroup?.items || [];
  const currentEpIdx = items.findIndex((ep) => ep.slug === latestProgress.episodeSlug);

  // Case B: Episode in progress
  if (!latestProgress.completed && latestProgress.currentTime >= MIN_RESUME_SECONDS) {
    const epName = latestProgress.episodeName || (currentEpIdx >= 0 ? items[currentEpIdx].name : '1');
    const epSlug = latestProgress.episodeSlug || defaultEp.slug;

    let subText = undefined;
    if (latestProgress.duration && latestProgress.duration > 0) {
      subText = `${formatSecondsToTime(latestProgress.currentTime)} / ${formatSecondsToTime(latestProgress.duration)}`;
    }

    return {
      mode: 'resume',
      episodeSlug: epSlug,
      episodeName: epName,
      serverIndex: sIndex,
      serverName: latestProgress.serverName || serverGroup?.serverName,
      currentTime: latestProgress.currentTime,
      duration: latestProgress.duration,
      label: isSingleMovie ? 'Tiếp tục xem' : `Tiếp tục Tập ${epName}`,
      subLabel: subText,
    };
  }

  // Case C: Episode completed, check if next episode exists
  if (latestProgress.completed) {
    if (currentEpIdx >= 0 && currentEpIdx < items.length - 1) {
      const nextEp = items[currentEpIdx + 1];
      return {
        mode: 'next',
        episodeSlug: nextEp.slug,
        episodeName: nextEp.name,
        serverIndex: sIndex,
        serverName: serverGroup?.serverName,
        label: isSingleMovie ? 'Xem lại' : `Xem tiếp Tập ${nextEp.name}`,
      };
    }

    // Case D: Final episode completed
    return {
      mode: 'replay',
      episodeSlug: defaultEp.slug,
      episodeName: defaultEp.name,
      serverIndex: sIndex,
      serverName: serverGroup?.serverName,
      label: 'Xem lại từ đầu',
    };
  }

  // Default fallback
  return {
    mode: 'start',
    episodeSlug: defaultEp.slug,
    episodeName: defaultEp.name,
    serverIndex: defaultServerIdx,
    serverName: defaultServer?.serverName,
    label: isSingleMovie ? 'Xem Phim Ngay' : 'Xem từ Tập 1',
  };
}
