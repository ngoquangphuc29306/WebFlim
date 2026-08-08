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
}

export default function MovieRow({ title, movies, viewAllHref, icon }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { savedSlugSet, progressMap } = useMovieUserData();

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="relative my-8 sm:my-10 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-[#e50914]">{icon}</span>}
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#f5f5f5] tracking-tight flex items-center gap-2">
            {title}
          </h2>
        </div>

        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#a3a3a3] hover:text-[#e50914] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded px-1 group/link"
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
          className="hidden sm:flex absolute -left-3 lg:-left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#121212]/90 border border-[#2a2a2a] text-[#f5f5f5] items-center justify-center opacity-0 group-hover/row:opacity-100 hover:scale-110 hover:border-[#e50914] active:scale-95 transition-all shadow-2xl focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          aria-label={`Cuộn sang trái phần ${title}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={rowRef}
          className="flex items-stretch gap-3 sm:gap-4 lg:gap-5 overflow-x-auto no-scrollbar scroll-smooth py-2 px-0.5"
        >
          {movies.map((movie) => (
            <div
              key={movie.slug}
              className="w-[135px] sm:w-[165px] md:w-[185px] lg:w-[205px] xl:w-[220px] shrink-0"
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
          className="hidden sm:flex absolute -right-3 lg:-right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#121212]/90 border border-[#2a2a2a] text-[#f5f5f5] items-center justify-center opacity-0 group-hover/row:opacity-100 hover:scale-110 hover:border-[#e50914] active:scale-95 transition-all shadow-2xl focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
          aria-label={`Cuộn sang phải phần ${title}`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
