'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Bookmark, History } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on watch pages (/xem-phim/*)
  if (pathname.startsWith('/xem-phim')) {
    return null;
  }

  const items = [
    { label: 'Trang chủ', href: '/', icon: Home, exact: true },
    { label: 'Khám phá', href: '/kham-pha', icon: Compass, exact: false },
    { label: 'Yêu thích', href: '/yeu-thich', icon: Bookmark, exact: false },
    { label: 'Lịch sử', href: '/lich-su', icon: History, exact: false },
  ];

  return (
    <nav
      aria-label="Điều hướng di động"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed bottom-0 left-0 right-0 z-45 bg-[#121212]/95 backdrop-blur-md border-t border-[#262626] md:hidden shadow-2xl"
    >
      <div className="grid grid-cols-4 h-14 max-w-md mx-auto">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[48px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e50914] rounded-lg ${
                isActive ? 'text-[#e50914] font-bold' : 'text-[#a3a3a3] hover:text-white font-medium'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] fill-current/10' : 'stroke-[1.75px]'}`} />
              <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
