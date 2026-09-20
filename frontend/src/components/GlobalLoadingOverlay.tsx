import React from 'react';
import { Stethoscope } from 'lucide-react';

interface GlobalLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const GlobalLoadingOverlay: React.FC<GlobalLoadingOverlayProps> = ({
  isVisible,
  message = 'Processing, please wait...',
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity"
      style={{ pointerEvents: 'auto' }}
      role="status"
      aria-live="polite"
    >
      <div className="bg-white px-7 py-6 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center space-y-3.5 max-w-xs mx-4 text-center animate-in fade-in zoom-in duration-150">
        <div className="relative flex items-center justify-center">
          {/* Animated spinner ring */}
          <div className="w-14 h-14 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
          {/* Centered medical pulse icon */}
          <div className="absolute inset-0 flex items-center justify-center text-emerald-700">
            <Stethoscope className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center space-x-1.5">
            <span className="text-xs font-black text-slate-900 tracking-tight">DocOS</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
              CLINIC
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 leading-snug">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
