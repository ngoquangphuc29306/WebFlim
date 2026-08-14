'use client';

import React, { useRef } from 'react';
import { Users, User, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TmdbCastPresentation, TmdbCrewPresentation } from '@/types/tmdb';
import MovieImage from '@/components/ui/MovieImage';

interface CastListProps {
  tmdbCast?: TmdbCastPresentation[];
  directors?: string[] | TmdbCrewPresentation[];
  creators?: string[] | TmdbCrewPresentation[];
  fallbackActors?: string[];
}

export default function CastList({
  tmdbCast,
  directors,
  creators,
  fallbackActors,
}: CastListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.7;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Format directors
  const directorNames: string[] = React.useMemo(() => {
    if (!directors || directors.length === 0) return [];
    return directors.map((d) => (typeof d === 'string' ? d : d.name)).filter(Boolean);
  }, [directors]);

  // Format creators
  const creatorNames: string[] = React.useMemo(() => {
    if (!creators || creators.length === 0) return [];
    return creators.map((c) => (typeof c === 'string' ? c : c.name)).filter(Boolean);
  }, [creators]);

  const hasTmdbCast = tmdbCast && tmdbCast.length > 0;
  const hasFallbackActors = fallbackActors && fallbackActors.length > 0;
  const hasDirectors = directorNames.length > 0 || creatorNames.length > 0;

  if (!hasTmdbCast && !hasFallbackActors && !hasDirectors) {
    return null;
  }

  return (
    <section className="bg-[#101010] border border-[#1f1f1f] p-4 sm:p-6 rounded-2xl space-y-4 sm:space-y-5">
      {/* Directors / Creators Row if available */}
      {hasDirectors && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm border-b border-[#1f1f1f] pb-3 sm:pb-4">
          {directorNames.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#737373] uppercase tracking-wider text-[11px] sm:text-xs">
                Đạo diễn:
              </span>
              <span className="font-medium text-[#f5f5f5]">
                {directorNames.join(', ')}
              </span>
            </div>
          )}

          {creatorNames.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#737373] uppercase tracking-wider text-[11px] sm:text-xs">
                Biên kịch / Tác giả:
              </span>
              <span className="font-medium text-[#f5f5f5]">
                {creatorNames.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Cast Section */}
      {hasTmdbCast ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-[#f5f5f5] uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#e50914]" />
              <span>Diễn viên</span>
              <span className="text-[#737373] font-normal lowercase">({tmdbCast.length} người)</span>
            </h3>

            {/* Scroll Navigation Buttons */}
            {tmdbCast.length > 4 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  className="w-8 h-8 rounded-full bg-[#181818] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:border-[#e50914] hover:bg-[#202020] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                  aria-label="Cuộn sang trái danh sách diễn viên"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll('right')}
                  className="w-8 h-8 rounded-full bg-[#181818] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:border-[#e50914] hover:bg-[#202020] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                  aria-label="Cuộn sang phải danh sách diễn viên"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Cast Scroll Row */}
          <div
            ref={scrollContainerRef}
            className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
          >
            {tmdbCast.map((actor, idx) => (
              <div
                key={`${actor.id || 'actor'}-${idx}`}
                className="w-24 sm:w-28 md:w-32 shrink-0 flex flex-col items-center text-center group"
              >
                {/* Avatar */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-[#161616] border-2 border-[#262626] group-hover:border-[#e50914] transition-colors relative shadow-md">
                  {actor.profileUrl ? (
                    <MovieImage
                      src={actor.profileUrl}
                      alt={actor.name}
                      title={actor.name}
                      aspectRatio="square"
                      sizes="(max-width: 640px) 80px, 96px"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1c1c1c] to-[#121212] text-[#737373]">
                      <User className="w-8 h-8 text-[#525252]" />
                    </div>
                  )}
                </div>

                {/* Name & Character */}
                <div className="mt-2 w-full px-0.5">
                  <p className="text-xs sm:text-sm font-semibold text-[#f5f5f5] truncate group-hover:text-[#e50914] transition-colors">
                    {actor.name}
                  </p>
                  {actor.character && (
                    <p className="text-[11px] text-[#737373] truncate mt-0.5">
                      {actor.character}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : hasFallbackActors ? (
        <div className="space-y-2">
          <h3 className="text-xs sm:text-sm font-bold text-[#f5f5f5] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#e50914]" />
            <span>Diễn viên</span>
          </h3>
          <div className="flex flex-wrap gap-2 pt-1">
            {fallbackActors.map((actorName, idx) => (
              <span
                key={idx}
                className="text-xs bg-[#161616] border border-[#262626] text-[#d4d4d4] px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <User className="w-3 h-3 text-[#737373]" />
                {actorName}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
