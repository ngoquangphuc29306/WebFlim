'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { MovieCardModel } from '@/types/movie';

interface QuickPreviewContextType {
  previewMovie: MovieCardModel | null;
  isOpen: boolean;
  previewRequestId: number;
  openPreview: (movie: MovieCardModel) => void;
  closePreview: () => void;
}

const QuickPreviewContext = createContext<QuickPreviewContextType>({
  previewMovie: null,
  isOpen: false,
  previewRequestId: 0,
  openPreview: () => {},
  closePreview: () => {},
});

export function QuickPreviewProvider({ children }: { children: ReactNode }) {
  const [previewMovie, setPreviewMovie] = useState<MovieCardModel | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [previewRequestId, setPreviewRequestId] = useState(0);

  const openPreview = useCallback((movie: MovieCardModel) => {
    setPreviewMovie(movie);
    setPreviewRequestId((requestId) => requestId + 1);
    setIsOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <QuickPreviewContext.Provider
      value={{
        previewMovie,
        isOpen,
        previewRequestId,
        openPreview,
        closePreview,
      }}
    >
      {children}
    </QuickPreviewContext.Provider>
  );
}

export function useQuickPreview() {
  return useContext(QuickPreviewContext);
}
