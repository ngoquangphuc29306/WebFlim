'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  Play,
  Bookmark,
  ThumbsUp,
  Star,
  Check,
  Film,
  Tv,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { MovieDetailModel, MovieCardModel } from '@/types/movie';
import { useQuickPreview } from './QuickPreviewContext';
import { useWatchlist, toggleWatchlist } from '@/lib/utils/favorites';
import { usePlaybackProgress } from '@/lib/persistence/progress';
import MovieImage from '@/components/ui/MovieImage';

export default function QuickPreviewModal() {
  const { previewMovie, isOpen, closePreview, openPreview, previewRequestId } = useQuickPreview();
  const { isSaved, isMounted } = useWatchlist();
  const { progressList } = usePlaybackProgress();

  const [movieDetail, setMovieDetail] = useState<MovieDetailModel | null>(null);
  const [relatedMovies, setRelatedMovies] = useState<MovieCardModel[]>([]);
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [activeChunkIdx, setActiveChunkIdx] = useState(0);
  const [liked, setLiked] = useState(false);
  const [requestAttempt, setRequestAttempt] = useState(0);
  const [requestErrorId, setRequestErrorId] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const movie = previewMovie;
  const saved = isMounted && movie ? isSaved(movie.slug) : false;
  const requestError = Boolean(movie && requestErrorId === previewRequestId);
  const loading = Boolean(isOpen && movie && !movieDetail && !requestError);

  // Compute Episode Watch States map
  const episodeProgressMap = useMemo(() => {
    if (!movie) return new Map<string, { percent: number; completed: boolean }>();
    const map = new Map<string, { percent: number; completed: boolean }>();
    progressList
      .filter((p) => p.movieSlug === movie.slug)
      .forEach((p) => {
        if (p.episodeSlug) {
          const percent =
            p.duration > 0 ? Math.min(100, Math.round((p.currentTime / p.duration) * 100)) : 0;
          map.set(p.episodeSlug, {
            percent,
            completed: p.completed,
          });
        }
      });
    return map;
  }, [progressList, movie]);

  // Fetch full details when previewMovie changes
  useEffect(() => {
    if (!isOpen || !previewMovie?.slug) {
      return;
    }

    let isMountedFetch = true;
    const controller = new AbortController();

    fetch(`/api/movies/${previewMovie.slug}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Preview request failed');
        return res.json();
      })
      .then((data) => {
        if (!isMountedFetch) return;
        if (data.success && data.movie) {
          setMovieDetail(data.movie);
          if (data.relatedMovies) {
            setRelatedMovies(data.relatedMovies);
          }
        } else {
          throw new Error('Preview data unavailable');
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (isMountedFetch) setRequestErrorId(previewRequestId);
      });

    return () => {
      isMountedFetch = false;
      controller.abort();
      setMovieDetail(null);
      setRelatedMovies([]);
      setActiveServerIdx(0);
      setActiveChunkIdx(0);
    };
  }, [isOpen, previewMovie?.slug, previewRequestId, requestAttempt]);

  const handleDialogKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePreview();
        return;
      }

      if (e.key !== 'Tab') return;

      const dialog = modalRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [closePreview]
  );

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
      previouslyFocusedRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen || !movie) return null;

  const currentDetail = movieDetail || (movie as unknown as MovieDetailModel);
  const backdropImage =
    currentDetail.thumbUrl || currentDetail.posterUrl || movie.thumbUrl || movie.posterUrl;
  const ratingScore = currentDetail.rating || movie.rating;

  const activeServer = currentDetail.episodes?.[activeServerIdx] || currentDetail.episodes?.[0];
  const activeEpisodes = activeServer?.items || [];

  const CHUNK_SIZE = 50;
  const numChunks = Math.ceil(activeEpisodes.length / CHUNK_SIZE);
  const currentChunkEpisodes = activeEpisodes.slice(
    activeChunkIdx * CHUNK_SIZE,
    (activeChunkIdx + 1) * CHUNK_SIZE
  );

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-preview-title"
      aria-busy={loading}
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" aria-hidden="true" onClick={closePreview} />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-4xl bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black z-10 my-4 sm:my-8 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closePreview}
          aria-label="Đóng bảng xem nhanh"
          className="absolute top-3 right-3 z-30 min-w-[44px] min-h-[44px] w-9 h-9 rounded-full bg-[#181818]/80 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Billboard Header Banner */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[420px] bg-[#0c0c0c] overflow-hidden">
          <MovieImage
            src={backdropImage}
            alt={movie.title}
            title={movie.title}
            priority
            sizes="(max-width: 1024px) 100vw, 900px"
            aspectRatio="backdrop"
            className="w-full h-full object-cover object-center scale-105"
          />

          {/* Gradients for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-[#141414]/40 to-transparent pointer-events-none" />

          {/* Floating Actions on Banner */}
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-8 right-4 z-20 space-y-3">
            <h2 id="quick-preview-title" className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md line-clamp-1">
              {movie.title}
            </h2>
            {movie.originalTitle && (
              <p className="text-xs sm:text-sm text-[#a3a3a3] font-medium line-clamp-1">
                {movie.originalTitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* Primary Netflix Play Button */}
              <Link
                href={`/xem-phim/${movie.slug}`}
                onClick={closePreview}
                className="min-h-[44px] px-6 py-2.5 bg-white hover:bg-white/85 text-black font-bold text-sm sm:text-base rounded-lg flex items-center gap-2 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                <span>Phát</span>
              </Link>

              {/* Add to Watchlist Button */}
              <button
                type="button"
                onClick={() => toggleWatchlist(movie)}
                className={`min-w-[44px] min-h-[44px] w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  saved
                    ? 'bg-[#e50914] border-[#e50914] text-white shadow-md shadow-[#e50914]/30'
                    : 'bg-black/60 border-white/30 text-white hover:border-white hover:bg-white/20'
                }`}
                title={saved ? 'Đã lưu vào danh sách' : 'Thêm vào danh sách của tôi'}
                aria-label={saved ? 'Bỏ lưu' : 'Thêm vào danh sách'}
              >
                {saved ? <Check className="w-5 h-5" /> : <Bookmark className="w-4 h-4" />}
              </button>

              {/* Like / Thumbs Up Button */}
              <button
                type="button"
                onClick={() => setLiked(!liked)}
                className={`min-w-[44px] min-h-[44px] w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  liked
                    ? 'bg-white text-black border-white'
                    : 'bg-black/60 border-white/30 text-white hover:border-white hover:bg-white/20'
                }`}
                title={liked ? 'Đã thích' : 'Thích phim này'}
                aria-label="Thích"
              >
                <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              </button>

              {/* View Full Detail Page Link */}
              <Link
                href={`/phim/${movie.slug}`}
                onClick={closePreview}
                className="ml-auto text-xs sm:text-sm font-semibold text-[#a3a3a3] hover:text-white flex items-center gap-1 transition-colors px-2 py-1"
              >
                <span>Xem trang chi tiết</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Modal Body Information */}
        <div className="p-4 sm:p-6 sm:pt-4 space-y-6">
          {loading && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#d4d4d4]"
            >
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#e50914] border-t-transparent" />
              Đang tải thông tin phim...
            </div>
          )}

          {requestError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e50914]/40 bg-[#e50914]/10 px-3 py-2 text-xs text-[#f5b5b5]"
            >
              <span>Không thể tải đầy đủ thông tin phim lúc này.</span>
              <button
                type="button"
                onClick={() => {
                  setMovieDetail(null);
                  setRelatedMovies([]);
                  setRequestErrorId(null);
                  setRequestAttempt((attempt) => attempt + 1);
                }}
                className="min-h-[44px] rounded-md border border-[#e50914]/60 px-3 font-semibold text-white transition-colors hover:bg-[#e50914] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Left: Score, Years, Quality & Synopsis */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
                {movie.year && <span className="text-[#a3a3a3] font-medium">{movie.year}</span>}

                {movie.quality && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#262626] border border-white/10 text-white">
                    {movie.quality}
                  </span>
                )}

                {movie.episodeCurrent && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#1e1e1e] text-[#a3a3a3]">
                    {movie.episodeCurrent}
                  </span>
                )}

                {ratingScore && (
                  <span className="flex items-center gap-1 text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {ratingScore.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Synopsis */}
              <p className="text-xs sm:text-sm text-[#d4d4d4] leading-relaxed line-clamp-4">
                {currentDetail.synopsis ||
                  'Trải nghiệm câu chuyện hấp dẫn và lôi cuốn với hình ảnh và âm thanh sống động.'}
              </p>
            </div>

            {/* Right: Cast, Genres, Directors */}
            <div className="space-y-2 text-xs text-[#a3a3a3] bg-[#1a1a1a]/60 p-3.5 rounded-xl border border-white/5">
              {currentDetail.actors && currentDetail.actors.length > 0 && (
                <div>
                  <span className="text-[#737373]">Diễn viên: </span>
                  <span className="text-white font-medium">
                    {currentDetail.actors.slice(0, 4).join(', ')}
                  </span>
                </div>
              )}

              {movie.categories && movie.categories.length > 0 && (
                <div>
                  <span className="text-[#737373]">Thể loại: </span>
                  <span className="text-white font-medium">
                    {movie.categories
                      .map((c) => (typeof c === 'string' ? c : c.name))
                      .slice(0, 4)
                      .join(', ')}
                  </span>
                </div>
              )}

              {currentDetail.directors && currentDetail.directors.length > 0 && (
                <div>
                  <span className="text-[#737373]">Đạo diễn: </span>
                  <span className="text-white font-medium">
                    {currentDetail.directors.slice(0, 2).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Episode Selector (If series) */}
          {activeEpisodes.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#e50914]" />
                  <span>Danh sách tập phim</span>
                  <span className="text-xs text-[#737373] font-normal">
                    ({activeEpisodes.length} tập)
                  </span>
                </h3>

                {/* Server selection if multiple */}
                {currentDetail.episodes && currentDetail.episodes.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    {currentDetail.episodes.map((srv, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveServerIdx(idx);
                          setActiveChunkIdx(0);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          activeServerIdx === idx
                            ? 'bg-[#e50914] text-white font-bold'
                            : 'bg-[#222] text-[#a3a3a3] hover:text-white'
                        }`}
                      >
                        {srv.serverName || `Server ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chunk switcher if >50 eps */}
              {numChunks > 1 && (
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-[#737373] mr-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#e50914]" />
                    Khoảng tập:
                  </span>
                  {Array.from({ length: numChunks }).map((_, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => setActiveChunkIdx(cIdx)}
                      className={`px-2.5 py-0.5 rounded transition-colors ${
                        activeChunkIdx === cIdx
                          ? 'bg-[#e50914] text-white font-bold'
                          : 'bg-[#222] text-[#a3a3a3] hover:text-white'
                      }`}
                    >
                      {cIdx * CHUNK_SIZE + 1} -{' '}
                      {Math.min((cIdx + 1) * CHUNK_SIZE, activeEpisodes.length)}
                    </button>
                  ))}
                </div>
              )}

              {/* Episode Items List */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
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
                      onClick={closePreview}
                      className={`relative min-h-[38px] p-2 text-center text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 overflow-hidden border ${
                        isCompleted
                          ? 'bg-[#181818] border-emerald-800/60 text-emerald-300'
                          : inProgress
                          ? 'bg-[#201416] border-[#e50914]/60 text-white'
                          : 'bg-[#1e1e1e] border-white/5 hover:border-white/20 text-[#d4d4d4] hover:text-white'
                      }`}
                    >
                      {isCompleted && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      <span className="truncate">{labelText}</span>
                      {inProgress && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 overflow-hidden">
                          <div
                            className="h-full bg-[#e50914]"
                            style={{ width: `${status?.percent ?? 0}%` }}
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. More Like This (Nội dung tương tự) */}
          {relatedMovies.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-white/10">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-[#e50914]" />
                <span>Nội dung tương tự</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3">
                {relatedMovies.map((relMovie) => (
                  <button
                    type="button"
                    key={relMovie.slug}
                    onClick={() => openPreview(relMovie)}
                    aria-label={`Xem nhanh phim ${relMovie.title}`}
                    className="group/rel relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-[#1a1a1a] border border-white/5 hover:border-white/20 transition-all cursor-pointer p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414]"
                  >
                    <MovieImage
                      src={relMovie.posterUrl || relMovie.thumbUrl}
                      alt={relMovie.title}
                      title={relMovie.title}
                      fill
                      sizes="150px"
                      className="object-cover group-hover/rel:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2 opacity-90 group-hover/rel:opacity-100">
                      <p className="text-[11px] font-bold text-white line-clamp-1">
                        {relMovie.title}
                      </p>
                      {relMovie.year && (
                        <p className="text-[10px] text-[#a3a3a3]">{relMovie.year}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
