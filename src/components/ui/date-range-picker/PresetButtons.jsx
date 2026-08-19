import React from 'react';
import { cn } from '@/lib/utils';

export default function PresetButtons({ presets, activePreset, onPresetClick }) {
  return (
    <div className="flex flex-col md:flex-row flex-wrap gap-2 w-full">
      {presets.map((preset) => {
        const isActive = activePreset === preset.value;
        return (
          <button
            key={preset.value}
            onClick={() => onPresetClick(preset)}
            className={cn(
              "px-3 py-2 text-sm rounded-lg font-medium transition-colors w-full md:w-auto text-left md:text-center",
              isActive 
                ? "bg-blue-500 text-white shadow-sm" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}