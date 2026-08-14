'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Star, Play, Bookmark } from 'lucide-react';
import { MovieCardModel } from '@/types/movie';
import { toggleWatchlist } from '@/lib/utils/favorites';
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
  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(movie);
  };

  const posterImage = movie.posterUrl || movie.thumbUrl;

  return (
    <div className="group/card relative flex flex-col w-full h-full select-none">
      {/* Poster Media Box */}
      <div className="relative w-full aspect-[2/3] rounded-lg sm:rounded-xl overflow-hidden bg-[#121212] border border-[#1f1f1f] shadow-md group-hover/card:border-[#333333] transition-colors">
        <Link
          href={`/phim/${movie.slug}`}
          aria-label={`Xem chi tiết phim ${movie.title}`}
          className="block relative w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]"
        >
          {/* Poster Image wrapped in MovieImage */}
          <MovieImage
            src={posterImage}
            alt={movie.title}
            title={movie.title}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, (max-width: 1536px) 20vw, 220px"
            className="group-hover/card:scale-[1.03] transition-transform duration-200 ease-out motion-reduce:transition-none"
          />

          {/* Hover Overlay Play Icon */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none z-10 motion-reduce:transition-none">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg shadow-[#e50914]/40 transform scale-90 group-hover/card:scale-100 transition-transform duration-200 motion-reduce:transition-none">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
            </div>
          </div>

          {/* Bottom Rating / Year Overlay if available */}
          {(movie.rating || movie.year || movie.language) && (
            <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-2.5 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex items-center justify-between text-[11px] text-[#d4d4d4] pointer-events-none z-10">
              <span className="flex items-center gap-1.5">
                {movie.year && <span className="font-medium">{movie.year}</span>}
                {movie.language && (
                  <span className="text-[10px] text-[#a3a3a3] uppercase font-medium">
                    {movie.language}
                  </span>
                )}
              </span>
              {movie.rating ? (
                <span className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                  <Star className="w-3 h-3 fill-current text-amber-400" />
                  {movie.rating.toFixed(1)}
                </span>
              ) : null}
            </div>
          )}

          {/* Unfinished Progress Line at bottom of Poster */}
          {progressPercent > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 h-1 bg-[#1a1a1a] overflow-hidden z-20 pointer-events-none"
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

        {/* Top Badges & Controls Overlay */}
        <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 flex items-start justify-between pointer-events-none z-20 gap-1">
          <div className="flex flex-wrap gap-1 max-w-[75%]">
            {movie.quality && (
              <MovieBadge variant="quality" size="sm">
                {movie.quality}
              </MovieBadge>
            )}
            {movie.episodeCurrent && (
              <MovieBadge variant="secondary" size="sm">
                {movie.episodeCurrent}
              </MovieBadge>
            )}
          </div>

          {/* Bookmark Button (Always interactive, accessible via keyboard and touch) */}
          <button
            onClick={handleBookmarkClick}
            type="button"
            aria-label={isSaved ? `Bỏ khỏi danh sách phim ${movie.title}` : `Thêm ${movie.title} vào danh sách`}
            aria-pressed={isSaved}
            className={`pointer-events-auto min-w-[36px] min-h-[36px] w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
              isSaved
                ? 'bg-[#e50914] text-white opacity-100'
                : 'bg-[#080808]/85 text-[#d4d4d4] hover:text-white hover:bg-[#141414] border border-[#2a2a2a] opacity-90 sm:opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100'
            }`}
            title={isSaved ? 'Xóa khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
          >
            <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Card Info Area with Fixed 2-line Title for Zero-CLS Stability */}
      <div className="pt-2 px-0.5 flex flex-col flex-1">
        <Link
          href={`/phim/${movie.slug}`}
          tabIndex={-1}
          className="group-hover/card:text-[#e50914] transition-colors focus:outline-none"
        >
          <div className="h-9 sm:h-10 flex items-start overflow-hidden">
            <h3 className="text-xs sm:text-sm font-semibold text-[#f5f5f5] line-clamp-2 leading-snug group-hover/card:text-[#e50914] transition-colors">
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
    </div>
  );
}

const MovieCard = memo(MovieCardComponent);
export default MovieCard;
