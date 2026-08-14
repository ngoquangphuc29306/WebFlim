import React from 'react';
import { getHomepageData, getGenresList } from '@/lib/api/movies';
import HeroBanner from '@/components/movie/HeroBanner';
import MovieRow from '@/components/movie/MovieRow';
import RecentHistoryRow from '@/components/movie/RecentHistoryRow';
import Link from 'next/link';
import { Flame, Film, Tv, Sparkles, Tag, Clapperboard } from 'lucide-react';

export const revalidate = 60;

export default async function HomePage() {
  const [data, genres] = await Promise.all([
    getHomepageData(),
    getGenresList(),
  ]);

  const { heroMovies, latestMovies, singleMovies, seriesMovies, subteamMovies, hoathinhMovies } = data;

  return (
    <div className="-mt-16 sm:-mt-20 space-y-6 sm:space-y-8 pb-16">
      {/* Featured Hero Banner */}
      <HeroBanner movies={heroMovies} />

      {/* Continuation / Watch History Rail (Client Only) */}
      <RecentHistoryRow />

      {/* Latest Updated Movies */}
      <MovieRow
        title="Phim Mới Cập Nhật"
        movies={latestMovies}
        viewAllHref="/danh-sach/phim-moi"
        icon={<Flame className="w-5 h-5 fill-current" />}
      />

      {/* Single Feature Movies */}
      <MovieRow
        title="Phim Lẻ Đặc Sắc"
        movies={singleMovies}
        viewAllHref="/danh-sach/phim-le"
        icon={<Film className="w-5 h-5" />}
        deferRendering
      />

      {/* Popular Series */}
      <MovieRow
        title="Phim Bộ Hay Nhất"
        movies={seriesMovies}
        viewAllHref="/danh-sach/phim-bo"
        icon={<Tv className="w-5 h-5" />}
        deferRendering
      />

      {/* Subteam Vietsub */}
      <MovieRow
        title="Tuyển Tập Vietsub Subteam"
        movies={subteamMovies}
        viewAllHref="/danh-sach/subteam"
        icon={<Sparkles className="w-5 h-5" />}
        deferRendering
      />

      {/* Anime & Animation */}
      <MovieRow
        title="Phim Hoạt Hình & Anime"
        movies={hoathinhMovies}
        viewAllHref="/the-loai/hoat-hinh"
        icon={<Clapperboard className="w-5 h-5" />}
        deferRendering
      />

      {/* Quick Genre Explorer */}
      {genres.length > 0 && (
        <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
          <div className="bg-[#101010] border border-[#222222] p-6 sm:p-8 rounded-2xl space-y-5 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#e50914]/10 border border-[#e50914]/30 flex items-center justify-center text-[#e50914]">
                <Tag className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wide">
                Khám Phá Theo Thể Loại
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
              {genres.slice(0, 24).map((g) => (
                <Link
                  key={g.slug}
                  href={`/the-loai/${g.slug}`}
                  className="p-3 bg-[#181818] border border-[#262626] hover:border-[#e50914] hover:bg-[#1f1f1f] rounded-xl text-xs font-semibold text-[#d4d4d4] hover:text-white transition-all text-center truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
                >
                  {g.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
