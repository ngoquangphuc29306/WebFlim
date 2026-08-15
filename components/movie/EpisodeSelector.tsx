'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Server, ChevronLeft, ChevronRight, Search, Play, ArrowUpDown, Check } from 'lucide-react';
import { usePlaybackProgress } from '@/lib/persistence/progress';
import { resolveEpisodeForServer } from './episode-selection';

interface EpisodeItem {
  name: string;
  slug: string;
  embedUrl: string;
  filename?: string;
}

interface ServerGroup {
  serverName: string;
  items: EpisodeItem[];
}

interface EpisodeSelectorProps {
  servers: ServerGroup[];
  currentServerIndex: number;
  currentEpisodeSlug: string;
  movieSlug: string;
}

export default function EpisodeSelector({
  servers,
  currentServerIndex,
  currentEpisodeSlug,
  movieSlug,
}: EpisodeSelectorProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [userSelectedChunkIdx, setUserSelectedChunkIdx] = useState<number | null>(null);
  const [prevEpSlug, setPrevEpSlug] = useState(currentEpisodeSlug);
  const [isDescending, setIsDescending] = useState(false);
  const { progressList } = usePlaybackProgress();

  // Compute Episode Watch States map
  const episodeProgressMap = useMemo(() => {
    const map = new Map<string, { percent: number; completed: boolean }>();
    progressList
      .filter((p) => p.movieSlug === movieSlug)
      .forEach((p) => {
        if (p.episodeSlug) {
          const percent = p.duration > 0 ? Math.min(100, Math.round((p.currentTime / p.duration) * 100)) : 0;
          map.set(p.episodeSlug, {
            percent,
            completed: p.completed,
          });
        }
      });
    return map;
  }, [progressList, movieSlug]);

  const activeServer = (servers && servers[currentServerIndex]) || servers?.[0];
  const rawEpisodes = useMemo(() => activeServer?.items || [], [activeServer]);

  // Derived episodes array with sort order applied
  const episodes = useMemo(() => {
    if (!rawEpisodes.length) return [];
    return isDescending ? [...rawEpisodes].reverse() : rawEpisodes;
  }, [rawEpisodes, isDescending]);

  const CHUNK_SIZE = 50;
  const numChunks = Math.ceil(episodes.length / CHUNK_SIZE);

  // Sync state during render when currentEpisodeSlug changes
  if (currentEpisodeSlug !== prevEpSlug) {
    setPrevEpSlug(currentEpisodeSlug);
    setUserSelectedChunkIdx(null);
  }

  // Calculate default chunk index containing current episode
  const autoChunkIdx = useMemo(() => {
    if (!currentEpisodeSlug || !episodes.length) return 0;
    const epIdx = episodes.findIndex((ep) => ep.slug === currentEpisodeSlug);
    if (epIdx !== -1) {
      return Math.floor(epIdx / CHUNK_SIZE);
    }
    return 0;
  }, [currentEpisodeSlug, episodes]);

  const activeChunkIdx = userSelectedChunkIdx !== null ? userSelectedChunkIdx : autoChunkIdx;

  if (!servers || servers.length === 0) return null;

  // Filter or chunk
  const activeChunkEpisodes = numChunks > 1 && !searchFilter.trim()
    ? episodes.slice(activeChunkIdx * CHUNK_SIZE, (activeChunkIdx + 1) * CHUNK_SIZE)
    : episodes;

  const filteredEpisodes = searchFilter.trim()
    ? episodes.filter((ep) =>
        ep.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
      )
    : activeChunkEpisodes;

  // Find index of current episode in raw list for linear prev/next
  const rawCurrentEpIndex = rawEpisodes.findIndex((ep) => ep.slug === currentEpisodeSlug);
  const prevEp = rawCurrentEpIndex > 0 ? rawEpisodes[rawCurrentEpIndex - 1] : null;
  const nextEp = rawCurrentEpIndex >= 0 && rawCurrentEpIndex < rawEpisodes.length - 1 ? rawEpisodes[rawCurrentEpIndex + 1] : null;

  return (
    <div className="bg-[#101010] border border-[#1f1f1f] p-3.5 sm:p-6 rounded-xl sm:rounded-2xl space-y-4 sm:space-y-6 my-4 sm:my-6">
      {/* Top Bar: Prev/Next Episode Navigation & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 sm:pb-4 border-b border-[#1f1f1f]">
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          {prevEp ? (
            <Link
              href={`/xem-phim/${movieSlug}?ep=${prevEp.slug}&server=${currentServerIndex}`}
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#181818] border border-[#2a2a2a] text-xs font-semibold text-white hover:border-[#e50914] hover:bg-[#222] transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-[#e50914]" />
              <span>Tập trước</span>
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#121212] border border-[#1f1f1f] text-xs text-[#525252] cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Tập trước</span>
            </button>
          )}

          {nextEp ? (
            <Link
              href={`/xem-phim/${movieSlug}?ep=${nextEp.slug}&server=${currentServerIndex}`}
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#e50914] hover:bg-[#f40612] text-xs font-bold text-white transition-colors shadow-md shadow-[#e50914]/20 active:scale-95"
            >
              <span>Tập sau</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#121212] border border-[#1f1f1f] text-xs text-[#525252] cursor-not-allowed"
            >
              <span>Tập sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Toggle Sort Order Button */}
          {episodes.length > 5 && (
            <button
              type="button"
              onClick={() => setIsDescending(!isDescending)}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-[#181818] border border-[#2a2a2a] text-xs font-semibold text-[#a3a3a3] hover:text-white hover:bg-[#222] transition-colors flex items-center gap-1.5 shrink-0"
              title={isDescending ? 'Đang sắp xếp: Mới nhất -> Cũ nhất' : 'Đang sắp xếp: Tập 1 -> Mới nhất'}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#e50914]" />
              <span className="hidden xs:inline">{isDescending ? 'Mới nhất trước' : 'Tập cũ trước'}</span>
            </button>
          )}

          {/* Episode Quick Filter */}
          {episodes.length > 12 && (
            <div className="relative w-full sm:w-52">
              <input
                type="text"
                placeholder="Tìm số tập..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#181818] text-white text-xs pl-8 pr-3 py-2.5 rounded-xl border border-[#2a2a2a] min-h-[40px] focus:outline-none focus:border-[#e50914] transition-colors placeholder:text-[#737373]"
              />
              <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          )}
        </div>
      </div>

      {/* Server Selector Tabs */}
      {servers.length > 1 && (
        <div className="space-y-2">
          <span className="text-[11px] sm:text-xs font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#e50914]" />
            Nguồn phát
          </span>
          <div className="flex flex-wrap gap-2">
            {servers.map((srv, idx) => {
              const active = idx === currentServerIndex;
              const targetEpisode = resolveEpisodeForServer({
                requestedEpisodeSlug: currentEpisodeSlug,
                targetEpisodes: srv.items,
              });
              const serverHref = targetEpisode
                ? `/xem-phim/${movieSlug}?ep=${targetEpisode.slug}&server=${idx}`
                : `/xem-phim/${movieSlug}?server=${idx}`;
              return (
                <Link
                  key={idx}
                  href={serverHref}
                  aria-current={active ? 'page' : undefined}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                    active
                      ? 'bg-[#e50914] text-white shadow-md shadow-[#e50914]/20 border border-[#e50914]'
                      : 'bg-[#181818] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:bg-[#222]'
                  }`}
                >
                  {srv.serverName || `Server #${idx + 1}`}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Chunk Range Selector for large series (>50 episodes) */}
      {numChunks > 1 && !searchFilter.trim() && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">
              Chọn nhóm tập phim
            </span>
            <span className="text-[11px] text-[#737373]">
              Hiển thị 50 tập/nhóm
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {Array.from({ length: numChunks }).map((_, cIdx) => {
              const startIdx = cIdx * CHUNK_SIZE;
              const endIdx = Math.min((cIdx + 1) * CHUNK_SIZE - 1, episodes.length - 1);
              const firstEpName = episodes[startIdx]?.name || `${startIdx + 1}`;
              const lastEpName = episodes[endIdx]?.name || `${endIdx + 1}`;
              const active = cIdx === activeChunkIdx;

              return (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => setUserSelectedChunkIdx(cIdx)}
                  aria-pressed={active}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                    active
                      ? 'bg-[#e50914] text-white font-bold shadow-md shadow-[#e50914]/25 ring-1 ring-[#e50914]'
                      : 'bg-[#181818] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:bg-[#222]'
                  }`}
                >
                  Tập {firstEpName} – {lastEpName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Episode Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">
          <span>Danh sách tập</span>
          <span className="text-[#737373] font-normal">{episodes.length} tập</span>
        </div>

        <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2 max-h-72 sm:max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {filteredEpisodes.map((ep) => {
              const isCurrent = ep.slug === currentEpisodeSlug;
              const status = episodeProgressMap.get(ep.slug);

              const isCompleted = Boolean(status?.completed);

              const inProgress = Boolean(
                status &&
                  !status.completed &&
                  status.percent > 0
              );

              const labelText = ep.name
                .trim()
                .toLowerCase()
                .startsWith('tập')
                  ? ep.name.trim()
                  : `Tập ${ep.name.trim()}`;

              const stateLabel = isCurrent
                ? inProgress
                  ? `, đang phát, đã xem ${status?.percent ?? 0}%`
                  : isCompleted
                  ? ', đang phát, đã xem'
                  : ', đang phát'
                : isCompleted
                ? ', đã xem'
                : inProgress
                ? `, đã xem ${status?.percent ?? 0}%`
                : '';

              return (
                <Link
                  key={ep.slug}
                  href={`/xem-phim/${movieSlug}?ep=${ep.slug}&server=${currentServerIndex}`}
                  aria-label={`${labelText}${stateLabel}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`
                    relative
                    min-h-[42px]
                    px-2
                    py-2
                    text-center
                    text-xs
                    font-semibold
                    rounded-xl
                    transition-all
                    truncate
                    flex
                    items-center
                    justify-center
                    gap-1
                    active:scale-95
                    overflow-hidden

                    ${
                      isCurrent
                        ? 'bg-[#e50914] text-white shadow-lg shadow-[#e50914]/25 ring-2 ring-[#e50914]'
                        : isCompleted
                        ? 'bg-[#181818] border border-emerald-900/60 text-emerald-300 hover:border-emerald-500'
                        : inProgress
                        ? 'bg-[#211517] border border-[#e50914]/50 text-white hover:border-[#e50914]'
                        : 'bg-[#181818] border border-[#262626] text-[#d4d4d4] hover:text-white hover:border-[#e50914] hover:bg-[#222]'
                    }
                  `}
                >
                  {isCurrent ? (
                    <Play className="w-3 h-3 fill-current shrink-0" />
                  ) : isCompleted ? (
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : null}

                  <span className="truncate">
                    {labelText}
                  </span>

                  {inProgress && (
                    <div
                      className="
                        absolute
                        bottom-0
                        left-0
                        right-0
                        h-1
                        bg-black/40
                        overflow-hidden
                      "
                      role="progressbar"
                      aria-valuenow={status?.percent ?? 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Đã xem ${status?.percent ?? 0}%`}
                    >
                      <div
                        className="
                          h-full
                          bg-[#e50914]
                          transition-[width]
                          duration-300
                        "
                        style={{
                          width: `${status?.percent ?? 0}%`,
                        }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}
