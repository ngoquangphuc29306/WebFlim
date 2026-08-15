'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bookmark, History, Compass } from 'lucide-react';
import { CategoryModel, CountryModel, YearOptionModel } from '@/types/movie';
import TaxonomyDropdowns from '@/components/layout/TaxonomyDropdowns';
import HeaderSearch from '@/components/layout/HeaderSearch';
import UserAccountMenu from '@/components/layout/UserAccountMenu';
import MobileSubHeaderPills from '@/components/layout/MobileSubHeaderPills';

interface HeaderProps {
  genres?: CategoryModel[];
  countries?: CountryModel[];
  years?: YearOptionModel[];
}

const navLinks = [
  { name: 'Trang chủ', href: '/' },
  { name: 'Khám Phá', href: '/kham-pha', icon: Compass },
  { name: 'Phim Lẻ', href: '/danh-sach/phim-le' },
  { name: 'Phim Bộ', href: '/danh-sach/phim-bo' },
  { name: 'Hoạt hình', href: '/danh-sach/hoat-hinh' },
  { name: 'TV Shows', href: '/danh-sach/tv-shows' },
  { name: 'Phim chiếu rạp', href: '/danh-sach/phim-chieu-rap' },
];

export default function Header({ genres = [], countries = [], years = [] }: HeaderProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  // Header scroll state listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#141414]/95 backdrop-blur-md border-b border-[#262626] py-2 sm:py-2.5 shadow-2xl'
          : 'bg-gradient-to-b from-[#141414]/95 via-[#141414]/60 to-transparent py-2.5 sm:py-3.5'
      }`}
    >
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo (Netflix-inspired Red Mark / Wordmark) */}
          <Link
            href="/"
            aria-label="Trang chủ PHEVO"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-white group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-lg shrink-0"
          >
            <div className="relative h-7 sm:h-9 w-auto min-w-[28px] sm:min-w-[36px] flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="PHEVO Logo"
                width={140}
                height={36}
                className="h-7 sm:h-9 w-auto max-w-[40px] sm:max-w-none object-contain group-hover:scale-105 transition-transform duration-200"
                priority
                unoptimized
              />
            </div>
            <span className="font-black tracking-wider text-xl sm:text-2xl drop-shadow-md">
              PHE<span className="text-[#e50914]">VO</span>
            </span>
          </Link>

          {/* Desktop Navigation (>= lg) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Điều hướng chính">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-lg text-xs xl:text-sm transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                    active
                      ? 'text-white bg-[#262626] font-bold border border-[#383838] shadow-sm'
                      : 'text-[#e5e5e5] font-medium hover:text-white hover:bg-[#202020]'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-[#e50914]" />}
                  <span>{link.name}</span>
                </Link>
              );
            })}

            {/* Desktop Taxonomy Dropdowns (Genre, Country, Year) */}
            <TaxonomyDropdowns
              key={pathname}
              genres={genres}
              countries={countries}
              years={years}
              pathname={pathname}
            />
          </nav>

          {/* Right Section: Search & Account (On mobile: Exactly Search + Avatar) */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
            {/* Live Search */}
            <HeaderSearch pathname={pathname} />

            {/* Watchlist Shortcut (Desktop only) */}
            <Link
              href="/yeu-thich"
              title="Danh sách yêu thích"
              aria-label="Danh sách yêu thích"
              className={`hidden sm:flex p-2 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                pathname === '/yeu-thich'
                  ? 'text-white bg-[#262626] border border-[#383838]'
                  : 'text-[#e5e5e5] hover:text-white hover:bg-[#202020]'
              }`}
            >
              <Bookmark className="w-4 h-4 xl:w-5 xl:h-5" />
            </Link>

            {/* Watch History Shortcut (Desktop only) */}
            <Link
              href="/lich-su"
              title="Lịch sử xem phim"
              aria-label="Lịch sử xem phim"
              className={`hidden sm:flex p-2 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                pathname === '/lich-su'
                  ? 'text-white bg-[#262626] border border-[#383838]'
                  : 'text-[#e5e5e5] hover:text-white hover:bg-[#202020]'
              }`}
            >
              <History className="w-4 h-4 xl:w-5 xl:h-5" />
            </Link>

            {/* User Account Avatar Menu */}
            <UserAccountMenu />
          </div>
        </div>
      </div>

      {/* Netflix Mobile Quick Filter Pills ([Phim T.hình] [Phim lẻ] [Thể loại ▾]) */}
      <MobileSubHeaderPills genres={genres} />
    </header>
  );
}
