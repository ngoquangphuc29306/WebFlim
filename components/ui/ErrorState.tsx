import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import MovieButton from './MovieButton';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  className?: string;
}

export default function ErrorState({
  title = 'Đã có lỗi xảy ra',
  description = 'Không thể tải nội dung vào lúc này. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau ít phút.',
  onRetry,
  showHomeButton = true,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 my-8 bg-[#101010] border border-[#2a1a1a] rounded-2xl max-w-xl mx-auto shadow-2xl ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#2a1215] border border-[#4a1c20] flex items-center justify-center text-[#e50914] mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-[#f5f5f5] tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-sm text-[#a3a3a3] leading-relaxed max-w-md mb-6">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <MovieButton
            variant="primary"
            size="md"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={onRetry}
          >
            Thử lại
          </MovieButton>
        )}

        {showHomeButton && (
          <MovieButton
            variant="secondary"
            size="md"
            icon={<Home className="w-4 h-4" />}
            href="/"
          >
            Về trang chủ
          </MovieButton>
        )}
      </div>
    </div>
  );
}
