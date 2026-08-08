'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { Film } from 'lucide-react';

interface MovieImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src?: string | null;
  fallbackSrc?: string;
  title?: string;
  aspectRatio?: 'poster' | 'backdrop' | 'square' | 'custom';
}

const DEFAULT_PLACEHOLDER = 'https://picsum.photos/seed/vsmov-placeholder/400/600';

export default function MovieImage({
  src,
  fallbackSrc = DEFAULT_PLACEHOLDER,
  alt,
  title,
  className = '',
  aspectRatio = 'poster',
  fill = true,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 220px',
  ...props
}: MovieImageProps) {
  const [error, setError] = useState(false);

  const cleanSrc = !src || typeof src !== 'string' || src.trim().length === 0 ? fallbackSrc : src.trim();

  const handleImageError = () => {
    setError(true);
  };

  if (error || !cleanSrc) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-[#141414] border border-[#222] p-4 text-center text-[#737373] select-none ${
          aspectRatio === 'poster'
            ? 'aspect-[2/3]'
            : aspectRatio === 'backdrop'
            ? 'aspect-[16/9]'
            : aspectRatio === 'square'
            ? 'aspect-square'
            : ''
        } ${className}`}
      >
        <Film className="w-8 h-8 sm:w-10 sm:h-10 text-[#404040] mb-2" />
        <span className="text-xs font-medium text-[#a3a3a3] line-clamp-2 px-1">
          {title || alt || 'PHEVO Cinema'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-[#121212] ${
        aspectRatio === 'poster'
          ? 'aspect-[2/3]'
          : aspectRatio === 'backdrop'
          ? 'aspect-[16/9]'
          : aspectRatio === 'square'
          ? 'aspect-square'
          : ''
      } ${className}`}
    >
      <Image
        src={cleanSrc}
        alt={alt || title || 'Hình ảnh phim'}
        fill={fill}
        sizes={sizes}
        referrerPolicy="no-referrer"
        onError={handleImageError}
        className="object-cover"
        {...props}
      />
    </div>
  );
}

