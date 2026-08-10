import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import ToastContainer from '@/components/ui/Toast';
import { Providers } from '@/app/providers';
import { getGenresList } from '@/lib/api/vsmov';
import { getSiteUrl } from '@/lib/site-config';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: 'PHEVO Stream - Xem Phim Trực Tuyến',
  description:
    'Website xem phim trực tuyến với phim mới, vietsub và thuyết minh.',
  keywords: ['xem phim', 'phim vietsub', 'phim thuyet minh', 'phevo', 'phim moi', 'phim online'],
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'PHEVO Stream - Xem Phim Trực Tuyến',
    description: 'Khám phá phim bộ, phim lẻ và hoạt hình với giao diện xem phim tập trung.',
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const genres = await getGenresList().catch(() => []);

  return (
    <html lang="vi" className="dark scroll-smooth">
      <body className="bg-[#080808] text-[#f5f5f5] min-h-screen flex flex-col font-sans antialiased selection:bg-[#e50914] selection:text-white" suppressHydrationWarning>
        <Providers>
          <Header genres={genres} />
          <main className="flex-1 pt-16 sm:pt-20 pb-14 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}


