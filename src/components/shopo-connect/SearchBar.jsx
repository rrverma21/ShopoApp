import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ value, searchQuery, onChange, onClear }) {
  // Support both 'value' and 'searchQuery' prop names for flexibility
  const displayValue = value !== undefined ? value : (searchQuery || '');

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && onClear) {
      onClear();
    }
  };

  return (
    <div className="w-full relative group">
      <label htmlFor="shopo-search" className="sr-only">
        Search posts, offers, products...
      </label>
      
      <div className="relative flex items-center w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200">
        
        {/* Leading Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search 
            className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" 
            aria-hidden="true" 
          />
        </div>

        {/* Input Field */}
        <input
          id="shopo-search"
          type="text"
          className="block w-full pl-11 pr-12 py-3.5 bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-0 sm:text-base outline-none rounded-xl"
          placeholder="Search posts, offers, products..."
          value={displayValue}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          aria-label="Search posts, offers, products..."
          autoComplete="off"
        />

        {/* Trailing Clear Button */}
        {displayValue && (
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:text-primary transition-colors"
              aria-label="Clear search"
              title="Clear search (Esc)"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}