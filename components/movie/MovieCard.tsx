'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Star, Play, Bookmark } from 'lucide-react';
import { MovieCardModel } from '@/types/movie';
import { useWatchlist, toggleWatchlist } from '@/lib/utils/favorites';
import { usePlaybackProgress } from '@/lib/persistence/progress';
import MovieImage from '@/components/ui/MovieImage';
import MovieBadge from '@/components/ui/MovieBadge';

interface MovieCardProps {
  movie: MovieCardModel;
  priority?: boolean;
}

export default function MovieCard({ movie, priority = false }: MovieCardProps) {
  const { isSaved, isMounted } = useWatchlist();
  const saved = isMounted && isSaved(movie.slug);
  const { progressList } = usePlaybackProgress();

  // Find latest unfinished progress record for this movie
  const progressRecord = useMemo(() => {
    const matching = progressList.filter(
      (p) => p.movieSlug === movie.slug && !p.completed && p.currentTime >= 10 && p.duration > 0
    );
    if (matching.length === 0) return null;
    matching.sort((a, b) => b.updatedAt - a.updatedAt);
    return matching[0];
  }, [progressList, movie.slug]);

  const progressPercent = progressRecord
    ? Math.min(100, Math.max(0, Math.round((progressRecord.currentTime / progressRecord.duration) * 100)))
    : 0;

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(movie);
  };

  const posterImage = movie.posterUrl || movie.thumbUrl;

  return (
    <div className="group/card relative flex flex-col w-full h-full select-none">
      <Link
        href={`/phim/${movie.slug}`}
        aria-label={`Xem chi tiết phim ${movie.title}`}
        className="block relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#141414] border border-[#222222] shadow-md group-hover/card:border-[#333333] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]"
      >
        {/* Poster Image wrapped in MovieImage */}
        <MovieImage
          src={posterImage}
          alt={movie.title}
          title={movie.title}
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          className="group-hover/card:scale-[1.04] transition-transform duration-300 ease-out"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10 gap-1">
          <div className="flex flex-wrap gap-1 max-w-[80%]">
            {movie.quality && (
              <MovieBadge variant="accent" size="sm">
                {movie.quality}
              </MovieBadge>
            )}
            {movie.episodeCurrent && (
              <MovieBadge variant="secondary" size="sm" className="bg-[#080808]/85 backdrop-blur-sm">
                {movie.episodeCurrent}
              </MovieBadge>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmarkClick}
            type="button"
            aria-label={saved ? `Bỏ khỏi danh sách phim ${movie.title}` : `Thêm ${movie.title} vào danh sách`}
            className={`pointer-events-auto p-2 sm:p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full transition-transform duration-150 active:scale-90 shadow-md ${
              saved
                ? 'bg-[#e50914] text-white'
                : 'bg-[#080808]/85 text-[#d4d4d4] hover:text-white hover:bg-[#080808]'
            }`}
            title={saved ? 'Xóa khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
          >
            <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Hover Overlay Play Icon */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none z-10">
          <div className="w-11 h-11 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg shadow-[#e50914]/40 transform scale-90 group-hover/card:scale-100 transition-transform duration-200">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Bottom Rating / Year Overlay if available */}
        {(movie.rating || movie.year || movie.language) && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex items-center justify-between text-[11px] text-[#d4d4d4] pointer-events-none z-10">
            <span className="flex items-center gap-1.5">
              {movie.year && <span>{movie.year}</span>}
              {movie.language && (
                <span className="text-[10px] text-[#a3a3a3] uppercase font-medium">
                  {movie.language}
                </span>
              )}
            </span>
            {movie.rating ? (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="w-3 h-3 fill-current" />
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

      {/* Card Info */}
      <div className="pt-2 px-0.5 flex flex-col flex-1">
        <Link
          href={`/phim/${movie.slug}`}
          tabIndex={-1}
          className="group-hover/card:text-[#e50914] transition-colors focus:outline-none"
        >
          <h3 className="text-xs sm:text-sm font-semibold text-[#f5f5f5] line-clamp-1 leading-snug">
            {movie.title}
          </h3>
        </Link>
        {movie.originalTitle && (
          <p className="text-[11px] text-[#737373] line-clamp-1 mt-0.5 font-normal">
            {movie.originalTitle}
          </p>
        )}
      </div>
    </div>
  );
}

