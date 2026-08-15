import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { getMovieDetail, getMoviesByGenre, getLatestMovies } from '@/lib/api/movies';
import { MovieCardModel } from '@/types/movie';
import VideoPlayer from '@/components/player/VideoPlayer';
import EpisodeSelector from '@/components/movie/EpisodeSelector';
import { normalizeServerIndex, resolveEpisodeForServer } from '@/components/movie/episode-selection';
import MovieRow from '@/components/movie/MovieRow';
import { Info, Calendar, Star, Users, ChevronLeft, Film } from 'lucide-react';

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
    title: `Xem Phim ${movie.title} ${epTitle} Vietsub | PHEVO`,
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
  const requestedServerIndex = server === undefined ? 0 : Number(server);
  const validServerIndex = normalizeServerIndex(requestedServerIndex, servers.length);

  const currentServerGroup = servers[validServerIndex] || servers[0];
  const episodeList = currentServerGroup?.items || [];

  const activeEpisode = resolveEpisodeForServer({
    requestedEpisodeSlug: ep,
    targetEpisodes: episodeList,
  });

  const serverNeedsCanonicalization =
    server !== undefined &&
    (requestedServerIndex !== validServerIndex || server !== String(validServerIndex));
  const episodeNeedsCanonicalization =
    activeEpisode !== null && activeEpisode.slug !== ep;

  if (serverNeedsCanonicalization || episodeNeedsCanonicalization) {
    const query = new URLSearchParams();
    if (activeEpisode) {
      query.set('ep', activeEpisode.slug);
    }
    query.set('server', String(validServerIndex));
    redirect(`/xem-phim/${movie.slug}?${query.toString()}`);
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

  const displayEpisodeName = activeEpisode?.name?.trim() || 'Full';
  const formattedEpLabel = displayEpisodeName.toLowerCase().startsWith('tập')
    ? displayEpisodeName
    : `Tập ${displayEpisodeName}`;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-6 pb-16">
      {/* Top Utility Bar & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-[#a3a3a3] overflow-hidden whitespace-nowrap">
          <Link
            href={`/phim/${movie.slug}`}
            className="flex items-center gap-1 min-h-[36px] px-2.5 py-1 rounded-lg bg-[#141414] border border-[#262626] text-white hover:text-[#e50914] hover:border-[#e50914] transition-colors shrink-0"
            title="Quay lại trang chi tiết phim"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px] sm:text-xs">Chi tiết</span>
          </Link>

          <span className="text-[#3a3a3a] shrink-0">/</span>

          <Link href="/" className="hover:text-white transition-colors shrink-0 hidden xs:inline">
            Trang chủ
          </Link>
          <span className="text-[#3a3a3a] shrink-0 hidden xs:inline">/</span>

          <Link
            href={`/phim/${movie.slug}`}
            className="hover:text-white transition-colors truncate max-w-[120px] xs:max-w-[200px] sm:max-w-sm text-[#d4d4d4]"
          >
            {movie.title}
          </Link>
          <span className="text-[#3a3a3a] shrink-0">/</span>
          <span className="text-white font-bold shrink-0">{formattedEpLabel}</span>
        </div>

        {/* Quick info badges */}
        <div className="hidden sm:flex items-center gap-2 text-xs">
          {movie.quality && (
            <span className="bg-[#181818] border border-[#2a2a2a] text-[#f5f5f5] text-[11px] font-bold px-2.5 py-1 rounded-lg">
              {movie.quality}
            </span>
          )}
          {movie.year && (
            <span className="bg-[#141414] border border-[#262626] text-[#a3a3a3] text-[11px] font-medium px-2.5 py-1 rounded-lg">
              {movie.year}
            </span>
          )}
          {movie.rating && (
            <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold px-2 py-1 rounded-lg">
              <Star className="w-3 h-3 fill-current" />
              {movie.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Embedded Video Player */}
      <VideoPlayer
        embedUrl={activeEpisode?.embedUrl || ''}
        m3u8Url={activeEpisode?.m3u8Url}
        movieSlug={movie.slug}
        movieTitle={movie.title}
        movieOriginalTitle={movie.originalTitle}
        quality={movie.quality}
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

      {/* Movie Information & Plot Section */}
      <div className="bg-[#101010] border border-[#1f1f1f] p-4 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#e50914]" />
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {movie.title}
            </h2>
            {movie.originalTitle && (
              <span className="text-xs text-[#737373] hidden md:inline truncate max-w-xs">
                ({movie.originalTitle})
              </span>
            )}
          </div>

          <Link
            href={`/phim/${movie.slug}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#a3a3a3] hover:text-[#e50914] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded"
          >
            <Info className="w-3.5 h-3.5 text-[#e50914]" />
            <span>Trang chi tiết phim</span>
          </Link>
        </div>

        {/* Synopsis text */}
        <p className="text-xs sm:text-sm text-[#a3a3a3] leading-relaxed max-w-5xl whitespace-pre-line">
          {movie.synopsis || 'Đang cập nhật tóm tắt phim.'}
        </p>

        {/* Categories & Cast tags */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs">
          {movie.categories && movie.categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#737373] font-bold uppercase tracking-wider text-[11px]">
                Thể loại:
              </span>
              {movie.categories.slice(0, 5).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/the-loai/${cat.slug}`}
                  className="bg-[#161616] border border-[#262626] hover:border-[#e50914] text-[#d4d4d4] hover:text-white px-2.5 py-1 rounded-lg text-xs transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {movie.actors && movie.actors.length > 0 && (
            <div className="flex items-center gap-1.5 text-[#737373] truncate">
              <Users className="w-3.5 h-3.5 text-[#e50914] shrink-0" />
              <span className="truncate">
                Diễn viên: <strong className="text-[#d4d4d4] font-normal">{movie.actors.slice(0, 6).join(', ')}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Related Movies Rail */}
      {relatedMovies.length > 0 && (
        <div className="pt-2">
          <MovieRow
            title="Phim Đề Xuất Cùng Thể Loại"
            movies={relatedMovies.slice(0, 12)}
          />
        </div>
      )}
    </div>
  );
}
