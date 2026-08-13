import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield } from 'lucide-react';

// Tách mảng dữ liệu ra khỏi UI để dễ dàng thêm/sửa link sau này
const QUICK_LINKS = [
  { label: 'Phim Lẻ Mới', href: '/danh-sach/phim-le' },
  { label: 'Phim Bộ Đang Hot', href: '/danh-sach/phim-bo' },
  { label: 'Phim Vietsub Subteam', href: '/danh-sach/subteam' },
  { label: 'Phim Mới Cập Nhật', href: '/danh-sach/phim-moi' },
];

const TOP_GENRES = [
  { label: 'Hành Động & Phiêu Lưu', href: '/the-loai/hanh-dong' },
  { label: 'Hoạt Hình Anime', href: '/the-loai/hoat-hinh' },
  { label: 'Kinh Dị & Giật Gân', href: '/the-loai/kinh-di' },
  { label: 'Tình Cảm Lãng Mạn', href: '/the-loai/lang-man' },
];

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-[#1a1a1a] text-[#737373] text-sm pt-12 pb-8 mt-20">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-[#141414]">
          
          {/* Brand Info */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-white font-bold text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded w-fit"
            >
              <Image
                src="/logo.png"
                alt="PHEVO Logo"
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
                unoptimized
              />
              <span className="font-extrabold tracking-wider text-xl">
                PHE<span className="text-[#e50914]">VO</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-[#8c8c8c]">
              Trải nghiệm xem phim trực tuyến với giao diện hiện đại và nội dung được cập nhật thường xuyên. Dữ liệu phim được lấy từ các nguồn API bên thứ ba.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-wider">Khám Phá</h3>
            <ul className="space-y-2 text-xs">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Genres */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-wider">Thể Loại Nổi Bật</h3>
            <ul className="space-y-2 text-xs">
              {TOP_GENRES.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features & Disclaimer */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-wider">Bản Quyền & Thông Tin</h3>
            <p className="text-xs text-[#8c8c8c] leading-relaxed">
              Tất cả nội dung được tổng hợp tự động từ các dịch vụ phát trực tuyến công cộng. Chúng tôi không lưu trữ bất kỳ file phim nào trên máy chủ.
            </p>
            <p className="text-xs text-[#8c8c8c] leading-relaxed">
              This product uses the <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer noopener" className="text-[#d4d4d4] hover:text-white underline">TMDB API</a> but is not endorsed or certified by TMDB.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-[#a3a3a3]">
              <Shield className="w-4 h-4 text-[#e50914]" />
              <span>Dữ liệu chính xác & an toàn</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#737373]">
          <p>© {new Date().getFullYear()} PHEVO Stream. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Thiết kế dành cho trải nghiệm phim ảnh chuyên nghiệp
          </p>
        </div>
      </div>
    </footer>
  );
}
