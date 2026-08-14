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
    'inline-flex items-center justify-center font-semibold rounded-md tracking-wide uppercase select-none pointer-events-none whitespace-nowrap';

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px] leading-tight',
    md: 'px-2 py-0.5 text-xs leading-tight',
  };

  const variantStyles = {
    accent: 'bg-[#e50914] text-white font-bold shadow-sm shadow-[#e50914]/20',
    quality: 'bg-[#181818]/90 text-[#f5f5f5] border border-[#2a2a2a] font-bold backdrop-blur-xs',
    secondary: 'bg-[#121212]/90 text-[#d4d4d4] border border-[#262626] backdrop-blur-xs',
    outline: 'border border-[#333333] text-[#a3a3a3] bg-[#0c0c0c]/80 backdrop-blur-xs',
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
