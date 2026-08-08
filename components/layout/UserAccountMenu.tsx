'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/auth-context';
import { User as UserIcon, LogOut, RefreshCw, CheckCircle, AlertTriangle, Cloud, Bookmark, History } from 'lucide-react';

export default function UserAccountMenu() {
  const { user, signOut, syncStatus } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Link
        href="/dang-nhap"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a1a] hover:bg-[#e50914] text-white text-xs sm:text-sm font-medium border border-[#333] hover:border-[#e50914] transition-all shadow-sm"
      >
        <UserIcon className="w-4 h-4" />
        <span>Đăng nhập</span>
      </Link>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Tài khoản';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Tài khoản cá nhân"
        className="relative flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
      >
        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#222] border border-white/20 flex items-center justify-center">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              referrerPolicy="no-referrer"
              className="object-cover"
            />
          ) : (
            <UserIcon className="w-4 h-4 text-neutral-300" />
          )}
        </div>

        {/* Sync Status Badge Indicator */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#080808] ${
            syncStatus === 'synced'
              ? 'bg-emerald-500'
              : syncStatus === 'syncing'
              ? 'bg-amber-400 animate-pulse'
              : syncStatus === 'error'
              ? 'bg-rose-500'
              : 'bg-neutral-500'
          }`}
          title={
            syncStatus === 'synced'
              ? 'Đã đồng bộ đám mây'
              : syncStatus === 'syncing'
              ? 'Đang đồng bộ...'
              : syncStatus === 'error'
              ? 'Lỗi đồng bộ'
              : 'Ngoại tuyến'
          }
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#121212] border border-[#262626] rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in duration-150 divide-y divide-white/5">
          {/* User Info Header */}
          <div className="pb-3 px-1">
            <div className="font-semibold text-sm text-white truncate">{displayName}</div>
            <div className="text-xs text-neutral-400 truncate">{user.email}</div>

            {/* Sync status detail */}
            <div className="mt-2.5 flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-white/5 border border-white/5 text-neutral-300">
              {syncStatus === 'synced' && (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">Đã đồng bộ đám mây</span>
                </>
              )}
              {syncStatus === 'syncing' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                  <span className="text-amber-300">Đang đồng bộ dữ liệu...</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-rose-300">Chưa thể đồng bộ (đã lưu trên máy)</span>
                </>
              )}
              {syncStatus === 'idle' && (
                <>
                  <Cloud className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="text-neutral-400">Trạng thái chờ</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="py-2 space-y-0.5">
            <Link
              href="/yeu-thich"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Bookmark className="w-4 h-4 text-[#e50914]" />
              <span>Phim Yêu Thích</span>
            </Link>
            <Link
              href="/lich-su"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <History className="w-4 h-4 text-[#e50914]" />
              <span>Lịch Sử Xem</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
