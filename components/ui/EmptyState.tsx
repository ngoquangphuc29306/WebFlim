import React from 'react';
import { Film, Search, BookmarkX, AlertCircle } from 'lucide-react';
import MovieButton from './MovieButton';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'search' | 'bookmark' | 'film' | 'alert';
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  title = 'Không tìm thấy dữ liệu',
  description = 'Rất tiếc, nội dung bạn đang tìm kiếm hiện chưa có hoặc đã bị gỡ bỏ.',
  icon = 'film',
  actionLabel,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  const icons = {
    search: Search,
    bookmark: BookmarkX,
    film: Film,
    alert: AlertCircle,
  };

  const IconComponent = icons[icon] || Film;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 bg-[#101010] border border-[#222222] rounded-2xl max-w-xl mx-auto ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#a3a3a3] mb-4 shadow-inner">
        <IconComponent className="w-7 h-7 text-[#e50914]" />
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-[#f5f5f5] tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-sm text-[#a3a3a3] leading-relaxed max-w-md mb-6">
        {description}
      </p>

      {(actionLabel && (actionHref || onAction)) && (
        <MovieButton
          variant="secondary"
          size="md"
          href={actionHref}
          onClick={onAction}
        >
          {actionLabel}
        </MovieButton>
      )}
    </div>
  );
}
