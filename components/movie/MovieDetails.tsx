'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Star,
  Share2,
  Calendar,
  Clock,
  Film,
  Tv,
  ChevronDown,
  Check,
  Plus,
  ThumbsUp,
  Server,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  Info,
  Globe,
  Tag,
} from 'lucide-react';
import type { EnrichedMovieDetailModel } from '@/types/tmdb';
import type { MovieCardModel } from '@/types/movie';
import { useWatchlist, toggleWatchlist } from '@/lib/utils/favorites';
import { usePlaybackProgress, resolveResumeTarget } from '@/lib/persistence/progress';
import { toast } from '@/lib/utils/toast';
import MovieImage from '@/components/ui/MovieImage';
import CastList from '@/components/movie/CastList';
import MovieCard from '@/components/movie/MovieCard';

interface MovieDetailsProps {
  movie: EnrichedMovieDetailModel;
  relatedMovies?: MovieCardModel[];
}

type TabType = 'episodes' | 'similar' | 'details';

export default function MovieDetails({ movie, relatedMovies = [] }: MovieDetailsProps) {
  const { isSaved, isMounted } = useWatchlist();
  const saved = isMounted && isSaved(movie.slug);
  const { progressList } = usePlaybackProgress();
  const presentation = movie.tmdbPresentation;
  const displayTitle = presentation?.title || movie.title;
  const displayOriginalTitle = presentation?.originalTitle || movie.originalTitle;
  const displayOverview = presentation?.overview || movie.synopsis;
  const displayPoster = presentation?.posterUrl || movie.posterUrl;
  const displayBackdrop = presentation?.backdropUrl || movie.thumbUrl || movie.posterUrl;
  const displayYear = presentation?.year || movie.year;
  const displayRuntime = presentation?.runtimeMinutes ? `${presentation.runtimeMinutes} phút` : movie.duration;
  const displayRating = presentation?.voteAverage ?? movie.rating;

  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [activeChunkIdx, setActiveChunkIdx] = useState(0);
  const [episodeViewMode, setEpisodeViewMode] = useState<'list' | 'grid'>('list');
  const [showStickyCta, setShowStickyCta] = useState(false);

  const hasMultipleEpisodes = Boolean(
    movie.episodes &&
      movie.episodes.length > 0 &&
      (movie.episodes.some((s) => s.items.length > 1) || movie.type === 'series' || movie.type === 'hoathinh' || movie.type === 'tvshows')
  );

  // Default active tab
  const [activeTab, setActiveTab] = useState<TabType>(hasMultipleEpisodes ? 'episodes' : 'similar');

  // Compute Smart Resume target
  const smartCTA = useMemo(() => {
    return resolveResumeTarget({
      movieSlug: movie.slug,
      movieType: movie.type,
      episodes: movie.episodes || [],
      progressRecords: progressList,
    });
  }, [movie.slug, movie.type, movie.episodes, progressList]);

  // Compute Episode Watch States map
  const episodeProgressMap = useMemo(() => {
    const map = new Map<string, { percent: number; completed: boolean }>();
    progressList
      .filter((p) => p.movieSlug === movie.slug)
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
  }, [progressList, movie.slug]);

  // Monitor scroll for mobile sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 340) {
        setShowStickyCta(true);
      } else {
        setShowStickyCta(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Đã sao chép liên kết chia sẻ!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    toast.success(!liked ? 'Đã thêm vào danh sách yêu thích!' : 'Đã bỏ thích');
  };

  // Filter valid actors & directors for fallback
  const validActors = (movie.actors || []).filter(
    (a) => a && a !== 'N/A' && a !== 'Đang cập nhật' && a !== 'undefined' && a.trim().length > 0
  );
  const validDirectors = (movie.directors || []).filter(
    (d) => d && d !== 'N/A' && d !== 'Đang cập nhật' && d !== 'undefined' && d.trim().length > 0
  );

  // Deduplicate categories and countries
  const uniqueCategories = useMemo(() => {
    if (!movie.categories || movie.categories.length === 0) return [];
    const seen = new Set<string>();
    return movie.categories.filter((cat) => {
      const key = cat.slug || cat.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [movie.categories]);

  const uniqueCountries = useMemo(() => {
    if (!movie.countries || movie.countries.length === 0) return [];
    const seen = new Set<string>();
    return movie.countries.filter((c) => {
      const key = c.slug || c.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [movie.countries]);

  const activeServer = movie.episodes[activeServerIdx] || movie.episodes[0];
  const activeEpisodes = activeServer?.items || [];

  // Episode Range Chunks (for 50+ episodes)
  const CHUNK_SIZE = 50;
  const numChunks = Math.ceil(activeEpisodes.length / CHUNK_SIZE);
  const currentChunkEpisodes = activeEpisodes.slice(
    activeChunkIdx * CHUNK_SIZE,
    (activeChunkIdx + 1) * CHUNK_SIZE
  );

  const longSynopsis = (displayOverview || '').length > 200;

  return (
    <div className="relative text-white min-h-screen pb-24 bg-[#141414]">
      {/* ============================================================ */}
      {/* 1. MOBILE HERO & ACTION REGION (< md) - Netflix Mobile Style */}
      {/* ============================================================ */}
      <div className="md:hidden">
        {/* Top 16:9 Backdrop with Gradient & Fast Play Overlay */}
        <div className="relative w-full aspect-video max-h-[320px] bg-black overflow-hidden select-none">
          <MovieImage
            src={displayBackdrop}
            alt={displayTitle}
            title={displayTitle}
            priority
            sizes="100vw"
            aspectRatio="backdrop"
            className="w-full h-full object-cover object-center opacity-85"
          />

          {/* Scrim Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent pointer-events-none" />

          {/* Quick Play Center Button */}
          <Link
            href={`/xem-phim/${movie.slug}?ep=${smartCTA.episodeSlug}&server=${smartCTA.serverIndex}`}
            className="absolute inset-0 flex items-center justify-center group"
            aria-label="Phát phim"
          >
            <div className="w-14 h-14 rounded-full bg-black/60 border border-white/30 text-white flex items-center justify-center backdrop-blur-md shadow-2xl transform group-active:scale-90 transition-transform">
              <Play className="w-6 h-6 fill-current ml-1 text-white" />
            </div>
          </Link>

          {/* Quality & Episode Current Floating Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none z-10">
            {movie.quality && (
              <span className="bg-[#e50914] text-white text-[10px] font-black px-2 py-0.5 rounded shadow-md uppercase">
                {movie.quality}
              </span>
            )}
            {movie.episodeCurrent && (
              <span className="bg-black/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded border border-white/10 shadow-md">
                {movie.episodeCurrent}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Info & Netflix 3-Column Action Container */}
        <div className="px-4 pt-3 pb-3 space-y-3">
          {/* Title Header */}
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-snug">
              {displayTitle}
            </h1>
            {displayOriginalTitle && (
              <p className="text-xs text-[#a3a3a3] font-medium mt-0.5 line-clamp-1">
                {displayOriginalTitle}
              </p>
            )}
          </div>

          {/* Netflix Dot-Separated Metadata Line */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#d4d4d4] font-medium">
            {displayYear && <span className="font-semibold text-white">{displayYear}</span>}
            {displayRating && displayRating > 0 && (
              <>
                <span className="text-white/40">•</span>
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  {displayRating.toFixed(1)}
                </span>
              </>
            )}
            {displayRuntime && (
              <>
                <span className="text-white/40">•</span>
                <span>{displayRuntime}</span>
              </>
            )}
            {movie.language && (
              <>
                <span className="text-white/40">•</span>
                <span className="bg-zinc-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10 uppercase">
                  {movie.language}
                </span>
              </>
            )}
          </div>

          {/* Big Netflix White Play Button */}
          <Link
            href={`/xem-phim/${movie.slug}?ep=${smartCTA.episodeSlug}&server=${smartCTA.serverIndex}`}
            className="w-full py-3 px-4 bg-white hover:bg-white/90 text-black font-extrabold text-sm rounded-md flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
            <span>{smartCTA.label}</span>
          </Link>

          {/* Synopsis (Overview) */}
          <div className="pt-1 text-xs text-[#d4d4d4] leading-relaxed">
            <p className={!synopsisExpanded && longSynopsis ? 'line-clamp-3' : ''}>
              {displayOverview || 'Nội dung phim đang được cập nhật.'}
            </p>
            {longSynopsis && (
              <button
                type="button"
                onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                className="mt-1 text-xs font-bold text-white hover:underline cursor-pointer"
              >
                {synopsisExpanded ? 'Ẩn bớt' : 'Xem thêm'}
              </button>
            )}
          </div>

          {/* Netflix 4-Icon Minimal Action Cluster */}
          <div className="flex items-center justify-around py-3 border-y border-white/10 text-white/90">
            {/* 1. My List */}
            <button
              type="button"
              onClick={() => toggleWatchlist(movie)}
              className="flex flex-col items-center gap-1 hover:text-white transition-transform active:scale-90 cursor-pointer min-w-[56px]"
              aria-label={saved ? 'Đã lưu' : 'Thêm vào danh sách'}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {saved ? <Check className="w-5 h-5 text-[#e50914]" /> : <Plus className="w-5 h-5" />}
              </div>
              <span className="text-[11px] font-medium">{saved ? 'Đã lưu' : 'Danh sách'}</span>
            </button>

            {/* 2. Rate / Like */}
            <button
              type="button"
              onClick={handleLike}
              className="flex flex-col items-center gap-1 hover:text-white transition-transform active:scale-90 cursor-pointer min-w-[56px]"
              aria-label="Thích phim này"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <ThumbsUp className={`w-5 h-5 ${liked ? 'text-[#e50914] fill-current' : ''}`} />
              </div>
              <span className="text-[11px] font-medium">{liked ? 'Đã thích' : 'Thích'}</span>
            </button>

            {/* 3. Share */}
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-col items-center gap-1 hover:text-white transition-transform active:scale-90 cursor-pointer min-w-[56px]"
              aria-label="Chia sẻ phim"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium">{copied ? 'Đã chép' : 'Chia sẻ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. DESKTOP HERO REGION (>= md) - Cinematic Billboard */}
      {/* ============================================================ */}
      <div className="hidden md:block">
        {/* Cinematic Backdrop Hero */}
        <div className="relative w-full h-[55vh] lg:h-[65vh] min-h-[440px] max-h-[720px] bg-[#141414] overflow-hidden select-none">
          <MovieImage
            src={displayBackdrop}
            alt={displayTitle}
            title={displayTitle}
            priority
            sizes="100vw"
            aspectRatio="backdrop"
            className="w-full h-full object-cover object-center scale-105 opacity-75 transition-transform duration-700"
          />

          {/* Multi-layer Netflix Scrim Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 via-40% to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/70 via-30% to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#141414]/90 to-transparent pointer-events-none" />
        </div>

        {/* Content Overlay Grid */}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 -mt-56 sm:-mt-68 md:-mt-80 lg:-mt-88 z-20">
          <div className="flex flex-row gap-8 lg:gap-10 items-start">
            {/* Left: Poster */}
            <div className="w-60 lg:w-72 shrink-0">
              <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#181818] border border-white/10 shadow-2xl">
                <MovieImage
                  src={displayPoster}
                  alt={displayTitle}
                  title={displayTitle}
                  priority
                  sizes="(max-width: 1024px) 240px, 288px"
                  aspectRatio="poster"
                  className="w-full h-full object-cover"
                />

                {movie.quality && (
                  <span className="absolute top-3 left-3 bg-[#e50914] text-white text-xs font-black px-2.5 py-1 rounded shadow-md tracking-wider uppercase">
                    {movie.quality}
                  </span>
                )}
                {movie.episodeCurrent && (
                  <span className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded border border-white/10 shadow-md">
                    {movie.episodeCurrent}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Title, Badges, Big White Play CTA, Description */}
            <div className="flex-1 space-y-4 pt-4">
              <div>
                <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tight leading-[1.12] drop-shadow-md">
                  {displayTitle}
                </h1>
                {displayOriginalTitle && (
                  <p className="text-base lg:text-lg text-[#a3a3a3] font-medium mt-1">
                    {displayOriginalTitle}
                  </p>
                )}
              </div>

              {/* Metadata Badges Row */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#e5e5e5]">
                {displayRating && displayRating > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-3 py-1 rounded-md">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{displayRating.toFixed(1)} / 10</span>
                  </div>
                )}
                {displayYear && (
                  <div className="flex items-center gap-1.5 bg-zinc-800/80 border border-white/10 px-3 py-1 rounded-md font-semibold">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>{displayYear}</span>
                  </div>
                )}
                {displayRuntime && (
                  <div className="flex items-center gap-1.5 bg-zinc-800/80 border border-white/10 px-3 py-1 rounded-md font-semibold">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span>{displayRuntime}</span>
                  </div>
                )}
                {movie.language && (
                  <span className="bg-[#242424] border border-white/10 text-white font-bold px-2.5 py-1 rounded-md text-xs uppercase">
                    {movie.language}
                  </span>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* 1. Big White Play CTA */}
                <Link
                  href={`/xem-phim/${movie.slug}?ep=${smartCTA.episodeSlug}&server=${smartCTA.serverIndex}`}
                  className="px-8 py-3.5 bg-white hover:bg-white/85 text-black font-extrabold text-base rounded-lg flex items-center gap-2.5 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>{smartCTA.label}</span>
                </Link>

                {/* 2. Watchlist Toggle Button */}
                <button
                  type="button"
                  onClick={() => toggleWatchlist(movie)}
                  className={`px-5 py-3.5 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    saved
                      ? 'bg-[#e50914] border-[#e50914] text-white shadow-lg shadow-[#e50914]/30'
                      : 'bg-zinc-800/80 hover:bg-zinc-700 border-white/10 text-white'
                  }`}
                >
                  {saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{saved ? 'Đã lưu danh sách' : 'Danh sách của tôi'}</span>
                </button>

                {/* 3. Share Button */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-3.5 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                  title="Chia sẻ liên kết"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Overview */}
              <div className="pt-2">
                <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
                  {displayOverview || 'Nội dung phim đang được cập nhật.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. NETFLIX 3-TABS NAVIGATION BAR                            */}
      {/* ============================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-start border-b border-white/15 gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
          {/* Tab 1: Episodes (If TV Series / Multi-episodes) */}
          {hasMultipleEpisodes && (
            <button
              type="button"
              onClick={() => setActiveTab('episodes')}
              className={`pb-3.5 text-xs sm:text-sm font-black tracking-wider uppercase transition-colors relative cursor-pointer whitespace-nowrap ${
                activeTab === 'episodes' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>TẬP PHIM</span>
              {activeTab === 'episodes' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e50914] rounded-t-sm" />
              )}
            </button>
          )}

          {/* Tab 2: Similar Movies */}
          <button
            type="button"
            onClick={() => setActiveTab('similar')}
            className={`pb-3.5 text-xs sm:text-sm font-black tracking-wider uppercase transition-colors relative cursor-pointer whitespace-nowrap ${
              activeTab === 'similar' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>NỘI DUNG TƯƠNG TỰ</span>
            {activeTab === 'similar' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e50914] rounded-t-sm" />
            )}
          </button>

          {/* Tab 3: Trailer & Details */}
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-3.5 text-xs sm:text-sm font-black tracking-wider uppercase transition-colors relative cursor-pointer whitespace-nowrap ${
              activeTab === 'details' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>TRAILER & CHI TIẾT</span>
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e50914] rounded-t-sm" />
            )}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. NETFLIX TAB CONTENTS                                      */}
      {/* ============================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ================= TAB 1: TẬP PHIM ================= */}
        {activeTab === 'episodes' && hasMultipleEpisodes && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Season/Server Selector & Layout Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181818] p-3 sm:p-4 rounded-xl border border-white/10">
              {/* Server / Season Dropdown / Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-xs text-zinc-400 font-semibold uppercase shrink-0 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#e50914]" /> Nguồn phát:
                </span>
                {movie.episodes.map((srv, idx) => (
                  <button
                    key={srv.serverName || idx}
                    onClick={() => {
                      setActiveServerIdx(idx);
                      setActiveChunkIdx(0);
                    }}
                    type="button"
                    className={`px-3 py-1 rounded-md text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      activeServerIdx === idx
                        ? 'bg-white text-black shadow-md'
                        : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                    }`}
                  >
                    {srv.serverName || `Server ${idx + 1}`}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle (Cards vs Grid) */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setEpisodeViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${
                    episodeViewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Xem dạng thẻ chi tiết (Netflix Cards)"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEpisodeViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${
                    episodeViewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Xem dạng lưới số tập (Grid)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chunk Pagination for 50+ episodes */}
            {numChunks > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-xs text-zinc-400 font-medium shrink-0 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#e50914]" /> Danh sách tập:
                </span>
                {Array.from({ length: numChunks }).map((_, cIdx) => {
                  const start = cIdx * CHUNK_SIZE + 1;
                  const end = Math.min((cIdx + 1) * CHUNK_SIZE, activeEpisodes.length);
                  return (
                    <button
                      key={cIdx}
                      onClick={() => setActiveChunkIdx(cIdx)}
                      type="button"
                      className={`px-3 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                        activeChunkIdx === cIdx
                          ? 'bg-[#e50914] text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {start} - {end}
                    </button>
                  );
                })}
              </div>
            )}

            {/* View Mode 1: Netflix Horizontal Episode Cards */}
            {episodeViewMode === 'list' ? (
              <div className="space-y-3">
                {currentChunkEpisodes.map((ep, index) => {
                  const epState = episodeProgressMap.get(ep.slug);
                  const isSmartTarget = smartCTA.episodeSlug === ep.slug;
                  const absoluteEpisodeIndex = activeChunkIdx * CHUNK_SIZE + index + 1;

                  return (
                    <Link
                      key={ep.slug}
                      href={`/xem-phim/${movie.slug}?ep=${ep.slug}&server=${activeServerIdx}`}
                      className={`group flex items-start sm:items-center gap-3 sm:gap-4 p-2.5 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSmartTarget
                          ? 'bg-[#202020] border-[#e50914]/60 shadow-lg'
                          : 'bg-[#181818] hover:bg-[#222222] border-white/5 hover:border-white/20'
                      }`}
                    >
                      {/* Left: Episode 16:9 Thumbnail with Overlay Play & Progress Bar */}
                      <div className="relative w-28 xs:w-32 sm:w-44 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                        <MovieImage
                          src={displayBackdrop}
                          alt={ep.name}
                          title={ep.name}
                          aspectRatio="backdrop"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Center Play Icon Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-black/70 border border-white/30 text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Red Progress Bar */}
                        {epState && epState.percent > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 overflow-hidden">
                            <div
                              className="h-full bg-[#e50914]"
                              style={{ width: `${epState.percent}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Right: Episode Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-[#e50914] transition-colors truncate">
                            {ep.name.startsWith('Tập') ? ep.name : `Tập ${absoluteEpisodeIndex}: ${ep.name}`}
                          </h3>
                          {displayRuntime && (
                            <span className="text-xs text-zinc-400 shrink-0 font-medium">
                              {displayRuntime}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {displayOverview || 'Xem tập phim với chất lượng cao và tốc độ tải mượt mà.'}
                        </p>

                        {isSmartTarget && (
                          <span className="inline-block text-[11px] font-bold text-[#e50914] pt-0.5">
                            ▶ Đang theo dõi / Tiếp tục phát
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* View Mode 2: Compact Episode Grid */
              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-2.5">
                {currentChunkEpisodes.map((ep) => {
                  const epState = episodeProgressMap.get(ep.slug);
                  const isSmartTarget = smartCTA.episodeSlug === ep.slug;

                  return (
                    <Link
                      key={ep.slug}
                      href={`/xem-phim/${movie.slug}?ep=${ep.slug}&server=${activeServerIdx}`}
                      className={`relative group flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all overflow-hidden cursor-pointer ${
                        isSmartTarget
                          ? 'bg-white text-black font-extrabold border-white shadow-lg scale-105'
                          : 'bg-[#181818] hover:bg-[#222222] text-[#e5e5e5] hover:text-white border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-semibold truncate w-full">
                        {ep.name || ep.slug}
                      </span>

                      {epState && epState.percent > 0 && !isSmartTarget && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 overflow-hidden">
                          <div
                            className="h-full bg-[#e50914]"
                            style={{ width: `${epState.percent}%` }}
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: NỘI DUNG TƯƠNG TỰ ================= */}
        {activeTab === 'similar' && (
          <div className="animate-in fade-in duration-300">
            {relatedMovies.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-4">
                {relatedMovies.map((relMovie) => (
                  <MovieCard key={relMovie.slug} movie={relMovie} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400 text-sm">
                Đang cập nhật các tựa phim tương tự.
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: TRAILER & CHI TIẾT ================= */}
        {activeTab === 'details' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Inline YouTube Trailer Player */}
            {presentation?.trailer && presentation.trailer.site.toLowerCase() === 'youtube' && (
              <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Film className="w-4 h-4 text-[#e50914]" />
                  <span>Đoạn giới thiệu (Trailer chính thức)</span>
                </div>
                <div className="relative aspect-video w-full max-w-4xl rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${presentation.trailer.key}?rel=0`}
                    title={`Trailer ${displayTitle}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}

            {/* Detailed Movie Information Card */}
            <div className="bg-[#181818] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-[#e50914]" />
                <span>Thông tin chi tiết</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                {/* Left Specs */}
                <div className="space-y-3.5">
                  <div className="flex items-start gap-2">
                    <span className="w-28 text-zinc-400 font-medium shrink-0">Tên chính thức:</span>
                    <span className="text-white font-semibold">{displayTitle}</span>
                  </div>

                  {displayOriginalTitle && (
                    <div className="flex items-start gap-2">
                      <span className="w-28 text-zinc-400 font-medium shrink-0">Tên gốc:</span>
                      <span className="text-zinc-300">{displayOriginalTitle}</span>
                    </div>
                  )}

                  {displayYear && (
                    <div className="flex items-center gap-2">
                      <span className="w-28 text-zinc-400 font-medium shrink-0">Năm sản xuất:</span>
                      <span className="text-white">{displayYear}</span>
                    </div>
                  )}

                  {displayRuntime && (
                    <div className="flex items-center gap-2">
                      <span className="w-28 text-zinc-400 font-medium shrink-0">Thời lượng:</span>
                      <span className="text-white">{displayRuntime}</span>
                    </div>
                  )}

                  {movie.quality && (
                    <div className="flex items-center gap-2">
                      <span className="w-28 text-zinc-400 font-medium shrink-0">Chất lượng:</span>
                      <span className="bg-[#e50914] text-white text-xs font-bold px-2 py-0.5 rounded">
                        {movie.quality}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Specs */}
                <div className="space-y-3.5">
                  {uniqueCategories.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="w-24 text-zinc-400 font-medium shrink-0">Thể loại:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueCategories.map((cat) => (
                          <Link
                            key={cat.slug}
                            href={`/the-loai/${cat.slug}`}
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-0.5 rounded transition-colors"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {uniqueCountries.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="w-24 text-zinc-400 font-medium shrink-0">Quốc gia:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueCountries.map((c) => (
                          <Link
                            key={c.slug}
                            href={`/quoc-gia/${c.slug}`}
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-0.5 rounded transition-colors"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {displayRating && displayRating > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-zinc-400 font-medium shrink-0">Đánh giá:</span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {displayRating.toFixed(1)} / 10
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cast & Crew Component */}
            <CastList
              tmdbCast={presentation?.cast}
              directors={presentation?.directors?.length ? presentation.directors : validDirectors}
              creators={presentation?.creators}
              fallbackActors={validActors}
            />
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. MOBILE STICKY BOTTOM PLAY BAR (Trượt lên khi cuộn)        */}
      {/* ============================================================ */}
      {showStickyCta && (
        <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 bg-[#141414]/95 backdrop-blur-lg border-t border-[#262626] p-3 px-4 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-300 shadow-2xl">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{displayTitle}</p>
            {smartCTA.subLabel && (
              <p className="text-[10px] text-zinc-400 truncate">{smartCTA.subLabel}</p>
            )}
          </div>
          <Link
            href={`/xem-phim/${movie.slug}?ep=${smartCTA.episodeSlug}&server=${smartCTA.serverIndex}`}
            className="px-5 py-2.5 bg-white text-black font-extrabold text-xs rounded-md flex items-center gap-1.5 shrink-0 shadow-lg active:scale-95"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Phát</span>
          </Link>
        </div>
      )}
    </div>
  );
}
