import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { formatDate, parseDate, isValidDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

export default function DateInputField({ value, onChange, placeholder = "dd/mm/yyyy", label, error, disabled, onFocus }) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (value && isValidDate(value)) {
      setInputValue(formatDate(value));
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Only attempt parse if it looks like a complete date string
    if (val.length === 10) {
      const parsed = parseDate(val);
      if (parsed) {
        onChange(parsed, null);
      } else {
        onChange(null, "Invalid date format");
      }
    } else if (val.length === 0) {
      onChange(null, null);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          className={cn(
            "w-full h-10 pl-3 pr-10 rounded-lg border text-sm transition-colors",
            "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
            "border-[hsl(var(--date-input-border))] focus:outline-none focus:ring-2 focus:ring-blue-500",
            error ? "border-red-500 focus:ring-red-500" : "hover:border-slate-300 dark:hover:border-slate-700",
            disabled ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800" : ""
          )}
        />
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <span className="text-[10px] text-red-500 mt-0.5">{error}</span>}
    </div>
  );
}