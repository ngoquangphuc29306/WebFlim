import React from 'react';

export interface MovieBadgeProps {
  children: React.ReactNode;
  variant?: 'accent' | 'quality' | 'secondary' | 'outline' | 'muted';
  size?: 'sm' | 'md';
  className?: string;
}

export default function MovieBadge({
  children,
  variant = 'secondary',
  size = 'sm',
  className = '',
}: MovieBadgeProps) {
  if (!children) return null;

  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded tracking-wide uppercase select-none transition-colors';

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px] leading-tight',
    md: 'px-2 py-1 text-xs leading-none',
  };

  const variantStyles = {
    accent: 'bg-[#e50914] text-white font-bold shadow-sm shadow-[#e50914]/20',
    quality: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold',
    secondary: 'bg-[#222222]/90 text-[#e5e5e5] border border-[#333333]',
    outline: 'border border-[#404040] text-[#a3a3a3] bg-[#121212]/80',
    muted: 'bg-[#181818] text-[#737373]',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
