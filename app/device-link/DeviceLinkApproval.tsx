'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { sanitizeInternalReturnTo } from '@/lib/auth/return-to';

type ApprovalState = 'idle' | 'approving' | 'approved' | 'error';

export default function DeviceLinkApproval() {
  const params = useSearchParams();
  const sessionId = params.get('session')?.trim() ?? '';
  const userCode = params.get('code')?.trim().toUpperCase() ?? '';
  const { user, session, signInWithGoogle, isConfigured, isLoading } = useAuth();
  const [approvalState, setApprovalState] = useState<ApprovalState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const returnTo = useMemo(() => {
    if (!sessionId || !userCode) return '/device-link';
    return sanitizeInternalReturnTo(`/device-link?session=${encodeURIComponent(sessionId)}&code=${encodeURIComponent(userCode)}`);
  }, [sessionId, userCode]);

  useEffect(() => {
    if (!user || !session || !sessionId || !userCode || approvalState !== 'idle') return;
    const client = getSupabaseBrowserClient();
    if (!client) return;

    let active = true;
    client.functions.invoke('device-link', {
      body: { action: 'approve', session_id: sessionId, user_code: userCode },
    }).then(({ error }) => {
      if (!active) return;
      if (error) {
        setApprovalState('error');
        setErrorMessage('Mã liên kết không hợp lệ, đã hết hạn hoặc đã được xử lý.');
      } else {
        setApprovalState('approved');
      }
    }).catch(() => {
      if (!active) return;
      setApprovalState('error');
      setErrorMessage('Không thể kết nối tới dịch vụ liên kết TV.');
    });

    return () => { active = false; };
  }, [approvalState, session, sessionId, user, userCode]);

  const handleLogin = async () => {
    const result = await signInWithGoogle(returnTo);
    if (result.error) setErrorMessage('Không thể mở đăng nhập Google. Vui lòng thử lại.');
  };

  if (!sessionId || !userCode) {
    return <ApprovalLayout title="Liên kết TV" message="Liên kết không hợp lệ hoặc đã thiếu mã thiết bị." />;
  }

  if (approvalState === 'approved') {
    return (
      <ApprovalLayout
        title="Đã liên kết TV"
        message="Bạn có thể quay lại màn hình PHEVO trên TV. TV sẽ tự động hoàn tất đăng nhập."
        icon={<CheckCircle2 className="h-10 w-10 text-emerald-400" />}
      />
    );
  }

  if (approvalState === 'approving') {
    return (
      <ApprovalLayout
        title="Đang xác nhận…"
        message="Vui lòng giữ nguyên trang này trong giây lát."
        icon={<Loader2 className="h-10 w-10 animate-spin text-[#e50914]" />}
      />
    );
  }

  if (user && !isConfigured) {
    return <ApprovalLayout title="Chưa thể liên kết" message="Supabase chưa được cấu hình cho môi trường này." />;
  }

  if (user && approvalState === 'idle') {
    return (
      <ApprovalLayout
        title="Đang liên kết TV"
        message={`Tài khoản ${user.email ?? 'của bạn'} sẽ được liên kết với mã ${userCode}.`}
        icon={<Loader2 className="h-10 w-10 animate-spin text-[#e50914]" />}
      />
    );
  }

  if (!user) {
    return (
      <ApprovalLayout
        title="Cho phép liên kết TV?"
        message={`Mã thiết bị: ${userCode}. Đăng nhập để xác nhận thiết bị này thuộc tài khoản của bạn.`}
        icon={<Smartphone className="h-10 w-10 text-[#e50914]" />}
      >
        {!isConfigured && <p className="mb-4 text-sm text-amber-300">Dịch vụ đăng nhập chưa được cấu hình.</p>}
        {errorMessage && <p className="mb-4 text-sm text-rose-300">{errorMessage}</p>}
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoading || !isConfigured}
          className="min-h-11 w-full rounded-xl bg-[#e50914] px-5 py-3 font-semibold text-white transition hover:bg-[#b80710] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Đăng nhập để tiếp tục
        </button>
      </ApprovalLayout>
    );
  }

  return (
    <ApprovalLayout
      title="Đang liên kết TV"
      message={`Tài khoản ${user.email ?? 'của bạn'} sẽ được liên kết với mã ${userCode}.`}
      icon={<Loader2 className="h-10 w-10 animate-spin text-[#e50914]" />}
    >
      {errorMessage && <p className="text-sm text-rose-300">{errorMessage}</p>}
    </ApprovalLayout>
  );
}

function ApprovalLayout({
  title,
  message,
  icon,
  children,
}: {
  title: string;
  message: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#121212] p-7 text-center shadow-2xl sm:p-9">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e50914]/10">
          {icon ?? <ShieldCheck className="h-10 w-10 text-emerald-400" />}
        </div>
        <h1 className="mb-3 text-2xl font-bold text-white">{title}</h1>
        <p className="mb-6 text-sm leading-relaxed text-[#a3a3a3]">{message}</p>
        {children}
        <Link href="/" className="mt-6 inline-block text-sm text-[#a3a3a3] underline-offset-4 hover:text-white hover:underline">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
