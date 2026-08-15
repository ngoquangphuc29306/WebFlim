'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play, Info, Star, ChevronLeft, ChevronRight, Bookmark, Plus, Check, Flame } from 'lucide-react';
import { MovieCardModel } from '@/types/movie';
import { useWatchlist, toggleWatchlist } from '@/lib/utils/favorites';
import { useQuickPreview } from './QuickPreviewContext';
import MovieBadge from '@/components/ui/MovieBadge';
import MovieImage from '@/components/ui/MovieImage';

interface HeroBannerProps {
  movies: MovieCardModel[];
}

const SLIDE_DURATION = 8000;

export default function HeroBanner({ movies }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const { isSaved, isMounted } = useWatchlist();
  const { openPreview } = useQuickPreview();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth progress animation & timer
  useEffect(() => {
    if (!movies || movies.length <= 1) return;

    const stepTime = 50;
    const increment = (stepTime / SLIDE_DURATION) * 100;

    progressIntervalRef.current = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev >= 100) {
            setCurrentIndex((curr) => (curr + 1) % movies.length);
            return 0;
          }
          return prev + increment;
        });
      }
    }, stepTime);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, isPaused, movies]);

  if (!movies || movies.length === 0) return null;

  const current = movies[currentIndex];
  const saved = isMounted && isSaved(current.slug);

  const nextSlide = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const prevSlide = () => {
    setProgress(0);
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
  };

  const goToSlide = (idx: number) => {
    setProgress(0);
    setCurrentIndex(idx);
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

  const genreText =
    current.categories && current.categories.length > 0
      ? current.categories
          .slice(0, 3)
          .map((cat) => (typeof cat === 'string' ? cat : cat.name))
          .join(' • ')
      : null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full h-[72vh] min-h-[500px] sm:h-[75vh] sm:min-h-[540px] md:h-[78vh] lg:h-[84vh] lg:min-h-[620px] max-h-[900px] bg-[#141414] overflow-hidden text-white select-none group/hero"
    >
      {/* 1. Mobile Portrait Poster Background (< md) */}
      <div className="md:hidden absolute inset-0 z-0 overflow-hidden">
        <MovieImage
          src={current.posterUrl || current.thumbUrl}
          alt={current.title}
          title={current.title}
          priority
          fill
          aspectRatio="custom"
          className="w-full h-full object-cover object-top opacity-90 transition-all duration-700 ease-out motion-reduce:transition-none"
        />

        {/* Netflix Mobile Immersive Scrim Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 via-50% to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#141414]/90 via-[#141414]/40 to-transparent pointer-events-none" />
      </div>

      {/* 2. Desktop Landscape Backdrop Background (>= md) */}
      <div className="hidden md:block absolute inset-0 z-0">
        <MovieImage
          src={current.thumbUrl || current.posterUrl}
          alt={current.title}
          title={current.title}
          priority
          sizes="100vw"
          aspectRatio="backdrop"
          className="w-full h-full object-cover object-center opacity-75 scale-105 transition-all duration-700 ease-out motion-reduce:transition-none"
        />

        {/* Cinematic Multi-stage Scrim Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/75 via-45% to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 via-40% to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-[#141414]/90 via-[#141414]/40 to-transparent pointer-events-none" />
      </div>

      {/* ============================================================ */}
      {/* MOBILE HERO CONTENT (< md) - Classic Netflix App Mobile Layout */}
      {/* ============================================================ */}
      <div className="md:hidden relative h-full px-5 flex flex-col justify-end pb-8 z-20 items-center text-center">
        <div className="w-full max-w-sm space-y-3 animate-in fade-in duration-500">
          {/* Top 10 Today Badge */}
          {currentIndex < 10 && (
            <div className="inline-flex items-center gap-1.5 bg-[#e50914] text-white font-black px-2.5 py-0.5 rounded shadow-lg text-[11px] tracking-wider uppercase">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>TOP {currentIndex + 1} HÔM NAY</span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-lg line-clamp-2">
            {current.title}
          </h1>

          {/* Clean Dot-separated Categories */}
          {genreText && (
            <p className="text-xs text-[#d4d4d4] font-medium tracking-wide drop-shadow">
              {genreText}
            </p>
          )}

          {/* Netflix Mobile 3-Column Action Cluster */}
          <div className="flex items-center justify-around gap-4 pt-3 max-w-[320px] mx-auto">
            {/* 1. Left: My List (+) */}
            <button
              type="button"
              onClick={() => toggleWatchlist(current)}
              className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition-transform active:scale-90 cursor-pointer min-w-[64px]"
              aria-label={saved ? 'Đã lưu' : 'Thêm vào danh sách'}
            >
              <div className="w-7 h-7 flex items-center justify-center">
                {saved ? <Check className="w-6 h-6 text-[#e50914]" /> : <Plus className="w-6 h-6" />}
              </div>
              <span className="text-[11px] font-semibold tracking-tight">
                {saved ? 'Đã lưu' : 'Danh sách'}
              </span>
            </button>

            {/* 2. Center: Big White Play Button */}
            <Link
              href={`/xem-phim/${current.slug}`}
              className="flex-1 max-w-[140px] py-2.5 px-4 bg-white hover:bg-white/90 text-black font-extrabold text-sm rounded-md flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Phát</span>
            </Link>

            {/* 3. Right: Info (ⓘ) */}
            <button
              type="button"
              onClick={() => openPreview(current)}
              className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition-transform active:scale-90 cursor-pointer min-w-[64px]"
              aria-label="Xem thông tin chi tiết"
            >
              <div className="w-7 h-7 flex items-center justify-center">
                <Info className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold tracking-tight">Thông tin</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP HERO CONTENT (>= md) - Rich Cinematic Billboard */}
      {/* ============================================================ */}
      <div className="hidden md:flex relative max-w-[1920px] mx-auto h-full px-6 lg:px-8 xl:px-12 flex-col justify-end pb-16 sm:pb-20 lg:pb-24 z-20">
        <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-left-3 duration-500 motion-reduce:animate-none">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {currentIndex < 10 && (
              <div className="flex items-center gap-1.5 bg-[#e50914] text-white font-black px-2.5 py-1 rounded shadow-md tracking-wider uppercase text-[11px]">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>TOP {currentIndex + 1} HÔM NAY</span>
              </div>
            )}
            {current.quality && (
              <MovieBadge variant="quality" size="md">
                {current.quality}
              </MovieBadge>
            )}
            {current.language && (
              <span className="bg-[#242424]/90 border border-white/10 text-white font-semibold px-2.5 py-1 rounded text-xs">
                {current.language}
              </span>
            )}
            {current.year && (
              <span className="text-[#d4d4d4] font-semibold text-xs sm:text-sm">{current.year}</span>
            )}
            {current.rating && (
              <span className="flex items-center gap-1 text-amber-400 font-bold bg-black/60 px-2.5 py-1 rounded border border-amber-500/30 text-xs">
                <Star className="w-3.5 h-3.5 fill-current" />
                {current.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12] drop-shadow-lg line-clamp-2">
            {current.title}
          </h1>

          {/* Original Title */}
          {current.originalTitle && (
            <p className="text-sm md:text-base text-[#a3a3a3] font-medium tracking-wide line-clamp-1">
              {current.originalTitle}
            </p>
          )}

          {/* Categories */}
          {current.categories && current.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5">
              {current.categories.slice(0, 4).map((cat) => (
                <span
                  key={cat.slug}
                  className="text-xs text-[#e5e5e5] bg-[#222222]/80 border border-white/10 px-2.5 py-0.5 rounded-full font-medium"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 sm:pt-3">
            {/* 1. Play Button */}
            <Link
              href={`/xem-phim/${current.slug}`}
              className="px-6 py-2.5 sm:py-3 bg-white hover:bg-white/85 text-black font-bold text-sm sm:text-base rounded-lg flex items-center gap-2 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
              <span>Phát ngay</span>
            </Link>

            {/* 2. More Info Button */}
            <button
              type="button"
              onClick={() => openPreview(current)}
              className="px-5 py-2.5 sm:py-3 bg-zinc-600/70 hover:bg-zinc-600/90 text-white font-semibold text-sm sm:text-base rounded-lg backdrop-blur-md flex items-center gap-2 transition-all border border-white/10 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Info className="w-5 h-5" />
              <span>Thông tin khác</span>
            </button>

            {/* 3. Bookmark / Watchlist */}
            <button
              onClick={() => toggleWatchlist(current)}
              type="button"
              className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                saved
                  ? 'bg-[#e50914] border-[#e50914] text-white shadow-lg shadow-[#e50914]/30'
                  : 'bg-black/60 border-white/20 text-[#d4d4d4] hover:text-white hover:border-white hover:bg-white/10'
              }`}
              title={saved ? 'Đã lưu vào danh sách' : 'Lưu phim này'}
              aria-label={saved ? `Bỏ lưu phim ${current.title}` : `Lưu phim ${current.title}`}
            >
              <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop-Only Slider Controls & Mini-Thumbnails (Hidden on mobile) */}
      {movies.length > 1 && (
        <div className="hidden md:flex absolute bottom-4 sm:bottom-6 right-4 sm:right-6 lg:right-12 z-30 flex-col items-end gap-2.5">
          {/* Mini-Thumbnails Strip */}
          <div className="hidden xl:flex items-center gap-2 bg-[#141414]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
            {movies.slice(0, 5).map((m, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToSlide(idx)}
                className={`relative w-16 h-10 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'border-[#e50914] ring-2 ring-[#e50914]/50 scale-105'
                    : 'border-white/10 opacity-50 hover:opacity-100'
                }`}
                title={m.title}
              >
                <MovieImage
                  src={m.thumbUrl || m.posterUrl}
                  alt={m.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
                {currentIndex === idx && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-[#e50914]"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Desktop Controls and Indicator Dots */}
          <div className="flex items-center gap-1 sm:gap-2 bg-[#141414]/80 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
            <button
              onClick={prevSlide}
              type="button"
              className="flex min-w-[36px] min-h-[36px] p-1.5 rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
              aria-label="Phim trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Slide Indicators with Progress bar */}
            <div className="flex items-center gap-1.5 px-1">
              {movies.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className="p-1 flex items-center justify-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-sm"
                  aria-label={`Chuyển đến phim ${idx + 1}`}
                  aria-current={currentIndex === idx ? 'true' : undefined}
                >
                  <div
                    className={`h-1.5 rounded-full overflow-hidden transition-all duration-300 ${
                      currentIndex === idx ? 'w-8 bg-zinc-700' : 'w-2 bg-white/30 group-hover:bg-white/60'
                    }`}
                  >
                    {currentIndex === idx && (
                      <div
                        className="h-full bg-[#e50914] transition-all duration-75"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={nextSlide}
              type="button"
              className="flex min-w-[36px] min-h-[36px] p-1.5 rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
              aria-label="Phim tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
