'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Users,
  Tv,
  ChevronDown,
  ChevronUp,
  Server,
  Layers,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { EnrichedMovieDetailModel } from '@/types/tmdb';
import { useWatchlist, toggleWatchlist } from '@/lib/utils/favorites';
import { usePlaybackProgress, resolveResumeTarget } from '@/lib/persistence/progress';
import { toast } from '@/lib/utils/toast';
import MovieImage from '@/components/ui/MovieImage';

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
      if (window.scrollY > 300) {
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

  // Filter valid actors & directors
  const validActors = (movie.actors || []).filter(
    (a) => a && a !== 'N/A' && a !== 'Đang cập nhật' && a !== 'undefined' && a.trim().length > 0
  );
  const validDirectors = (movie.directors || []).filter(
    (d) => d && d !== 'N/A' && d !== 'Đang cập nhật' && d !== 'undefined' && d.trim().length > 0
  );
  const displayDirectors = presentation?.directors?.length
    ? presentation.directors.map((director) => director.name)
    : presentation?.creators?.length
      ? presentation.creators.map((creator) => creator.name)
      : validDirectors;
  const displayActors = presentation?.cast?.length
    ? presentation.cast.map((actor) => actor.character ? `${actor.name} (${actor.character})` : actor.name)
    : validActors;

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

  const longSynopsis = (displayOverview || '').length > 220;

  return (
    <div className="relative text-white min-h-screen pb-16">
      {/* Backdrop Image Banner */}
      <div className="relative w-full h-[55vh] min-h-[400px] max-h-[600px] bg-[#080808] overflow-hidden">
        <MovieImage
          src={displayBackdrop}
          alt={displayTitle}
          title={displayTitle}
          priority
          sizes="100vw"
          aspectRatio="backdrop"
          className="w-full h-full object-cover object-center opacity-40 blur-sm scale-105"
        />
        {/* Blending Gradients */}
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-overlay-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent pointer-events-none" />
      </div>

      {/* Main Content Info Overlay */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-56 sm:-mt-72 md:-mt-80 z-20">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
          {/* Poster Column */}
          <div className="w-48 sm:w-64 md:w-72 shrink-0 mx-auto md:mx-0">
            <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#141414] border-2 border-[#2a2a2a] shadow-2xl group">
              <MovieImage
                src={displayPoster}
                alt={displayTitle}
                title={displayTitle}
                priority
                sizes="(max-width: 768px) 256px, 288px"
                aspectRatio="poster"
                className="w-full h-full object-cover"
              />
              {movie.quality && (
                <span className="absolute top-3 left-3 bg-[#e50914] text-white text-xs font-bold px-2 py-1 rounded shadow">
                  {movie.quality}
                </span>
              )}
              {movie.episodeCurrent && (
                <span className="absolute top-3 right-3 bg-[#080808]/85 backdrop-blur text-white text-xs font-semibold px-2 py-1 rounded border border-[#333]">
                  {movie.episodeCurrent}
                </span>
              )}
            </div>

            {/* Action Buttons under Poster */}
            <div className="mt-4 flex flex-col gap-2.5">
              <Link
                href={`/xem-phim/${movie.slug}?ep=${smartCTA.episodeSlug}&server=${smartCTA.serverIndex}`}
                className="w-full flex flex-col items-center justify-center gap-0.5 bg-[#e50914] hover:bg-[#f40612] text-white font-bold py-3 px-5 rounded-xl shadow-lg shadow-[#e50914]/25 transition-all hover:scale-[1.02] active:scale-98 text-center"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span className="text-sm">{smartCTA.label}</span>
                </div>
                {smartCTA.subLabel && (
                  <span className="text-[11px] font-medium text-white/80">{smartCTA.subLabel}</span>
                )}
              </Link>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleWatchlist(movie)}
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    saved
                      ? 'bg-[#e50914] border-[#e50914] text-white'
                      : 'bg-[#141414] border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:bg-[#1f1f1f]'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  <span>{saved ? 'Đã lưu' : 'Yêu thích'}</span>
                </button>

                <button
                  onClick={handleShare}
                  type="button"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#141414] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:bg-[#1f1f1f] text-xs font-semibold transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copied ? 'Đã chép!' : 'Chia sẻ'}</span>
                </button>
              </div>
              {presentation?.trailer && (
                <a
                  href={presentation.trailer.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#141414] border border-[#2a2a2a] text-[#d4d4d4] hover:text-white hover:border-[#e50914] text-xs font-semibold transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Xem trailer</span>
                </a>
              )}
            </div>
          </div>

          {/* Details Info Column */}
          <div className="flex-1 space-y-5 pt-2 w-full">
            <div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#f5f5f5] tracking-tight leading-tight">
                {displayTitle}
              </h1>
              {displayOriginalTitle && (
                <p className="text-base sm:text-lg text-[#a3a3a3] font-medium mt-1">
                  {displayOriginalTitle}
                </p>
              )}
            </div>

            {/* Quick Metadata Stats */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-[#d4d4d4]">
              {displayRating && displayRating > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-3 py-1 rounded-lg">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{displayRating.toFixed(1)} / 10{presentation?.ratingSource === 'tmdb' ? ' · TMDB' : ''}</span>
                  {displayVoteCount && (
                    <span className="text-[11px] text-[#a3a3a3] font-normal">
                      ({displayVoteCount} vote)
                    </span>
                  )}
                </div>
              )}

              {displayYear && (
                <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1 rounded-lg">
                  <Calendar className="w-4 h-4 text-[#a3a3a3]" />
                  <span>{displayYear}</span>
                </div>
              )}

              {displayRuntime && (
                <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1 rounded-lg">
                  <Clock className="w-4 h-4 text-[#a3a3a3]" />
                  <span>{displayRuntime}</span>
                </div>
              )}

              {movie.views !== undefined && movie.views > 0 && (
                <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1 rounded-lg">
                  <Eye className="w-4 h-4 text-[#a3a3a3]" />
                  <span>{movie.views.toLocaleString()} lượt xem</span>
                </div>
              )}

              {movie.language && (
                <div className="bg-[#1c1c1c] border border-[#333] px-2.5 py-1 rounded-lg text-xs font-semibold text-[#e50914]">
                  {movie.language}
                </div>
              )}
            </div>

            {/* Categories & Countries */}
            <div className="space-y-2 pt-1">
              {movie.categories && movie.categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#737373] font-semibold">Thể loại:</span>
                  {movie.categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/the-loai/${cat.slug}`}
                      className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e50914] text-[#d4d4d4] hover:text-white px-2.5 py-1 rounded-md transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}

              {movie.countries && movie.countries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#737373] font-semibold">Quốc gia:</span>
                  {movie.countries.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/quoc-gia/${c.slug}`}
                      className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e50914] text-[#d4d4d4] hover:text-white px-2.5 py-1 rounded-md transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Synopsis */}
            <div className="bg-[#101010] border border-[#222] p-4 sm:p-6 rounded-2xl space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Film className="w-4 h-4 text-[#e50914]" />
                Nội dung phim
              </h3>
              <div className="relative">
                <p
                  className={`text-xs sm:text-sm text-[#a3a3a3] leading-relaxed whitespace-pre-line transition-all ${
                    !synopsisExpanded && longSynopsis ? 'line-clamp-4' : ''
                  }`}
                >
                  {displayOverview || 'Nội dung phim đang được cập nhật.'}
                </p>
                {longSynopsis && (
                  <button
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    type="button"
                    className="mt-2 text-xs font-semibold text-[#e50914] hover:text-[#f40612] flex items-center gap-1 focus:outline-none"
                  >
                    <span>{synopsisExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                    {synopsisExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Directors & Cast */}
            {(displayDirectors.length > 0 || displayActors.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayDirectors.length > 0 && (
                  <div className="bg-[#101010] border border-[#222] p-4 rounded-xl space-y-1">
                    <span className="text-xs font-semibold text-[#737373] uppercase">Đạo diễn</span>
                    <p className="text-sm font-medium text-white">{displayDirectors.join(', ')}</p>
                  </div>
                )}

                {displayActors.length > 0 && (
                  <div className="bg-[#101010] border border-[#222] p-4 rounded-xl space-y-1">
                    <span className="text-xs font-semibold text-[#737373] uppercase flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#e50914]" />
                      Diễn viên
                    </span>
                    <p className="text-xs sm:text-sm text-[#d4d4d4] leading-relaxed line-clamp-3">
                      {displayActors.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {presentation?.cast && presentation.cast.length > 0 && (
              <div className="bg-[#101010] border border-[#222] p-4 rounded-xl space-y-3">
                <span className="text-xs font-semibold text-[#737373] uppercase flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#e50914]" />
                  Diễn viên từ TMDB
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {presentation.cast.map((actor) => (
                    <div key={actor.id} className="min-w-0">
                      {actor.profileUrl ? (
                        <MovieImage
                          src={actor.profileUrl}
                          alt={actor.name}
                          title={actor.name}
                          aspectRatio="square"
                          sizes="120px"
                          className="rounded-lg"
                        />
                      ) : (
                        <div className="aspect-square rounded-lg bg-[#181818] border border-[#262626] flex items-center justify-center text-[#737373] text-xs text-center px-2">
                          {actor.name}
                        </div>
                      )}
                      <p className="mt-1 text-xs font-semibold text-white truncate">{actor.name}</p>
                      {actor.character && <p className="text-[11px] text-[#737373] truncate">{actor.character}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {presentation?.season && (
              <div className="bg-[#101010] border border-[#222] p-4 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-[#737373] uppercase">Thông tin mùa phim</span>
                <p className="text-sm font-semibold text-white">
                  {presentation.season.name} · Phần {presentation.season.seasonNumber}
                </p>
                {presentation.season.overview && (
                  <p className="text-xs text-[#a3a3a3] leading-relaxed">{presentation.season.overview}</p>
                )}
              </div>
            )}

            {/* Episode List Preview & Selector */}
            {movie.episodes && movie.episodes.length > 0 && (
              <div className="bg-[#101010] border border-[#222] p-4 sm:p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f1f1f] pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Tv className="w-4 h-4 text-[#e50914]" />
                    Danh sách tập ({totalEpisodes} tập)
                  </h3>

                  {/* Server Selection Tabs */}
                  {movie.episodes.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-[#737373] mr-1 flex items-center gap-1">
                        <Server className="w-3 h-3 text-[#e50914]" /> Server:
                      </span>
                      {movie.episodes.map((srv, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveServerIdx(idx);
                            setActiveChunkIdx(0);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            activeServerIdx === idx
                              ? 'bg-[#e50914] text-white'
                              : 'bg-[#181818] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white'
                          }`}
                        >
                          {srv.serverName || `Server #${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Episode Chunk Tabs for Large Series (>50 eps) */}
                {numChunks > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-[#737373] mr-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#e50914]" /> Chọn khoảng tập:
                    </span>
                    {Array.from({ length: numChunks }).map((_, cIdx) => {
                      const startEp = cIdx * CHUNK_SIZE + 1;
                      const endEp = Math.min((cIdx + 1) * CHUNK_SIZE, activeEpisodes.length);
                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => setActiveChunkIdx(cIdx)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            activeChunkIdx === cIdx
                              ? 'bg-[#262626] border border-[#e50914] text-white'
                              : 'bg-[#141414] border border-[#222] text-[#a3a3a3] hover:text-white'
                          }`}
                        >
                          {startEp} - {endEp}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Episode Grid with Watch State */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {currentChunkEpisodes.map((ep) => {
                    const status = episodeProgressMap.get(ep.slug);
                    const isCompleted = status?.completed;
                    const inProgress = status && !status.completed && status.percent > 0;

                    return (
                      <Link
                        key={ep.slug}
                        href={`/xem-phim/${movie.slug}?ep=${ep.slug}&server=${activeServerIdx}`}
                        aria-label={`Tập ${ep.name}${isCompleted ? ', đã xem' : inProgress ? `, đã xem ${status.percent}%` : ''}`}
                        className={`relative py-2 px-1 text-center border rounded-lg text-xs font-medium transition-colors truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] overflow-hidden flex items-center justify-center gap-1 ${
                          isCompleted
                            ? 'bg-[#181818] border-emerald-900/60 text-emerald-300 hover:border-emerald-500'
                            : 'bg-[#181818] border-[#262626] hover:border-[#e50914] hover:bg-[#e50914] text-white'
                        }`}
                      >
                        {isCompleted && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                        <span>Tập {ep.name}</span>
                        {inProgress && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={status.percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div className="h-full bg-[#e50914] transition-[width] duration-300" style={{ width: `${status.percent}%` }} />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA Bar */}
      {showStickyCta && (
        <div
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0c]/95 backdrop-blur-md border-t border-[#262626] p-3 md:hidden flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 shadow-2xl"
        >
          <Link
            href={`/xem-phim/${movie.slug}?ep=${smartCTA.episodeSlug}&server=${smartCTA.serverIndex}`}
            className="flex-1 flex items-center justify-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-[#e50914]/30"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>{smartCTA.label}</span>
          </Link>

          <button
            onClick={() => toggleWatchlist(movie)}
            type="button"
            className={`p-3 rounded-xl border transition-all ${
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

