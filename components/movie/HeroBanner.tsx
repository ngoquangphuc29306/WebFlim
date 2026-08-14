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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

  // Swipe gesture handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[58vh] min-h-[420px] sm:h-[68vh] sm:min-h-[500px] lg:h-[76vh] lg:min-h-[560px] max-h-[780px] bg-[#080808] overflow-hidden text-white select-none"
    >
      {/* Background Backdrop Image */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <MovieImage
          src={current.thumbUrl || current.posterUrl}
          alt={current.title}
          title={current.title}
          priority
          sizes="100vw"
          aspectRatio="backdrop"
          className="w-full h-full object-cover object-center opacity-65 scale-105 transition-all duration-700 ease-out motion-reduce:transition-none"
        />

        {/* Cinematic Multi-directional Scrim */}
        {/* Left-to-right directional scrim for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/95 via-[#080808]/65 via-50% to-transparent pointer-events-none" />

        {/* Bottom-to-top gradient for seamless page blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/75 via-35% to-transparent pointer-events-none" />

        {/* Top subtle vignette for header contrast */}
        <div className="absolute top-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-b from-[#080808]/80 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-[1920px] mx-auto h-full px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col justify-end pb-12 sm:pb-16 lg:pb-20 z-20">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-left-3 duration-500 motion-reduce:animate-none">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {current.quality && (
              <MovieBadge variant="accent" size="md">
                {current.quality}
              </MovieBadge>
            )}
            {current.language && (
              <MovieBadge variant="secondary" size="md" className="bg-[#181818]/90 border border-[#2a2a2a] backdrop-blur-xs">
                {current.language}
              </MovieBadge>
            )}
            {current.year && (
              <span className="text-[#a3a3a3] font-medium text-xs sm:text-sm">{current.year}</span>
            )}
            {current.rating && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold bg-black/60 px-2 py-0.5 rounded-md border border-amber-500/30 text-xs">
                <Star className="w-3.5 h-3.5 fill-current" />
                {current.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#f5f5f5] leading-[1.15] drop-shadow-md line-clamp-2">
            {current.title}
          </h1>

          {/* Original Title */}
          {current.originalTitle && (
            <p className="text-xs sm:text-sm md:text-base text-[#a3a3a3] font-medium tracking-wide line-clamp-1">
              {current.originalTitle}
            </p>
          )}

          {/* Categories */}
          {current.categories && current.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5">
              {current.categories.slice(0, 4).map((cat) => (
                <span
                  key={cat.slug}
                  className="text-xs text-[#d4d4d4] bg-[#141414]/90 border border-[#2a2a2a] px-2.5 py-0.5 rounded-full"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2 sm:pt-3">
            <MovieButton
              variant="primary"
              size="lg"
              icon={<Play className="w-5 h-5 fill-current" />}
              href={`/xem-phim/${current.slug}`}
              className="min-h-[44px] shadow-sm"
            >
              Xem ngay
            </MovieButton>

            <MovieButton
              variant="secondary"
              size="lg"
              icon={<Info className="w-5 h-5" />}
              href={`/phim/${current.slug}`}
              className="min-h-[44px]"
            >
              Chi tiết
            </MovieButton>

            <button
              onClick={() => toggleWatchlist(current)}
              type="button"
              className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                saved
                  ? 'bg-[#e50914] border-[#e50914] text-white'
                  : 'bg-[#181818]/90 border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:bg-[#222222]'
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
        <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 lg:right-12 z-30 flex items-center gap-1 sm:gap-2">
          <button
            onClick={prevSlide}
            type="button"
            className="hidden sm:flex min-w-[44px] min-h-[44px] p-2.5 rounded-full bg-[#121212]/80 hover:bg-[#1e1e1e] text-[#f5f5f5] border border-[#2a2a2a] hover:border-[#e50914] transition-all hover:scale-105 active:scale-95 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
            aria-label="Phim trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Slide Indicator Dots with 44px touch targets */}
          <div className="flex items-center">
            {movies.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className="min-w-[36px] sm:min-w-[44px] min-h-[44px] p-2 flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-lg"
                aria-label={`Chuyển đến phim ${idx + 1}`}
                aria-current={currentIndex === idx ? 'true' : undefined}
              >
                <span
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentIndex === idx
                      ? 'w-7 bg-[#e50914]'
                      : 'w-2 bg-white/30 group-hover:bg-white/60'
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            onClick={nextSlide}
            type="button"
            className="hidden sm:flex min-w-[44px] min-h-[44px] p-2.5 rounded-full bg-[#121212]/80 hover:bg-[#1e1e1e] text-[#f5f5f5] border border-[#2a2a2a] hover:border-[#e50914] transition-all hover:scale-105 active:scale-95 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
            aria-label="Phim tiếp theo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
