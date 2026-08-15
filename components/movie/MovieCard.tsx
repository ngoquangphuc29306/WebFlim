'use client';

import React, { memo, useState } from 'react';
import Link from 'next/link';
import { Star, Play, Bookmark, ChevronDown, ThumbsUp, Check } from 'lucide-react';
import { MovieCardModel } from '@/types/movie';
import { toggleWatchlist } from '@/lib/utils/favorites';
import { useQuickPreview } from './QuickPreviewContext';
import MovieImage from '@/components/ui/MovieImage';
import MovieBadge from '@/components/ui/MovieBadge';

export interface MovieCardProps {
  movie: MovieCardModel;
  priority?: boolean;
  isSaved?: boolean;
  progressPercent?: number;
}

function MovieCardComponent({
  movie,
  priority = false,
  isSaved = false,
  progressPercent = 0,
}: MovieCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isCardFocused, setIsCardFocused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [align, setAlign] = useState<'center' | 'left' | 'right'>('center');
  const { openPreview } = useQuickPreview();

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(movie);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked((prev) => !prev);
  };

  const handleOpenPreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openPreview(movie);
  };

  const updateAlignment = () => {
    if (cardRef.current && typeof window !== 'undefined') {
      const rect = cardRef.current.getBoundingClientRect();
      const hoverCardWidth = window.innerWidth >= 1024 ? 320 : 300;
      const cardWidth = rect.width;
      const requiredOverflow = (hoverCardWidth - cardWidth) / 2 + 16;

      const parentRow = cardRef.current.closest<HTMLElement>('.group\\/row, section');
      const parentRect = parentRow ? parentRow.getBoundingClientRect() : null;

      const rightBoundary = parentRect ? Math.min(window.innerWidth, parentRect.right) : window.innerWidth;
      const leftBoundary = parentRect ? Math.max(0, parentRect.left) : 0;

      const spaceOnLeft = rect.left - leftBoundary;
      const spaceOnRight = rightBoundary - rect.right;

      if (spaceOnRight < requiredOverflow || window.innerWidth - rect.right < requiredOverflow) {
        setAlign('right');
      } else if (spaceOnLeft < requiredOverflow || rect.left < requiredOverflow) {
        setAlign('left');
      } else {
        setAlign('center');
      }
    }
  };

  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      updateAlignment();
      setIsHovered(true);
    }
  };

  const handleCardFocus = () => {
    updateAlignment();
    setIsCardFocused(true);
  };

  const handleCardBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsCardFocused(false);
      setIsHovered(false);
    }
  };

  const posterImage = movie.posterUrl || movie.thumbUrl;
  const backdropImage = movie.thumbUrl || movie.posterUrl;
  const ratingScore = movie.rating;
  const isOverlayVisible = isHovered || isCardFocused;

  return (
    <div
      ref={cardRef}
      className={`group/card relative flex flex-col w-full h-full select-none ${
        isHovered ? 'z-50' : 'z-10'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseMove={() => {
        if (!isHovered) updateAlignment();
      }}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={handleCardFocus}
      onBlurCapture={handleCardBlur}
    >
      {/* Poster Media Box */}
      <div className="relative w-full aspect-[2/3] rounded-md sm:rounded-lg overflow-hidden bg-[#181818] border border-white/5 shadow-md group-hover/card:border-white/20 transition-all">
        <Link
          href={`/phim/${movie.slug}`}
          aria-label={`Xem chi tiết phim ${movie.title}`}
          className="block relative w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414]"
        >
          {/* Poster Image wrapped in MovieImage */}
          <MovieImage
            src={posterImage}
            alt={movie.title}
            title={movie.title}
            priority={priority}
            sizes="(max-width: 640px) 35vw, (max-width: 1024px) 25vw, (max-width: 1536px) 20vw, 220px"
            className="group-hover/card:scale-[1.03] transition-transform duration-300 ease-out motion-reduce:transition-none"
          />

          {/* Hover Overlay Play Icon (Desktop Only) */}
          <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 items-center justify-center pointer-events-none z-10 motion-reduce:transition-none">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-90 group-hover/card:scale-100 transition-transform duration-200 motion-reduce:transition-none">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
            </div>
          </div>

          {/* Bottom Rating / Year Overlay if available */}
          {(movie.rating || movie.year) && (
            <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-[10px] sm:text-[11px] text-[#d4d4d4] pointer-events-none z-10">
              <span className="font-semibold text-white/90">{movie.year || ''}</span>
              {movie.rating ? (
                <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                  <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current text-amber-400" />
                  {movie.rating.toFixed(1)}
                </span>
              ) : null}
            </div>
          )}

          {/* Unfinished Progress Line at bottom of Poster */}
          {progressPercent > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 overflow-hidden z-20 pointer-events-none"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tiến độ xem ${progressPercent}%`}
            >
              <div
                className="h-full bg-[#e50914] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </Link>

        {/* Top Badges & Quick Action Controls Overlay */}
        <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 flex items-start justify-between pointer-events-none z-20 gap-1">
          <div className="flex flex-wrap gap-1 max-w-[80%]">
            {movie.episodeCurrent ? (
              <span className="bg-black/80 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded border border-white/10 shadow-sm">
                {movie.episodeCurrent}
              </span>
            ) : movie.quality ? (
              <span className="bg-black/80 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded border border-white/10 shadow-sm">
                {movie.quality}
              </span>
            ) : null}
          </div>

          {/* Bookmark Button (Desktop Hover Only to avoid mobile clutter) */}
          <button
            onClick={handleBookmarkClick}
            type="button"
            aria-label={isSaved ? `Bỏ khỏi danh sách phim ${movie.title}` : `Thêm ${movie.title} vào danh sách`}
            aria-pressed={isSaved}
            className={`pointer-events-auto hidden sm:flex min-w-[44px] min-h-[44px] w-7 h-7 sm:w-8 sm:h-8 items-center justify-center rounded-full transition-all duration-150 active:scale-90 shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
              isSaved
                ? 'bg-[#e50914] text-white opacity-100'
                : 'bg-black/75 text-white hover:bg-white hover:text-black border border-white/20 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100'
            }`}
            title={isSaved ? 'Xóa khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
          >
            {isSaved ? (
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Card Info Area with Fixed 2-line Title for Zero-CLS Stability */}
      <div className="pt-2 px-0.5 flex flex-col flex-1">
        <Link
          href={`/phim/${movie.slug}`}
          className="group-hover/card:text-[#e50914] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-sm"
        >
          <div className="h-9 sm:h-10 flex items-start overflow-hidden">
            <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-snug group-hover/card:text-[#e50914] transition-colors">
              {movie.title}
            </h3>
          </div>
        </Link>
        {movie.originalTitle && (
          <p className="text-[11px] text-[#737373] line-clamp-1 mt-0.5 font-normal truncate">
            {movie.originalTitle}
          </p>
        )}
      </div>

      {/* Desktop Quick Preview Hover Card Overlay (Netflix-Style Scaled Card Popup) */}
      <div
        className={`absolute top-[-10px] w-[300px] lg:w-[320px] bg-[#181818] border border-white/10 rounded-xl shadow-2xl shadow-black overflow-hidden z-[60] transition-all duration-300 animate-in fade-in zoom-in-95 ${
          align === 'left'
            ? 'left-0 origin-top-left'
            : align === 'right'
            ? 'right-0 left-auto origin-top-right'
            : 'left-1/2 -translate-x-1/2 origin-top'
        }`}
        style={{ display: isOverlayVisible ? undefined : 'none' }}
      >
        {/* Top Video/Backdrop Banner */}
        <div className="relative aspect-video w-full bg-[#0a0a0a] overflow-hidden">
          <MovieImage
            src={backdropImage}
            alt={movie.title}
            title={movie.title}
            fill
            sizes="320px"
            aspectRatio="custom"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/30 to-transparent flex items-end p-3 pointer-events-none">
            <h4 className="text-xs sm:text-sm font-extrabold text-white line-clamp-1 drop-shadow-md">
              {movie.title}
            </h4>
          </div>
        </div>

        {/* Content & Actions Body */}
        <div className="p-3">
          {/* Netflix Quick Action Buttons Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {/* Play Button */}
              <Link
                href={`/xem-phim/${movie.slug}`}
                aria-label={`Xem phim ${movie.title}`}
                className="min-w-[44px] min-h-[44px] w-9 h-9 bg-white hover:bg-white/85 text-black rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                title="Xem phim"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </Link>

              {/* Add to List (+) */}
              <button
                type="button"
                onClick={handleBookmarkClick}
                aria-label={isSaved ? `Bỏ lưu ${movie.title}` : `Thêm ${movie.title} vào danh sách`}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-[#e50914] text-white border-[#e50914]'
                    : 'bg-[#242424] text-white border-white/20 hover:border-white hover:bg-white/10'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]`}
                title={isSaved ? 'Đã lưu' : 'Thêm vào danh sách'}
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>

              {/* Like (Thumbs Up) */}
              <button
                type="button"
                onClick={handleLikeClick}
                aria-label={isLiked ? `Bỏ thích ${movie.title}` : `Thích ${movie.title}`}
                className={`min-w-[44px] min-h-[44px] w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  isLiked
                    ? 'bg-white text-black border-white'
                    : 'bg-[#242424] text-white border-white/20 hover:border-white hover:bg-white/10'
                }`}
                title={isLiked ? 'Đã thích' : 'Thích phim này'}
              >
                <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Quick Preview Expand Chevron (∨) */}
            <button
              type="button"
              onClick={handleOpenPreview}
              aria-label={`Mở xem nhanh ${movie.title}`}
              className="min-w-[44px] min-h-[44px] w-9 h-9 rounded-full bg-[#242424] hover:bg-[#333] text-white border border-white/20 hover:border-white flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
              title="Xem thêm thông tin"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Quality, Year & Episode Tags */}
          <div className="flex items-center gap-2 text-[11px] mb-2 font-medium">
            {movie.quality && (
              <span className="bg-[#2a2a2a] text-white px-1.5 py-0.5 rounded text-[10px] font-bold border border-white/10">
                {movie.quality}
              </span>
            )}
            {movie.year && <span className="text-[#a3a3a3]">{movie.year}</span>}
            {movie.episodeCurrent && (
              <span className="text-[#737373] text-[10px]">{movie.episodeCurrent}</span>
            )}
          </div>

          {/* Genre Tags (Dot Separated) */}
          {movie.categories && movie.categories.length > 0 && (
            <div className="text-[11px] text-[#a3a3a3] line-clamp-1">
              {movie.categories
                .map((c) => (typeof c === 'string' ? c : c.name))
                .slice(0, 3)
                .join(' • ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MovieCard = memo(MovieCardComponent);
export default MovieCard;
