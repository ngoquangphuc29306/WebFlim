'use client';

import React, { useState, useEffect } from 'react';
import { toast, ToastMessage } from '@/lib/utils/toast';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toast.subscribe((newToasts) => {
      setMessages(newToasts);
    });
  }, []);

  if (messages.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-60 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none"
    >
      {messages.map((m) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
          info: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
        };

        return (
          <div
            key={m.id}
            className="flex items-center gap-2.5 bg-[#141414]/95 border border-[#2a2a2a] text-white text-xs font-medium px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200 pointer-events-auto"
          >
            {icons[m.type]}
            <span className="flex-1 leading-snug">{m.text}</span>
          </div>
        );
      })}
    </div>
  );
}
