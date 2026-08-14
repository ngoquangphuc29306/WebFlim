'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Star,
  Bookmark,
  Share2,
  Calendar,
  Clock,
  Eye,
  Film,
  Tv,
  ChevronDown,
  ChevronUp,
  Server,
  Layers,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import type { EnrichedMovieDetailModel } from '@/types/tmdb';
import { useWatchlist, toggleWatchlist } from '@/lib/utils/favorites';
import { usePlaybackProgress, resolveResumeTarget } from '@/lib/persistence/progress';
import { toast } from '@/lib/utils/toast';
import MovieImage from '@/components/ui/MovieImage';
import CastList from '@/components/movie/CastList';

interface MovieDetailsProps {
  movie: EnrichedMovieDetailModel;
}

export default function MovieDetails({ movie }: MovieDetailsProps) {
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
  const displayVoteCount = presentation?.voteCount ?? movie.voteCount;

  const [copied, setCopied] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [activeChunkIdx, setActiveChunkIdx] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [trailerModalOpen, setTrailerModalOpen] = useState(false);

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

  // Keyboard handler for trailer modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setTrailerModalOpen(false);
    }
  }, []);

  useEffect(() => {
    if (trailerModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [trailerModalOpen, handleKeyDown]);

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Đã sao chép liên kết chia sẻ!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter valid actors & directors for fallback
  const validActors = (movie.actors || []).filter(
    (a) => a && a !== 'N/A' && a !== 'Đang cập nhật' && a !== 'undefined' && a.trim().length > 0
  );
  const validDirectors = (movie.directors || []).filter(
    (d) => d && d !== 'N/A' && d !== 'Đang cập nhật' && d !== 'undefined' && d.trim().length > 0
  );

  // Deduplicate categories and countries to prevent duplicate key errors
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

  const totalEpisodes = movie.episodes.reduce((acc, srv) => acc + srv.items.length, 0);
  const activeServer = movie.episodes[activeServerIdx] || movie.episodes[0];
  const activeEpisodes = activeServer?.items || [];

  // Episode Range Chunks (for 50+ episodes)
  const CHUNK_SIZE = 50;
  const numChunks = Math.ceil(activeEpisodes.length / CHUNK_SIZE);
  const currentChunkEpisodes = activeEpisodes.slice(
    activeChunkIdx * CHUNK_SIZE,
    (activeChunkIdx + 1) * CHUNK_SIZE
  );

  const longSynopsis = (displayOverview || '').length > 240;

  return (
    <div className="relative text-white min-h-screen pb-16">
      {/* 1. Cinematic Backdrop Hero Region */}
      <div className="relative w-full h-[48vh] sm:h-[58vh] lg:h-[68vh] min-h-[380px] max-h-[700px] bg-[#080808] overflow-hidden select-none">
        <MovieImage
          src={displayBackdrop}
          alt={displayTitle}
          title={displayTitle}
          priority
          sizes="100vw"
          aspectRatio="backdrop"
          className="w-full h-full object-cover object-center scale-105"
        />

        {/* Sophisticated Multi-Layer Scrim for Flawless Text Readability */}
        <div className="absolute inset-0 bg-[#080808]/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/75 via-45% to-transparent pointer-events-none" />
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/80 via-35% to-transparent pointer-events-none" />
      </div>

      {/* 2. Main Content Grid Overlay */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-44 sm:-mt-60 md:-mt-72 lg:-mt-80 z-20">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 items-start">

          {/* Left Column: Poster & Action Buttons */}
          <div className="w-full sm:w-64 md:w-64 lg:w-72 shrink-0 flex flex-col items-center md:items-stretch">
            {/* Poster Card */}
            <div className="relative aspect-[2/3] w-48 xs:w-56 sm:w-full rounded-xl sm:rounded-2xl overflow-hidden bg-[#121212] border-2 border-[#242424] shadow-2xl">
              <MovieImage
                src={displayPoster}
                alt={displayTitle}
                title={displayTitle}
                priority
                sizes="(max-width: 640px) 224px, (max-width: 768px) 256px, 288px"
                aspectRatio="poster"
                className="w-full h-full object-cover"
              />

              {/* Quality Badge on Poster */}
              {movie.quality && (
                <span className="absolute top-3 left-3 bg-[#181818]/90 backdrop-blur-sm border border-[#2a2a2a] text-[#f5f5f5] text-xs font-bold px-2.5 py-1 rounded-lg shadow-md">
                  {movie.quality}
                </span>
              )}

              {/* Episode count badge */}
              {movie.episodeCurrent && (
                <span className="absolute top-3 right-3 bg-[#080808]/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#262626] shadow-md">
                  {movie.episodeCurrent}
                </span>
              )}
            </div>

            {/* Actions Stack */}
            <div className="mt-4 w-full flex flex-col gap-2.5 max-w-xs sm:max-w-none">
              {/* Primary Play / Resume CTA */}
              <Link
                href={`/xem-phim/${movie.slug}?ep=${smartCTA.episodeSlug}&server=${smartCTA.serverIndex}`}
                className="w-full flex flex-col items-center justify-center gap-0.5 bg-[#e50914] hover:bg-[#b80710] text-white font-bold py-3.5 px-5 rounded-xl shadow-lg shadow-[#e50914]/25 transition-all hover:scale-[1.01] active:scale-[0.98] text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span className="text-sm sm:text-base">{smartCTA.label}</span>
                </div>
                {smartCTA.subLabel && (
                  <span className="text-[11px] font-medium text-white/80">{smartCTA.subLabel}</span>
                )}
              </Link>

              {/* Secondary Buttons Row */}
              <div className="grid grid-cols-2 gap-2">
                {/* Watchlist Toggle */}
                <button
                  onClick={() => toggleWatchlist(movie)}
                  type="button"
                  aria-pressed={saved}
                  className={`min-h-[42px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                    saved
                      ? 'bg-[#e50914] border-[#e50914] text-white'
                      : 'bg-[#141414] border-[#262626] text-[#d4d4d4] hover:text-white hover:bg-[#1f1f1f] hover:border-[#333333]'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  <span>{saved ? 'Đã lưu' : 'Yêu thích'}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  type="button"
                  className="min-h-[42px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#141414] border border-[#262626] text-[#d4d4d4] hover:text-white hover:bg-[#1f1f1f] hover:border-[#333333] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copied ? 'Đã chép!' : 'Chia sẻ'}</span>
                </button>
              </div>

              {/* Trailer Action (Modal Trigger or Direct Link) */}
              {presentation?.trailer && (
                <button
                  type="button"
                  onClick={() => setTrailerModalOpen(true)}
                  className="min-h-[42px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#141414] border border-[#262626] text-[#d4d4d4] hover:text-white hover:border-[#e50914] hover:bg-[#1a1a1a] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                >
                  <Film className="w-4 h-4 text-[#e50914]" />
                  <span>Xem trailer</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Title, Metadata, Overview, Cast, Episodes */}
          <div className="flex-1 space-y-6 pt-1 w-full min-w-0">
            {/* Title Header */}
            <div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#f5f5f5] tracking-tight leading-[1.15]">
                {displayTitle}
              </h1>
              {displayOriginalTitle && (
                <p className="text-sm sm:text-base md:text-lg text-[#a3a3a3] font-normal mt-1.5 leading-snug">
                  {displayOriginalTitle}
                </p>
              )}
            </div>

            {/* Scannable Metadata Tags Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-[#d4d4d4]">
              {/* Rating */}
              {displayRating && displayRating > 0 ? (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-3 py-1.5 rounded-lg shadow-sm">
                  <Star className="w-4 h-4 fill-current" />
                  <span>
                    {displayRating.toFixed(1)} / 10
                    {presentation?.ratingSource === 'tmdb' ? ' · TMDB' : ''}
                  </span>
                  {displayVoteCount ? (
                    <span className="text-[11px] text-[#a3a3a3] font-normal hidden sm:inline">
                      ({displayVoteCount} vote)
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* Release Year */}
              {displayYear && (
                <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1.5 rounded-lg font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#737373]" />
                  <span>{displayYear}</span>
                </div>
              )}

              {/* Runtime */}
              {displayRuntime && (
                <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1.5 rounded-lg font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#737373]" />
                  <span>{displayRuntime}</span>
                </div>
              )}

              {/* Views */}
              {movie.views !== undefined && movie.views > 0 && (
                <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1.5 rounded-lg font-medium">
                  <Eye className="w-3.5 h-3.5 text-[#737373]" />
                  <span>{movie.views.toLocaleString()} lượt xem</span>
                </div>
              )}

              {/* Language */}
              {movie.language && (
                <div className="bg-[#181818] border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#e50914] uppercase">
                  {movie.language}
                </div>
              )}

              {/* TMDB Enriched Badge */}
              {movie.enrichment?.tmdbAvailable && (
                <div className="flex items-center gap-1 bg-[#121212] border border-[#262626] px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#737373]">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Enriched</span>
                </div>
              )}
            </div>

            {/* Categories & Countries */}
            <div className="space-y-2.5">
              {uniqueCategories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#737373] font-bold uppercase tracking-wider">
                    Thể loại:
                  </span>
                  {uniqueCategories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/the-loai/${cat.slug}`}
                      className="text-xs bg-[#161616] border border-[#262626] hover:border-[#e50914] text-[#d4d4d4] hover:text-white px-3 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}

              {uniqueCountries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#737373] font-bold uppercase tracking-wider">
                    Quốc gia:
                  </span>
                  {uniqueCountries.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/quoc-gia/${c.slug}`}
                      className="text-xs bg-[#161616] border border-[#262626] hover:border-[#e50914] text-[#d4d4d4] hover:text-white px-3 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Overview / Synopsis Section */}
            <section className="bg-[#101010] border border-[#1f1f1f] p-4 sm:p-6 rounded-2xl space-y-3">
              <h2 className="text-xs sm:text-sm font-bold text-[#f5f5f5] uppercase tracking-wider flex items-center gap-2">
                <Film className="w-4 h-4 text-[#e50914]" />
                <span>Nội dung phim</span>
              </h2>
              <div className="relative">
                <p
                  className={`text-xs sm:text-sm text-[#d4d4d4] leading-relaxed max-w-4xl whitespace-pre-line ${
                    !synopsisExpanded && longSynopsis ? 'line-clamp-4' : ''
                  }`}
                >
                  {displayOverview || 'Nội dung phim đang được cập nhật.'}
                </p>
                {longSynopsis && (
                  <button
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    type="button"
                    className="mt-2 text-xs font-semibold text-[#e50914] hover:text-[#f40612] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded"
                  >
                    <span>{synopsisExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                    {synopsisExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </section>

            {/* Cast & Crew Section */}
            <CastList
              tmdbCast={presentation?.cast}
              directors={presentation?.directors?.length ? presentation.directors : validDirectors}
              creators={presentation?.creators}
              fallbackActors={validActors}
            />

            {/* TV Season Metadata (if available from TMDB) */}
            {presentation?.season && (
              <section className="bg-[#101010] border border-[#1f1f1f] p-4 sm:p-6 rounded-2xl space-y-2">
                <h3 className="text-xs sm:text-sm font-bold text-[#737373] uppercase tracking-wider">
                  Thông tin mùa phim
                </h3>
                <p className="text-sm sm:text-base font-bold text-white">
                  {presentation.season.name} · Phần {presentation.season.seasonNumber}
                </p>
                {presentation.season.overview && (
                  <p className="text-xs sm:text-sm text-[#a3a3a3] leading-relaxed">
                    {presentation.season.overview}
                  </p>
                )}
              </section>
            )}

            {/* Episode List & Server Selector */}
            {movie.episodes && movie.episodes.length > 0 && (
              <section className="bg-[#101010] border border-[#1f1f1f] p-4 sm:p-6 rounded-2xl space-y-4 sm:space-y-5">
                {/* Header & Server Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f1f1f] pb-3 sm:pb-4">
                  <h2 className="text-xs sm:text-sm font-bold text-[#f5f5f5] uppercase tracking-wider flex items-center gap-2">
                    <Tv className="w-4 h-4 text-[#e50914]" />
                    <span>Danh sách tập</span>
                    <span className="text-[#737373] font-normal">({totalEpisodes} tập)</span>
                  </h2>

                  {/* Server Selection Tabs */}
                  {movie.episodes.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#737373] mr-1 flex items-center gap-1">
                        <Server className="w-3.5 h-3.5 text-[#e50914]" />
                        <span>Server:</span>
                      </span>
                      {movie.episodes.map((srv, idx) => {
                        const active = activeServerIdx === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setActiveServerIdx(idx);
                              setActiveChunkIdx(0);
                            }}
                            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                              active
                                ? 'bg-[#e50914] text-white shadow-md shadow-[#e50914]/20 border border-[#e50914]'
                                : 'bg-[#181818] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:bg-[#222]'
                            }`}
                          >
                            {srv.serverName || `Server #${idx + 1}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Episode Chunk Tabs for Large Series (>50 eps) */}
                {numChunks > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs font-bold text-[#737373] mr-1 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#e50914]" />
                      <span>Khoảng tập:</span>
                    </span>
                    {Array.from({ length: numChunks }).map((_, cIdx) => {
                      const startEp = cIdx * CHUNK_SIZE + 1;
                      const endEp = Math.min((cIdx + 1) * CHUNK_SIZE, activeEpisodes.length);
                      const active = activeChunkIdx === cIdx;
                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => setActiveChunkIdx(cIdx)}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                            active
                              ? 'bg-[#262626] border border-[#e50914] text-white font-bold'
                              : 'bg-[#141414] border border-[#222222] text-[#a3a3a3] hover:text-white'
                          }`}
                        >
                          {startEp} - {endEp}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Episode Grid with Watch States */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-72 sm:max-h-80 overflow-y-auto no-scrollbar pr-0.5">
                  {currentChunkEpisodes.map((ep) => {
                    const status = episodeProgressMap.get(ep.slug);
                    const isCompleted = Boolean(status?.completed);
                    const inProgress = Boolean(status && !status.completed && status.percent > 0);

                    const labelText = ep.name.trim().toLowerCase().startsWith('tập')
                      ? ep.name.trim()
                      : `Tập ${ep.name.trim()}`;

                    return (
                      <Link
                        key={ep.slug}
                        href={`/xem-phim/${movie.slug}?ep=${ep.slug}&server=${activeServerIdx}`}
                        aria-label={`${labelText}${isCompleted ? ', đã xem' : inProgress ? `, đã xem ${status?.percent}%` : ''}`}
                        className={`relative min-h-[40px] px-1.5 py-2 text-center text-xs font-semibold rounded-xl transition-all truncate flex items-center justify-center gap-1 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] overflow-hidden ${
                          isCompleted
                            ? 'bg-[#181818] border border-emerald-900/60 text-emerald-300 hover:border-emerald-500'
                            : inProgress
                            ? 'bg-[#201416] border border-[#e50914]/50 text-white hover:border-[#e50914]'
                            : 'bg-[#161616] border border-[#262626] hover:border-[#e50914] hover:bg-[#202020] text-[#d4d4d4] hover:text-white'
                        }`}
                      >
                        {isCompleted && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
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
              </section>
            )}
          </div>
        </div>
      </div>

      {/* 3. Trailer Modal Dialog (if trailer is open) */}
      {trailerModalOpen && presentation?.trailer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Trailer phim ${displayTitle}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        >
          {/* Click-outside backdrop */}
          <div
            className="absolute inset-0"
            onClick={() => setTrailerModalOpen(false)}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-4xl bg-[#121212] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#222]">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#e50914]" />
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  Trailer: {displayTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTrailerModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#2e2e2e] text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                aria-label="Đóng trailer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Frame */}
            <div className="relative w-full aspect-video bg-black">
              {presentation.trailer.key ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${presentation.trailer.key}?autoplay=1&rel=0`}
                  title={`Trailer ${displayTitle}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center text-[#a3a3a3]">
                  <p>Không thể tải khung trailer trực tiếp.</p>
                  <a
                    href={presentation.trailer.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-4 py-2 bg-[#e50914] text-white text-xs font-bold rounded-xl"
                  >
                    Xem trực tiếp trên YouTube
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Mobile Sticky Bottom CTA Bar */}
      {showStickyCta && (
        <div
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0c]/95 backdrop-blur-md border-t border-[#262626] p-3 md:hidden flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 shadow-2xl"
        >
          <Link
            href={`/xem-phim/${movie.slug}?ep=${smartCTA.episodeSlug}&server=${smartCTA.serverIndex}`}
            className="flex-1 flex items-center justify-center gap-2 bg-[#e50914] hover:bg-[#b80710] text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-[#e50914]/30 active:scale-[0.98] transition-transform"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>{smartCTA.label}</span>
          </Link>

          <button
            onClick={() => toggleWatchlist(movie)}
            type="button"
            className={`p-3 rounded-xl border transition-all active:scale-95 ${
              saved
                ? 'bg-[#e50914] border-[#e50914] text-white'
                : 'bg-[#181818] border-[#2a2a2a] text-[#a3a3a3]'
            }`}
            aria-label={saved ? 'Bỏ lưu' : 'Lưu phim'}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
}
