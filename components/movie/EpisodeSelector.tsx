'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Server,
  ChevronLeft,
  ChevronRight,
  Search,
  Play,
  ArrowUpDown,
  Check,
  Tv,
  LayoutGrid,
} from 'lucide-react';
import { usePlaybackProgress } from '@/lib/persistence/progress';
import { resolveEpisodeForServer } from './episode-selection';
import MovieImage from '@/components/ui/MovieImage';

interface EpisodeItem {
  name: string;
  slug: string;
  embedUrl: string;
  m3u8Url?: string;
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
  movieTitle?: string;
  posterUrl?: string;
  thumbUrl?: string;
}

/**
 * Animated audio equalizer bars icon for currently active episode
 */
function EqualizerIcon({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[2px] h-3.5 ${className}`} aria-hidden="true">
      <span className="w-[2.5px] bg-white rounded-full h-full animate-[pulse_0.8s_ease-in-out_infinite]" />
      <span className="w-[2.5px] bg-white rounded-full h-2/3 animate-[pulse_0.6s_ease-in-out_infinite_0.15s]" />
      <span className="w-[2.5px] bg-white rounded-full h-4/5 animate-[pulse_0.9s_ease-in-out_infinite_0.3s]" />
      <span className="w-[2.5px] bg-white rounded-full h-1/2 animate-[pulse_0.7s_ease-in-out_infinite_0.1s]" />
    </span>
  );
}

/**
 * Format server names with VIP & Backup classifications
 */
function formatServerClassification(serverName: string, index: number): {
  displayName: string;
  badgeLabel: string;
  isVip: boolean;
} {
  const raw = (serverName || '').trim();
  const isVip = index === 0;

  if (raw.toLowerCase().includes('vietsub')) {
    return {
      displayName: isVip ? 'Server Vietsub 1' : `Server Vietsub ${index + 1}`,
      badgeLabel: isVip ? 'VIP' : 'Dự phòng',
      isVip,
    };
  }

  if (raw.toLowerCase().includes('lồng tiếng') || raw.toLowerCase().includes('thuyết minh')) {
    return {
      displayName: raw,
      badgeLabel: isVip ? 'VIP' : 'Dự phòng',
      isVip,
    };
  }

  if (isVip) {
    return {
      displayName: raw || 'Server Vietsub 1',
      badgeLabel: 'VIP',
      isVip: true,
    };
  }

  return {
    displayName: raw || `Server ${index + 1}`,
    badgeLabel: index === 1 ? 'Dự phòng' : `Dự phòng ${index}`,
    isVip: false,
  };
}

export default function EpisodeSelector({
  servers,
  currentServerIndex,
  currentEpisodeSlug,
  movieSlug,
  movieTitle = '',
  posterUrl,
  thumbUrl,
}: EpisodeSelectorProps) {
  const [viewMode, setViewMode] = useState<'rail' | 'grid'>('rail');
  const [searchFilter, setSearchFilter] = useState('');
  const [userSelectedChunkIdx, setUserSelectedChunkIdx] = useState<number | null>(null);
  const [prevEpSlug, setPrevEpSlug] = useState(currentEpisodeSlug);
  const [isDescending, setIsDescending] = useState(false);

  // References for horizontal scrolling rail
  const railContainerRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLAnchorElement>(null);

  // Drag-to-scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [hasDragged, setHasDragged] = useState(false);
  const hasDraggedRef = useRef(false);

  const { progressList } = usePlaybackProgress();

  // Compute Episode Watch States map
  const episodeProgressMap = useMemo(() => {
    const map = new Map<string, { percent: number; completed: boolean }>();
    progressList
      .filter((p) => p.movieSlug === movieSlug)
      .forEach((p) => {
        if (p.episodeSlug) {
          const percent =
            p.duration > 0
              ? Math.min(100, Math.round((p.currentTime / p.duration) * 100))
              : 0;
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

  const activeChunkIdx =
    userSelectedChunkIdx !== null ? userSelectedChunkIdx : autoChunkIdx;

  // Auto-scroll to active episode card inside rail on initial mount / episode switch
  useEffect(() => {
    if (viewMode === 'rail' && activeCardRef.current && railContainerRef.current) {
      const timer = setTimeout(() => {
        activeCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentEpisodeSlug, viewMode, activeServer]);

  // Mouse wheel horizontal scroll handler on rail
  useEffect(() => {
    const rail = railContainerRef.current;
    if (!rail || viewMode !== 'rail') return;

    const handleWheel = (e: WheelEvent) => {
      // If user is scrolling vertically with wheel, convert to horizontal scroll smoothly
      if (e.deltaY !== 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        e.preventDefault();
        rail.scrollBy({
          left: e.deltaY * 1.5,
          behavior: 'auto',
        });
      }
    };

    rail.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      rail.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode, episodes.length, activeChunkIdx]);

  // Mouse drag handlers for desktop smooth dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!railContainerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    setHasDragged(false);
    startXRef.current = e.pageX - railContainerRef.current.offsetLeft;
    scrollLeftRef.current = railContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !railContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - railContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    railContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
    if (Math.abs(walk) > 6) {
      hasDraggedRef.current = true;
      setHasDragged(true);
    }
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    // Delay clearing hasDragged so the immediate click event can be prevented
    setTimeout(() => {
      hasDraggedRef.current = false;
      setHasDragged(false);
    }, 50);
  };

  // Horizontal scroll step handlers
  const scrollRail = useCallback((direction: 'left' | 'right') => {
    if (!railContainerRef.current) return;
    const container = railContainerRef.current;
    const scrollAmount = Math.max(320, container.clientWidth * 0.75);
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  if (!servers || servers.length === 0) return null;

  // Filter or chunk
  const activeChunkEpisodes =
    numChunks > 1 && !searchFilter.trim()
      ? episodes.slice(
          activeChunkIdx * CHUNK_SIZE,
          (activeChunkIdx + 1) * CHUNK_SIZE
        )
      : episodes;

  const filteredEpisodes = searchFilter.trim()
    ? episodes.filter((ep) =>
        ep.name.toLowerCase().includes(searchFilter.trim().toLowerCase())
      )
    : activeChunkEpisodes;

  // Find index of current episode in raw list for linear prev/next
  const rawCurrentEpIndex = rawEpisodes.findIndex(
    (ep) => ep.slug === currentEpisodeSlug
  );
  const prevEp =
    rawCurrentEpIndex > 0 ? rawEpisodes[rawCurrentEpIndex - 1] : null;
  const nextEp =
    rawCurrentEpIndex >= 0 && rawCurrentEpIndex < rawEpisodes.length - 1
      ? rawEpisodes[rawCurrentEpIndex + 1]
      : null;

  // Best preview thumbnail for episode cards
  const previewImage = thumbUrl || posterUrl;

  return (
    <div className="bg-[#101010] border border-[#1f1f1f] p-3.5 sm:p-5 rounded-2xl space-y-4 sm:space-y-5 my-4 sm:my-6 shadow-xl">
      {/* ============================================================ */}
      {/* 1. TOP UTILITY: Prev/Next Buttons + Search & Sort Controls   */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 sm:pb-4 border-b border-[#1f1f1f]">
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          {prevEp ? (
            <Link
              href={`/xem-phim/${movieSlug}?ep=${prevEp.slug}&server=${currentServerIndex}`}
              className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#181818] border border-[#2a2a2a] text-xs font-semibold text-white hover:border-[#e50914] hover:bg-[#222] transition-colors active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-[#e50914]" />
              <span>Tập trước</span>
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#121212] border border-[#1f1f1f] text-xs text-[#525252] cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Tập trước</span>
            </button>
          )}

          {nextEp ? (
            <Link
              href={`/xem-phim/${movieSlug}?ep=${nextEp.slug}&server=${currentServerIndex}`}
              className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#e50914] hover:bg-[#f40612] text-xs font-bold text-white transition-colors shadow-md shadow-[#e50914]/20 active:scale-95"
            >
              <span>Tập sau</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#121212] border border-[#1f1f1f] text-xs text-[#525252] cursor-not-allowed"
            >
              <span>Tập sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search, Sort & View Mode Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View Mode Toggle: Rail vs Grid */}
          <div className="flex items-center bg-[#181818] border border-[#2a2a2a] rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('rail')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'rail'
                  ? 'bg-[#e50914] text-white shadow-sm'
                  : 'text-[#a3a3a3] hover:text-white'
              }`}
              title="Xem dạng cuộn ngang (Netflix Rail)"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Thanh cuộn</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#e50914] text-white shadow-sm'
                  : 'text-[#a3a3a3] hover:text-white'
              }`}
              title="Xem dạng lưới thu gọn (Grid)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Lưới</span>
            </button>
          </div>

          {/* Toggle Sort Order Button */}
          {episodes.length > 5 && (
            <button
              type="button"
              onClick={() => setIsDescending(!isDescending)}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-[#181818] border border-[#2a2a2a] text-xs font-semibold text-[#a3a3a3] hover:text-white hover:bg-[#222] transition-colors flex items-center gap-1.5 shrink-0"
              title={
                isDescending
                  ? 'Đang sắp xếp: Mới nhất -> Cũ nhất'
                  : 'Đang sắp xếp: Tập 1 -> Mới nhất'
              }
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#e50914]" />
              <span className="hidden xs:inline text-[11px]">
                {isDescending ? 'Mới nhất' : 'Tập cũ'}
              </span>
            </button>
          )}

          {/* Episode Quick Filter */}
          {episodes.length > 10 && (
            <div className="relative w-full sm:w-44">
              <input
                type="text"
                placeholder="Tìm tập..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#181818] text-white text-xs pl-8 pr-3 py-2 rounded-xl border border-[#2a2a2a] min-h-[40px] focus:outline-none focus:border-[#e50914] transition-colors placeholder:text-[#737373]"
              />
              <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SERVER / NGUỒN PHÁT 1 CHẠM (PILL BO TRÒN NETFLIX STYLE)  */}
      {/* ============================================================ */}
      {servers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#e50914]" />
              Chọn nguồn phát (1 chạm)
            </span>
            <span className="text-[11px] text-[#737373]">
              {servers.length} máy chủ sẵn sàng
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {servers.map((srv, idx) => {
              const active = idx === currentServerIndex;
              const classification = formatServerClassification(srv.serverName, idx);
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
                  className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95 ${
                    active
                      ? 'bg-[#e50914] text-white shadow-lg shadow-[#e50914]/25 ring-2 ring-[#e50914] font-bold'
                      : 'bg-[#181818] border border-[#2a2a2a] text-[#d4d4d4] hover:text-white hover:bg-[#222] hover:border-zinc-700'
                  }`}
                  title={`Chuyển sang ${classification.displayName} (${classification.badgeLabel})`}
                >
                  {/* Status Indicator Dot */}
                  <span
                    className={`w-2 h-2 rounded-full ${
                      active
                        ? 'bg-white animate-pulse'
                        : classification.isVip
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />

                  <span>{classification.displayName}</span>

                  {/* Classification Pill Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      active
                        ? 'bg-black/30 text-white'
                        : classification.isVip
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {classification.badgeLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. CHUNK RANGE SELECTOR (Series with >50 Episodes)           */}
      {/* ============================================================ */}
      {numChunks > 1 && !searchFilter.trim() && (
        <div className="space-y-2 pt-1 border-t border-[#1a1a1a]">
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
              const endIdx = Math.min(
                (cIdx + 1) * CHUNK_SIZE - 1,
                episodes.length - 1
              );
              const firstEpName = episodes[startIdx]?.name || `${startIdx + 1}`;
              const lastEpName = episodes[endIdx]?.name || `${endIdx + 1}`;
              const active = cIdx === activeChunkIdx;

              return (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => setUserSelectedChunkIdx(cIdx)}
                  aria-pressed={active}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
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

      {/* ============================================================ */}
      {/* 4. NETFLIX EPISODE DRAWER & RAIL (Thanh cuộn tập phim ngang) */}
      {/* ============================================================ */}
      <div className="space-y-2.5 pt-1 border-t border-[#1a1a1a]">
        <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-[#e50914]" />
            Danh sách tập phim ({filteredEpisodes.length} tập)
          </span>
          {viewMode === 'rail' && filteredEpisodes.length > 3 && (
            <span className="text-[11px] text-[#737373] normal-case hidden sm:inline">
              Cuộn ngang để xem thêm tập
            </span>
          )}
        </div>

        {/* 4A. HORIZONTAL NETFLIX RAIL (Default) */}
        {viewMode === 'rail' ? (
          <div className="relative group/rail">
            {/* Left Scroll Navigation Button */}
            <button
              type="button"
              onClick={() => scrollRail('left')}
              className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 hover:bg-[#e50914] text-white border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-all hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-0"
              aria-label="Cuộn sang trái"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Right Scroll Navigation Button */}
            <button
              type="button"
              onClick={() => scrollRail('right')}
              className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 hover:bg-[#e50914] text-white border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-all hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-0"
              aria-label="Cuộn sang phải"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Horizontal Scrolling Rail */}
            <div
              ref={railContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
              className="flex gap-3 sm:gap-4 overflow-x-auto py-2.5 px-1 scroll-smooth no-scrollbar scrollbar-none select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {filteredEpisodes.map((ep) => {
                const isCurrent = ep.slug === currentEpisodeSlug;
                const status = episodeProgressMap.get(ep.slug);
                const isCompleted = Boolean(status?.completed);
                const inProgress = Boolean(
                  status && !status.completed && status.percent > 0
                );

                const labelText = ep.name
                  .trim()
                  .toLowerCase()
                  .startsWith('tập')
                  ? ep.name.trim()
                  : `Tập ${ep.name.trim()}`;

                return (
                  <Link
                    key={ep.slug}
                    ref={isCurrent ? activeCardRef : undefined}
                    href={`/xem-phim/${movieSlug}?ep=${ep.slug}&server=${currentServerIndex}`}
                    draggable={false}
                    onClick={(e) => {
                      if (hasDraggedRef.current || hasDragged) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    className={`
                      relative
                      group/card
                      shrink-0
                      w-[180px] xs:w-[200px] sm:w-[220px]
                      rounded-xl
                      overflow-hidden
                      transition-all
                      duration-200
                      cursor-pointer
                      focus-visible:outline-none
                      ${
                        isCurrent
                          ? 'border-2 border-[#e50914] ring-2 ring-[#e50914]/40 shadow-xl shadow-[#e50914]/25 scale-[1.02]'
                          : 'border border-[#262626] hover:border-[#e50914] hover:scale-[1.02] bg-[#141414]'
                      }
                    `}
                  >
                    {/* 16:9 Thumbnail Container */}
                    <div className="relative aspect-video w-full bg-[#181818] overflow-hidden">
                      <MovieImage
                        src={previewImage}
                        alt={`${movieTitle} - ${labelText}`}
                        aspectRatio="backdrop"
                        fill
                        className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                      />

                      {/* Cinematic Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                      {/* Top-Left Episode Pill Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md shadow-md ${
                            isCurrent
                              ? 'bg-[#e50914] text-white'
                              : 'bg-black/75 text-zinc-200 backdrop-blur-sm border border-white/10'
                          }`}
                        >
                          {labelText}
                        </span>
                      </div>

                      {/* Top-Right State Indicator (Playing / Completed) */}
                      {isCurrent ? (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-[#e50914] text-white px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-[#e50914]/40 animate-pulse">
                          <EqualizerIcon />
                          <span>Đang phát</span>
                        </div>
                      ) : isCompleted ? (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-emerald-600/90 text-white px-1.5 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-sm shadow">
                          <Check className="w-3 h-3" />
                          <span>Đã xem</span>
                        </div>
                      ) : null}

                      {/* Center Play Hover Icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-[#e50914]/90 text-white flex items-center justify-center shadow-lg transform group-hover/card:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Bottom Info Bar inside Card */}
                      <div className="absolute bottom-2 left-2 right-2 z-10">
                        <p className="text-xs font-semibold text-white truncate drop-shadow">
                          {labelText}
                        </p>
                      </div>

                      {/* Red Progress Bar for watched / in-progress episodes */}
                      {inProgress && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 overflow-hidden z-20"
                          role="progressbar"
                          aria-valuenow={status?.percent ?? 0}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Đã xem ${status?.percent ?? 0}%`}
                        >
                          <div
                            className="h-full bg-[#e50914] transition-all duration-300"
                            style={{ width: `${status?.percent ?? 0}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          /* 4B. COMPACT GRID VIEW (For rapid multi-episode selection) */
          <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2 max-h-72 sm:max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {filteredEpisodes.map((ep) => {
              const isCurrent = ep.slug === currentEpisodeSlug;
              const status = episodeProgressMap.get(ep.slug);
              const isCompleted = Boolean(status?.completed);
              const inProgress = Boolean(
                status && !status.completed && status.percent > 0
              );

              const labelText = ep.name
                .trim()
                .toLowerCase()
                .startsWith('tập')
                ? ep.name.trim()
                : `Tập ${ep.name.trim()}`;

              return (
                <Link
                  key={ep.slug}
                  href={`/xem-phim/${movieSlug}?ep=${ep.slug}&server=${currentServerIndex}`}
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
                    <EqualizerIcon className="mr-0.5 shrink-0" />
                  ) : isCompleted ? (
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : null}

                  <span className="truncate">{labelText}</span>

                  {inProgress && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={status?.percent ?? 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full bg-[#e50914] transition-[width] duration-300"
                        style={{ width: `${status?.percent ?? 0}%` }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
