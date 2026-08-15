'use client';

import React from 'react';
import { AuthProvider } from '@/lib/auth/auth-context';
import { QuickPreviewProvider } from '@/components/movie/QuickPreviewContext';
import QuickPreviewModal from '@/components/movie/QuickPreviewModal';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <QuickPreviewProvider>
        {children}
        <QuickPreviewModal />
      </QuickPreviewProvider>
    </AuthProvider>
  );
}
