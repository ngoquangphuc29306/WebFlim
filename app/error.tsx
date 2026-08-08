'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="w-20 h-20 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center text-[#e50914] mb-6 shadow-2xl">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
        Đã Xảy Ra Lỗi Kết Nối
      </h1>

      <p className="text-sm sm:text-base text-[#a3a3a3] max-w-md mb-8 leading-relaxed">
        Hệ thống không thể tải dữ liệu từ máy chủ API lúc này. Vui lòng thử tải lại trang hoặc quay về trang chủ.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Thử lại</span>
        </button>

        <Link
          href="/"
          className="flex items-center gap-2 bg-[#141414] hover:bg-[#1f1f1f] text-white border border-[#2a2a2a] font-medium py-3 px-6 rounded-xl text-sm transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Trang chủ</span>
        </Link>
      </div>
    </div>
  );
}
