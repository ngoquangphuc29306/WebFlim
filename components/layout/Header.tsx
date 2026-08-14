'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Bookmark, History, Compass } from 'lucide-react';
import { CategoryModel, CountryModel, YearOptionModel } from '@/types/movie';
import TaxonomyDropdowns from '@/components/layout/TaxonomyDropdowns';
import HeaderSearch from '@/components/layout/HeaderSearch';
import UserAccountMenu from '@/components/layout/UserAccountMenu';
import MobileNav from '@/components/layout/MobileNav';

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
  { name: 'Subteam', href: '/danh-sach/subteam' },
];

export default function Header({ genres = [], countries = [], years = [] }: HeaderProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Header scroll state listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Escape key listener for mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#080808]/95 backdrop-blur-md border-b border-[#1f1f1f] py-2.5 sm:py-3 shadow-xl'
          : 'bg-header-gradient py-3.5 sm:py-4'
      }`}
    >
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Trang chủ PHEVO"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-white group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] rounded-lg shrink-0"
          >
            <div className="relative h-8 sm:h-9 w-auto min-w-[32px] sm:min-w-[36px] flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="PHEVO Logo"
                width={140}
                height={36}
                className="h-8 sm:h-9 w-auto max-w-[48px] sm:max-w-none object-contain group-hover:scale-105 transition-transform duration-200"
                priority
                unoptimized
              />
            </div>
            <span className="font-extrabold tracking-wider text-xl sm:text-2xl">
              PHE<span className="text-[#e50914]">VO</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Điều hướng chính">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                    active
                      ? 'text-[#f5f5f5] bg-[#181818] font-semibold border border-[#2a2a2a] shadow-xs'
                      : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#141414]'
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

          {/* Right Section: Search, Shortcuts & Account */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
            {/* Live Search */}
            <HeaderSearch pathname={pathname} />

            {/* Watchlist Shortcut */}
            <Link
              href="/yeu-thich"
              title="Danh sách yêu thích"
              aria-label="Danh sách yêu thích"
              className={`hidden sm:flex p-2 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                pathname === '/yeu-thich'
                  ? 'text-[#f5f5f5] bg-[#1f1f1f] border border-[#2a2a2a]'
                  : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#141414]'
              }`}
            >
              <Bookmark className="w-4 h-4 xl:w-5 xl:h-5" />
            </Link>

            {/* Watch History Shortcut */}
            <Link
              href="/lich-su"
              title="Lịch sử xem phim"
              aria-label="Lịch sử xem phim"
              className={`hidden sm:flex p-2 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] ${
                pathname === '/lich-su'
                  ? 'text-[#f5f5f5] bg-[#1f1f1f] border border-[#2a2a2a]'
                  : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#141414]'
              }`}
            >
              <History className="w-4 h-4 xl:w-5 xl:h-5" />
            </Link>

            {/* User Account Menu */}
            <UserAccountMenu />

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
              className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#141414] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <MobileNav
          navLinks={navLinks}
          genres={genres}
          countries={countries}
          years={years}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
}
