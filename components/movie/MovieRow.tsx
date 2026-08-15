'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { MovieCardModel } from '@/types/movie';
import { useMovieUserData } from '@/hooks/useMovieUserData';
import MovieCard from './MovieCard';

interface MovieRowProps {
  title: string;
  movies: MovieCardModel[];
  viewAllHref?: string;
  icon?: React.ReactNode;
  deferRendering?: boolean;
}

export default function MovieRow({
  title,
  movies,
  viewAllHref,
  icon,
  deferRendering = false,
}: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { savedSlugSet, progressMap } = useMovieUserData();

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section
      className={`relative my-7 sm:my-9 lg:my-10 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1920px] mx-auto ${
        deferRendering ? '[content-visibility:auto] [contain-intrinsic-size:1px_420px]' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-[#e50914]">{icon}</span>}
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#f5f5f5] tracking-tight flex items-center gap-2">
            {title}
          </h2>
        </div>

        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#a3a3a3] hover:text-[#e50914] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded px-1.5 py-0.5 group/link"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>

      {/* Row Container with Navigation Arrows */}
      <div className="relative group/row">
        {/* Left Scroll Button */}
        <button
          onClick={() => scroll('left')}
          type="button"
          className="hidden sm:flex absolute -left-3 lg:-left-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#141414]/90 backdrop-blur-md border border-white/15 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 hover:scale-110 hover:bg-white hover:text-black active:scale-95 transition-all shadow-2xl focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] cursor-pointer"
          aria-label={`Cuộn sang trái phần ${title}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={rowRef}
          className="flex items-stretch gap-2.5 sm:gap-4 lg:gap-5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-2 sm:py-3 px-1"
        >
          {movies.map((movie) => (
            <div
              key={movie.slug}
              className="w-[115px] xs:w-[130px] sm:w-[155px] md:w-[180px] lg:w-[calc((100%-80px)/5)] shrink-0 snap-start"
            >
              <MovieCard
                movie={movie}
                isSaved={savedSlugSet.has(movie.slug)}
                progressPercent={progressMap.get(movie.slug) || 0}
              />
            </div>
          ))}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => scroll('right')}
          type="button"
          className="hidden sm:flex absolute -right-3 lg:-right-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#141414]/90 backdrop-blur-md border border-white/15 text-white items-center justify-center opacity-0 group-hover/row:opacity-100 hover:scale-110 hover:bg-white hover:text-black active:scale-95 transition-all shadow-2xl focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] cursor-pointer"
          aria-label={`Cuộn sang phải phần ${title}`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
