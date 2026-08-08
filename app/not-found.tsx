import React from 'react';
import Link from 'next/link';
import { Film, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="w-20 h-20 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center text-[#e50914] mb-6 shadow-2xl">
        <Film className="w-10 h-10" />
      </div>

      <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-3">
        404 - Không Tìm Thấy Trang
      </h1>

      <p className="text-sm sm:text-base text-[#a3a3a3] max-w-md mb-8 leading-relaxed">
        Rất tiếc, bộ phim hoặc trang bạn đang tìm kiếm không tồn tại hoặc đã bị thay đổi địa chỉ.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-sm"
        >
          <Home className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
      </div>
    </div>
  );
}
