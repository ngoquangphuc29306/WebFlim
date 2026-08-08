import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import ToastContainer from '@/components/ui/Toast';
import { Providers } from '@/app/providers';
import { getGenresList, getCountriesList, getYearsList } from '@/lib/api/vsmov';

export const metadata: Metadata = {
  title: 'VSMov Stream - Trải Nghiệm Xem Phim Trực Tuyến Đỉnh Cao',
  description:
    'Website xem phim miễn phí chất lượng cao, cập nhật phim mới nhanh nhất với vietsub và thuyết minh chuẩn HD/4K.',
  keywords: ['xem phim', 'phim vietsub', 'phim thuyet minh', 'vsmov', 'phim moi', 'phim online'],
  openGraph: {
    title: 'VSMov Stream - Web Xem Phim HD/4K',
    description: 'Xem phim bộ, phim lẻ, anime mới nhất với giao diện rạp phim cực mượt.',
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [genres, countries, years] = await Promise.all([
    getGenresList(),
    getCountriesList(),
    getYearsList(),
  ]);

  return (
    <html lang="vi" className="dark scroll-smooth">
      <body className="bg-[#080808] text-[#f5f5f5] min-h-screen flex flex-col font-sans antialiased selection:bg-[#e50914] selection:text-white" suppressHydrationWarning>
        <Providers>
          <Header genres={genres} countries={countries} years={years} />
          <main className="flex-1 pt-16 sm:pt-20 pb-14 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}


