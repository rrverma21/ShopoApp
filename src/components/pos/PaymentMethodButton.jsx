import React from 'react';
import { cn } from '@/lib/utils';

const PaymentMethodButton = ({ method, shortcut, icon: Icon, isSelected, onClick, disabled }) => {
  
  const handleClick = (e) => {
    // Log interaction
    console.log(`[PaymentMethodButton] Clicked: ${method} (Disabled: ${disabled}, Selected: ${isSelected})`);
    
    if (!disabled) {
        onClick(method);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      data-payment-method={method}
      className={cn(
        "group relative flex flex-col items-center justify-center h-24 p-4 rounded-lg border transition-all duration-200 w-full",
        // Hover and Focus states
        "hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        // Selection State Styling
        isSelected
          ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600 ring-offset-2 scale-[1.02] z-10"
          : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800",
        // Disabled State Styling
        disabled && "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none bg-slate-100 dark:bg-slate-900 grayscale"
      )}
      type="button"
      aria-label={`Select payment method: ${method} ${shortcut ? `(Shortcut ${shortcut})` : ''}`}
      aria-pressed={isSelected}
      title={shortcut ? `${method} (${shortcut})` : method}
    >
      {shortcut && (
        <span className={cn(
          "absolute top-2 right-2 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border",
          isSelected 
            ? "text-blue-100 border-blue-400 bg-blue-700" 
            : "text-slate-500 border-slate-200 bg-slate-100 group-hover:border-blue-200 group-hover:text-blue-600 group-hover:bg-blue-50"
        )}>
          {shortcut}
        </span>
      )}
      
      {Icon && (
        <Icon 
          className={cn(
            "h-7 w-7 mb-2 transition-colors duration-200", 
            isSelected ? "text-white" : "text-slate-500 group-hover:text-blue-500"
          )} 
        />
      )}
      
      <span className={cn(
        "text-sm font-semibold transition-colors duration-200",
        isSelected ? "text-white font-bold" : "text-slate-700 dark:text-slate-200"
      )}>
        {method}
      </span>
      
      {/* Visual Feedback: Subtle pulse animation when selected */}
      {isSelected && (
        <span className="absolute inset-0 rounded-lg animate-ping bg-blue-400 opacity-20 pointer-events-none" />
      )}
    </button>
  );
};

export default PaymentMethodButton;