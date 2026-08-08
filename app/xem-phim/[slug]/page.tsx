import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { getMovieDetail, getMoviesByGenre, getLatestMovies } from '@/lib/api/vsmov';
import { MovieCardModel } from '@/types/movie';
import VideoPlayer from '@/components/player/VideoPlayer';
import EpisodeSelector from '@/components/movie/EpisodeSelector';
import MovieRow from '@/components/movie/MovieRow';
import { Info, Calendar, Star, Users } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ep?: string; server?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { ep } = await searchParams;
  const { movie } = await getMovieDetail(slug);

  if (!movie) {
    return { title: 'Xem phim - PHEVO Stream' };
  }

  const epTitle = ep ? `Tập ${ep.replace('tap-', '')}` : '';

  return {
    title: `Xem Phim ${movie.title} ${epTitle} HD Vietsub | PHEVO`,
    description: `Xem phim ${movie.title} ${epTitle} vietsub thuyết minh tốc độ cao không giật lag trên PHEVO.`,
  };
}

export default async function WatchMoviePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { ep, server } = await searchParams;

  const { movie } = await getMovieDetail(slug);

  if (!movie) {
    notFound();
  }

  const servers = movie.episodes || [];
  const serverIndex = server ? parseInt(server, 10) : 0;
  const validServerIndex = !isNaN(serverIndex) && serverIndex < servers.length ? serverIndex : 0;

  const currentServerGroup = servers[validServerIndex] || servers[0];
  const episodeList = currentServerGroup?.items || [];

  // Find requested episode or default to first
  let activeEpisode = episodeList.find((e) => e.slug === ep) || episodeList[0];

  if (!activeEpisode && episodeList.length > 0) {
    activeEpisode = episodeList[0];
  }

  // Find next episode in sequence
  const activeEpIndex = episodeList.findIndex((e) => e.slug === activeEpisode?.slug);
  const nextEp = activeEpIndex >= 0 && activeEpIndex < episodeList.length - 1 ? episodeList[activeEpIndex + 1] : null;

  // Fetch related content
  let relatedMovies: MovieCardModel[] = [];
  if (movie.categories && movie.categories.length > 0) {
    const firstCat = movie.categories[0].slug;
    const catRes = await getMoviesByGenre(firstCat, 1);
    relatedMovies = catRes.items.filter((m) => m.slug !== movie.slug);
  }

  if (relatedMovies.length < 5) {
    const fallbackRes = await getLatestMovies(1);
    const extra = fallbackRes.items.filter(
      (m) => m.slug !== movie.slug && !relatedMovies.some((r) => r.slug === m.slug)
    );
    relatedMovies = [...relatedMovies, ...extra];
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-6">
      {/* Title & Navigation Breadcrumb */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[#a3a3a3] overflow-hidden whitespace-nowrap">
          <Link href="/" className="hover:text-white transition-colors shrink-0">
            Trang chủ
          </Link>
          <span className="text-[#525252] shrink-0">/</span>
          <Link href={`/phim/${movie.slug}`} className="hover:text-white transition-colors truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs">
            {movie.title}
          </Link>
          <span className="text-[#525252] shrink-0">/</span>
          <span className="text-white font-medium shrink-0">Tập {activeEpisode?.name || 'Full'}</span>
        </div>

        <h1 className="text-base sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight pt-0.5 leading-snug line-clamp-2">
          {movie.title} <span className="text-[#e50914] text-sm sm:text-xl font-bold">— Tập {activeEpisode?.name || 'Full'}</span>
        </h1>
      </div>

      {/* Embedded Video Player */}
      <VideoPlayer
        embedUrl={activeEpisode?.embedUrl || ''}
        m3u8Url={activeEpisode?.m3u8Url}
        movieSlug={movie.slug}
        movieTitle={movie.title}
        posterUrl={movie.posterUrl}
        episodeName={activeEpisode?.name || 'Full'}
        episodeSlug={activeEpisode?.slug || 'tap-full'}
        serverName={currentServerGroup?.serverName || 'Vietsub'}
        serverIndex={validServerIndex}
        nextEpisodeSlug={nextEp?.slug}
        nextEpisodeName={nextEp?.name}
      />

      {/* Episode & Server Selection Controls */}
      {servers.length > 0 && (
        <EpisodeSelector
          servers={servers}
          currentServerIndex={validServerIndex}
          currentEpisodeSlug={activeEpisode?.slug || ''}
          movieSlug={movie.slug}
        />
      )}

      {/* Movie Information & Plot Card */}
      <div className="bg-[#101010] border border-[#222] p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <Link
              href={`/phim/${movie.slug}`}
              className="flex items-center gap-2 text-sm font-bold text-white hover:text-[#e50914] transition-colors"
            >
              <Info className="w-4 h-4 text-[#e50914]" />
              <span>Xem thông tin phim chi tiết</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#a3a3a3]">
            {movie.rating && (
              <span className="flex items-center gap-1 text-amber-400 font-bold bg-black/40 px-2.5 py-1 rounded border border-amber-500/20">
                <Star className="w-3.5 h-3.5 fill-current" />
                {movie.rating.toFixed(1)}
              </span>
            )}
            {movie.year && (
              <span className="flex items-center gap-1 bg-[#181818] px-2.5 py-1 rounded border border-[#262626]">
                <Calendar className="w-3.5 h-3.5" />
                {movie.year}
              </span>
            )}
            {movie.quality && (
              <span className="bg-[#e50914] text-white font-bold px-2 py-1 rounded">
                {movie.quality}
              </span>
            )}
          </div>
        </div>

        {/* Synopsis text */}
        <p className="text-xs sm:text-sm text-[#a3a3a3] leading-relaxed">
          {movie.synopsis || 'Đang cập nhật tóm tắt phim.'}
        </p>

        {movie.actors && movie.actors.length > 0 && (
          <div className="pt-2 text-xs text-[#a3a3a3] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#e50914] shrink-0" />
            <span className="truncate">
              Diễn viên: <strong className="text-white font-normal">{movie.actors.slice(0, 8).join(', ')}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Related Movies Rail */}
      {relatedMovies.length > 0 && (
        <MovieRow
          title="Phim Khuyên Xem Khác"
          movies={relatedMovies.slice(0, 12)}
        />
      )}
    </div>
  );
}
