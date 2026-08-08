'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play,
  Star,
  Bookmark,
  Share2,
  Calendar,
  Clock,
  Eye,
  Film,
  Users,
  Tv,
  ChevronDown,
  ChevronUp,
  Server,
  Layers,
} from 'lucide-react';
import { MovieDetailModel } from '@/types/movie';
import { useWatchlist, toggleWatchlist } from '@/lib/utils/favorites';
import MovieImage from '@/components/ui/MovieImage';

interface MovieDetailsProps {
  movie: MovieDetailModel;
}

export default function MovieDetails({ movie }: MovieDetailsProps) {
  const { isSaved, isMounted } = useWatchlist();
  const saved = isMounted && isSaved(movie.slug);
  const [copied, setCopied] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [activeChunkIdx, setActiveChunkIdx] = useState(0);
  const [showStickyCta, setShowStickyCta] = useState(false);

  // Monitor scroll for mobile sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowStickyCta(true);
      } else {
        setShowStickyCta(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter valid actors & directors
  const validActors = (movie.actors || []).filter(
    (a) => a && a !== 'N/A' && a !== 'Đang cập nhật' && a !== 'undefined' && a.trim().length > 0
  );
  const validDirectors = (movie.directors || []).filter(
    (d) => d && d !== 'N/A' && d !== 'Đang cập nhật' && d !== 'undefined' && d.trim().length > 0
  );

  const totalEpisodes = movie.episodes.reduce((acc, srv) => acc + srv.items.length, 0);
  const activeServer = movie.episodes[activeServerIdx] || movie.episodes[0];
  const activeEpisodes = activeServer?.items || [];
  const firstEpisode = activeEpisodes[0];

  // Episode Range Chunks (for 50+ episodes)
  const CHUNK_SIZE = 50;
  const numChunks = Math.ceil(activeEpisodes.length / CHUNK_SIZE);
  const currentChunkEpisodes = activeEpisodes.slice(
    activeChunkIdx * CHUNK_SIZE,
    (activeChunkIdx + 1) * CHUNK_SIZE
  );

  const longSynopsis = (movie.synopsis || '').length > 220;

  return (
    <div className="relative text-white min-h-screen pb-16">
      {/* Backdrop Image Banner */}
      <div className="relative w-full h-[55vh] min-h-[400px] max-h-[600px] bg-[#080808] overflow-hidden">
        <MovieImage
          src={movie.thumbUrl || movie.posterUrl}
          alt={movie.title}
          title={movie.title}
          priority
          sizes="100vw"
          aspectRatio="backdrop"
          className="w-full h-full object-cover object-center opacity-40 blur-sm scale-105"
        />
        {/* Blending Gradients */}
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-overlay-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent pointer-events-none" />
      </div>

      {/* Main Content Info Overlay */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-56 sm:-mt-72 md:-mt-80 z-20">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
          {/* Poster Column */}
          <div className="w-48 sm:w-64 md:w-72 shrink-0 mx-auto md:mx-0">
            <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#141414] border-2 border-[#2a2a2a] shadow-2xl group">
              <MovieImage
                src={movie.posterUrl}
                alt={movie.title}
                title={movie.title}
                priority
                sizes="(max-width: 768px) 256px, 288px"
                aspectRatio="poster"
                className="w-full h-full object-cover"
              />
              {movie.quality && (
                <span className="absolute top-3 left-3 bg-[#e50914] text-white text-xs font-bold px-2 py-1 rounded shadow">
                  {movie.quality}
                </span>
              )}
              {movie.episodeCurrent && (
                <span className="absolute top-3 right-3 bg-[#080808]/85 backdrop-blur text-white text-xs font-semibold px-2 py-1 rounded border border-[#333]">
                  {movie.episodeCurrent}
                </span>
              )}
            </div>

            {/* Action Buttons under Poster */}
            <div className="mt-4 flex flex-col gap-2.5">
              <Link
                href={`/xem-phim/${movie.slug}${firstEpisode ? `?ep=${firstEpisode.slug}&server=${activeServerIdx}` : ''}`}
                className="w-full flex items-center justify-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-[#e50914]/25 transition-all hover:scale-[1.02] active:scale-98 text-center"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
                <span>Xem Phim Ngay</span>
              </Link>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleWatchlist(movie)}
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    saved
                      ? 'bg-[#e50914] border-[#e50914] text-white'
                      : 'bg-[#141414] border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:bg-[#1f1f1f]'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  <span>{saved ? 'Đã lưu' : 'Yêu thích'}</span>
                </button>

                <button
                  onClick={handleShare}
                  type="button"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#141414] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white hover:bg-[#1f1f1f] text-xs font-semibold transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copied ? 'Đã chép!' : 'Chia sẻ'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Details Info Column */}
          <div className="flex-1 space-y-5 pt-2 w-full">
            <div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#f5f5f5] tracking-tight leading-tight">
                {movie.title}
              </h1>
              {movie.originalTitle && (
                <p className="text-base sm:text-lg text-[#a3a3a3] font-medium mt-1">
                  {movie.originalTitle}
                </p>
              )}
            </div>

            {/* Quick Metadata Stats */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-[#d4d4d4]">
              {movie.rating && movie.rating > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-3 py-1 rounded-lg">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{movie.rating.toFixed(1)} / 10</span>
                  {movie.voteCount && (
                    <span className="text-[11px] text-[#a3a3a3] font-normal">
                      ({movie.voteCount} vote)
                    </span>
                  )}
                </div>
              )}

              {movie.year && (
                <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1 rounded-lg">
                  <Calendar className="w-4 h-4 text-[#a3a3a3]" />
                  <span>{movie.year}</span>
                </div>
              )}

              {movie.duration && (
                <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1 rounded-lg">
                  <Clock className="w-4 h-4 text-[#a3a3a3]" />
                  <span>{movie.duration}</span>
                </div>
              )}

              {movie.views !== undefined && movie.views > 0 && (
                <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1 rounded-lg">
                  <Eye className="w-4 h-4 text-[#a3a3a3]" />
                  <span>{movie.views.toLocaleString()} lượt xem</span>
                </div>
              )}

              {movie.language && (
                <div className="bg-[#1c1c1c] border border-[#333] px-2.5 py-1 rounded-lg text-xs font-semibold text-[#e50914]">
                  {movie.language}
                </div>
              )}
            </div>

            {/* Categories & Countries */}
            <div className="space-y-2 pt-1">
              {movie.categories && movie.categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#737373] font-semibold">Thể loại:</span>
                  {movie.categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/the-loai/${cat.slug}`}
                      className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e50914] text-[#d4d4d4] hover:text-white px-2.5 py-1 rounded-md transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}

              {movie.countries && movie.countries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#737373] font-semibold">Quốc gia:</span>
                  {movie.countries.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/quoc-gia/${c.slug}`}
                      className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#e50914] text-[#d4d4d4] hover:text-white px-2.5 py-1 rounded-md transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Synopsis */}
            <div className="bg-[#101010] border border-[#222] p-4 sm:p-6 rounded-2xl space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Film className="w-4 h-4 text-[#e50914]" />
                Nội dung phim
              </h3>
              <div className="relative">
                <p
                  className={`text-xs sm:text-sm text-[#a3a3a3] leading-relaxed whitespace-pre-line transition-all ${
                    !synopsisExpanded && longSynopsis ? 'line-clamp-4' : ''
                  }`}
                >
                  {movie.synopsis || 'Nội dung phim đang được cập nhật.'}
                </p>
                {longSynopsis && (
                  <button
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    type="button"
                    className="mt-2 text-xs font-semibold text-[#e50914] hover:text-[#f40612] flex items-center gap-1 focus:outline-none"
                  >
                    <span>{synopsisExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                    {synopsisExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Directors & Cast */}
            {(validDirectors.length > 0 || validActors.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {validDirectors.length > 0 && (
                  <div className="bg-[#101010] border border-[#222] p-4 rounded-xl space-y-1">
                    <span className="text-xs font-semibold text-[#737373] uppercase">Đạo diễn</span>
                    <p className="text-sm font-medium text-white">{validDirectors.join(', ')}</p>
                  </div>
                )}

                {validActors.length > 0 && (
                  <div className="bg-[#101010] border border-[#222] p-4 rounded-xl space-y-1">
                    <span className="text-xs font-semibold text-[#737373] uppercase flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#e50914]" />
                      Diễn viên
                    </span>
                    <p className="text-xs sm:text-sm text-[#d4d4d4] leading-relaxed line-clamp-3">
                      {validActors.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Episode List Preview & Selector */}
            {movie.episodes && movie.episodes.length > 0 && (
              <div className="bg-[#101010] border border-[#222] p-4 sm:p-6 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f1f1f] pb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Tv className="w-4 h-4 text-[#e50914]" />
                    Danh sách tập ({totalEpisodes} tập)
                  </h3>

                  {/* Server Selection Tabs */}
                  {movie.episodes.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-[#737373] mr-1 flex items-center gap-1">
                        <Server className="w-3 h-3 text-[#e50914]" /> Server:
                      </span>
                      {movie.episodes.map((srv, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveServerIdx(idx);
                            setActiveChunkIdx(0);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            activeServerIdx === idx
                              ? 'bg-[#e50914] text-white'
                              : 'bg-[#181818] border border-[#2a2a2a] text-[#a3a3a3] hover:text-white'
                          }`}
                        >
                          {srv.serverName || `Server #${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Episode Chunk Tabs for Large Series (>50 eps) */}
                {numChunks > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-[#737373] mr-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#e50914]" /> Chọn khoảng tập:
                    </span>
                    {Array.from({ length: numChunks }).map((_, cIdx) => {
                      const startEp = cIdx * CHUNK_SIZE + 1;
                      const endEp = Math.min((cIdx + 1) * CHUNK_SIZE, activeEpisodes.length);
                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => setActiveChunkIdx(cIdx)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            activeChunkIdx === cIdx
                              ? 'bg-[#262626] border border-[#e50914] text-white'
                              : 'bg-[#141414] border border-[#222] text-[#a3a3a3] hover:text-white'
                          }`}
                        >
                          {startEp} - {endEp}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Episode Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {currentChunkEpisodes.map((ep) => (
                    <Link
                      key={ep.slug}
                      href={`/xem-phim/${movie.slug}?ep=${ep.slug}&server=${activeServerIdx}`}
                      className="py-2 px-1 text-center bg-[#181818] border border-[#262626] hover:border-[#e50914] hover:bg-[#e50914] text-xs font-medium text-white rounded-lg transition-colors truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                    >
                      Tập {ep.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom CTA Bar */}
      {showStickyCta && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0c]/95 backdrop-blur-md border-t border-[#262626] p-3 md:hidden flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 shadow-2xl">
          <Link
            href={`/xem-phim/${movie.slug}${firstEpisode ? `?ep=${firstEpisode.slug}&server=${activeServerIdx}` : ''}`}
            className="flex-1 flex items-center justify-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-[#e50914]/30"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>Xem Phim Ngay</span>
          </Link>

          <button
            onClick={() => toggleWatchlist(movie)}
            type="button"
            className={`p-3 rounded-xl border transition-all ${
              saved
                ? 'bg-[#e50914] border-[#e50914] text-white'
                : 'bg-[#181818] border-[#2a2a2a] text-[#a3a3a3]'
            }`}
            aria-label={saved ? 'Bỏ lưu' : 'Lưu phim'}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
}
