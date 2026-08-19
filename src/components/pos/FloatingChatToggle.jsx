import React, { useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FloatingChatToggle = ({ isOpen, onToggle }) => {
  // Temporary console.log to verify mount and visibility for debugging
  useEffect(() => {
    console.log("FloatingChatToggle mounted and rendering - z-index is set to 120 to ensure it stays on top.");
  }, []);

  return (
    <Button
      onClick={onToggle}
      size="icon"
      className={cn(
        "fixed z-[120] h-14 w-14 rounded-full shadow-2xl border-2 border-white/20 transition-all duration-300 hover:scale-105",
        "bottom-6 right-6 lg:right-[470px]", // Positioned to avoid the 450px wide checkout panel on large screens, but falls back to bottom-right gracefully
        isOpen 
          ? "bg-slate-800 hover:bg-slate-900 text-white" 
          : "bg-blue-600 hover:bg-blue-700 text-white"
      )}
      aria-label="Toggle AI Chat"
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </Button>
  );
};

export default FloatingChatToggle;