'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { sanitizeInternalReturnTo } from '@/lib/auth/return-to';
import { Film, LogIn, ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signInWithGoogle, isConfigured, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams.get('error') === 'auth_failed'
      ? 'Đăng nhập không thành công. Vui lòng thử lại sau.'
      : null
  );

  const returnTo = sanitizeInternalReturnTo(searchParams.get('returnTo'));

  if (user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-scale-in">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Bạn đã đăng nhập</h1>
        <p className="text-neutral-400 max-w-sm mb-6 text-sm">
          Tài khoản: <span className="text-white font-medium">{user.email}</span>
        </p>
        <Link
          href={returnTo}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#e50914] hover:bg-[#b80710] text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-[#e50914]/20"
        >
          Tiếp tục trải nghiệm
        </Link>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const { error } = await signInWithGoogle(returnTo);
      if (error) {
        setErrorMessage(error.message || 'Không thể khởi chạy đăng nhập Google.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('Đã xảy ra lỗi không xác định.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#e50914]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity mb-3"
          >
            <Film className="w-7 h-7 text-[#e50914]" />
            <span>PHE<span className="text-[#e50914]">VO</span></span>
          </Link>
          <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
            Đăng nhập để đồng bộ danh sách yêu thích, lịch sử xem và tiến trình phát phim giữa tất cả các thiết bị.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!isConfigured && (
          <div className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs sm:text-sm leading-relaxed">
            Lưu ý: Dự án Supabase chưa được kết nối biến môi trường (`NEXT_PUBLIC_SUPABASE_URL`). Bạn vẫn có thể dùng PHEVO ở chế độ Khách (lưu dữ liệu trên thiết bị này).
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isSubmitting || isLoading || !isConfigured}
            className="w-full h-12 bg-white text-neutral-900 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-3 relative overflow-hidden group"
          >
            {isSubmitting ? (
              <RefreshCw className="w-5 h-5 animate-spin text-neutral-600" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Tiếp tục với Google</span>
              </>
            )}
          </button>

          <div className="relative my-6 text-center text-xs text-neutral-500 uppercase tracking-widest">
            <span className="bg-[#121212] px-3 z-10 relative">HOẶC</span>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
          </div>

          <Link
            href={returnTo}
            className="w-full h-11 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tiếp tục sử dụng không cần đăng nhập</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 space-y-2 text-xs text-neutral-400">
          <div className="flex items-center gap-2 text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Đăng nhập để đồng bộ dữ liệu cá nhân</span>
          </div>
          <p className="text-neutral-500 text-[11px] leading-relaxed">
            PHEVO chỉ sử dụng tài khoản Google để xác thực và đồng bộ dữ liệu xem phim cá nhân. Bạn vẫn có thể xem phim hoàn toàn miễn phí mà không cần tạo tài khoản.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-[#e50914]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
