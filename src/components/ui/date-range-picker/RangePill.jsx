import React from 'react';
import { X } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

export default function RangePill({ startDate, endDate, onClear, onClick }) {
  if (!startDate || !endDate) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow">
      <button 
        onClick={onClick}
        className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        {formatDate(startDate)} – {formatDate(endDate)}
      </button>
      <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-600"></div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="text-slate-500 hover:text-red-500 transition-colors rounded-full p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20"
        aria-label="Clear date range"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}