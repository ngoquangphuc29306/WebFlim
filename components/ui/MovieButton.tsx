import React from 'react';
import Link from 'next/link';

export interface MovieButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  href?: string;
  className?: string;
  children: React.ReactNode;
}

export default function MovieButton({
  variant = 'primary',
  size = 'md',
  icon,
  href,
  className = '',
  children,
  disabled,
  ...props
}: MovieButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3 text-base gap-2.5 font-bold',
  };

  const variantStyles = {
    primary:
      'bg-[#e50914] text-white hover:bg-[#f40612] shadow-md shadow-[#e50914]/25 hover:shadow-lg hover:shadow-[#e50914]/40',
    secondary:
      'bg-[#262626]/90 text-white hover:bg-[#333333] border border-[#3f3f3f]/50 backdrop-blur-sm',
    outline:
      'border border-[#404040] text-[#f5f5f5] hover:bg-[#1a1a1a] hover:border-[#666]',
    ghost:
      'text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]',
  };

  const combinedClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  const content = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} disabled={disabled} {...props}>
      {content}
    </button>
  );
}
