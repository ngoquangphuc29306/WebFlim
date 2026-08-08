import React from 'react';
import Link from 'next/link';
import { Play, Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-[#1a1a1a] text-[#737373] text-sm pt-12 pb-8 mt-20">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-[#141414]">
          {/* Brand Info */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 text-white font-bold text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded"
            >
              <div className="w-8 h-8 rounded-lg bg-[#e50914] flex items-center justify-center text-white shadow-md shadow-[#e50914]/30">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              <span className="font-extrabold tracking-wider text-xl">
                VS<span className="text-[#e50914]">MOV</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-[#8c8c8c]">
              Trải nghiệm xem phim trực tuyến đỉnh cao với giao diện hiện đại, tốc độ cực nhanh và chất lượng HD/4K sắc nét. Powered by VSMov API.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-wider">Khám Phá</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/danh-sach/phim-le" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                  Phim Lẻ Mới
                </Link>
              </li>
              <li>
                <Link href="/danh-sach/phim-bo" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                  Phim Bộ Đang Hot
                </Link>
              </li>
              <li>
                <Link href="/danh-sach/subteam" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                  Phim Vietsub Subteam
                </Link>
              </li>
              <li>
                <Link href="/danh-sach/phim-moi" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                  Phim Mới Cập Nhật
                </Link>
              </li>
            </ul>
          </div>

          {/* Top Genres */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-wider">Thể Loại Nổi Bật</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/the-loai/hanh-dong" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                  Hành Động & Phiêu Lưu
                </Link>
              </li>
              <li>
                <Link href="/the-loai/hoat-hinh" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                  Hoạt Hình Anime
                </Link>
              </li>
              <li>
                <Link href="/the-loai/kinh-di" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                  Kinh Dị & Giật Gân
                </Link>
              </li>
              <li>
                <Link href="/the-loai/lang-man" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:underline">
                  Tình Cảm Lãng Mạn
                </Link>
              </li>
            </ul>
          </div>

          {/* Features & Disclaimer */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-wider">Bản Quyền & Thông Tin</h3>
            <p className="text-xs text-[#8c8c8c] leading-relaxed">
              Tất cả nội dung được tổng hợp tự động từ các dịch vụ phát trực tuyến công cộng. Chúng tôi không lưu trữ bất kỳ file phim nào trên máy chủ.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-[#a3a3a3]">
              <Shield className="w-4 h-4 text-[#e50914]" />
              <span>Dữ liệu chính xác & an toàn</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#737373]">
          <p>© {new Date().getFullYear()} VSMov Stream. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Thiết kế dành cho trải nghiệm phim ảnh chuyên nghiệp
          </p>
        </div>
      </div>
    </footer>
  );
}
