'use client';

import React, { useState, useEffect } from 'react';
import { Play, Info, Star, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { MovieCardModel } from '@/types/movie';
import { useWatchlist, toggleWatchlist } from '@/lib/utils/favorites';
import MovieBadge from '@/components/ui/MovieBadge';
import MovieButton from '@/components/ui/MovieButton';
import MovieImage from '@/components/ui/MovieImage';

interface HeroBannerProps {
  movies: MovieCardModel[];
}

export default function HeroBanner({ movies }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isSaved, isMounted } = useWatchlist();

  useEffect(() => {
    if (!movies || movies.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [movies]);

  if (!movies || movies.length === 0) return null;

  const current = movies[currentIndex];
  const saved = isMounted && isSaved(current.slug);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
  };

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] max-h-[750px] bg-[#080808] overflow-hidden text-white border-b border-[#1f1f1f]">
      {/* Background Backdrop Image */}
      <div className="absolute inset-0 z-0">
        <MovieImage
          src={current.thumbUrl || current.posterUrl}
          alt={current.title}
          title={current.title}
          priority
          sizes="100vw"
          aspectRatio="backdrop"
          className="w-full h-full object-cover object-center opacity-60 scale-105 transition-all duration-700 ease-out"
        />
        {/* Blending Gradients */}
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-overlay-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-[1920px] mx-auto h-full px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col justify-end pb-12 sm:pb-16 z-20">
        <div className="max-w-2xl space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {current.quality && (
              <MovieBadge variant="accent" size="md">
                {current.quality}
              </MovieBadge>
            )}
            {current.language && (
              <MovieBadge variant="secondary" size="md" className="bg-[#1f1f1f]/80 backdrop-blur-sm">
                {current.language}
              </MovieBadge>
            )}
            {current.year && (
              <span className="text-[#a3a3a3] font-medium text-xs sm:text-sm">{current.year}</span>
            )}
            {current.rating && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold bg-black/50 px-2 py-0.5 rounded border border-amber-500/30 text-xs">
                <Star className="w-3.5 h-3.5 fill-current" />
                {current.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#f5f5f5] leading-tight drop-shadow-md">
            {current.title}
          </h1>

          {/* Original Title */}
          {current.originalTitle && (
            <p className="text-sm sm:text-base text-[#a3a3a3] font-medium tracking-wide">
              {current.originalTitle}
            </p>
          )}

          {/* Categories */}
          {current.categories && current.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {current.categories.slice(0, 3).map((cat) => (
                <span
                  key={cat.slug}
                  className="text-xs text-[#d4d4d4] bg-[#1a1a1a]/80 border border-[#2a2a2a] px-2.5 py-0.5 rounded-full"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <MovieButton
              variant="primary"
              size="lg"
              icon={<Play className="w-5 h-5 fill-current" />}
              href={`/xem-phim/${current.slug}`}
            >
              Xem ngay
            </MovieButton>

            <MovieButton
              variant="secondary"
              size="lg"
              icon={<Info className="w-5 h-5" />}
              href={`/phim/${current.slug}`}
            >
              Chi tiết
            </MovieButton>

            <button
              onClick={() => toggleWatchlist(current)}
              type="button"
              className={`p-3 rounded-lg border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                saved
                  ? 'bg-[#e50914] border-[#e50914] text-white'
                  : 'bg-[#1a1a1a]/80 border-[#333333] text-[#a3a3a3] hover:text-white hover:bg-[#282828]'
              }`}
              title={saved ? 'Đã lưu vào danh sách' : 'Lưu phim này'}
              aria-label={saved ? `Bỏ lưu phim ${current.title}` : `Lưu phim ${current.title}`}
            >
              <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      {movies.length > 1 && (
        <div className="absolute bottom-6 right-6 sm:right-12 z-30 flex items-center gap-3">
          <button
            onClick={prevSlide}
            type="button"
            className="p-2.5 rounded-full bg-[#121212]/80 hover:bg-[#1a1a1a] text-white border border-[#2a2a2a] transition-all hover:scale-110 active:scale-95 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {movies.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                  currentIndex === idx ? 'w-6 bg-[#e50914]' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            type="button"
            className="p-2.5 rounded-full bg-[#121212]/80 hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a] transition-all hover:scale-110 active:scale-95 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
