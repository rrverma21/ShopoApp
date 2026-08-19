import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

const FloatingNotepadToggle = ({ isOpen, onToggle, noteCount = 0 }) => {
  // Initial position: Bottom right, above calculator space
  const [position, setPosition] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 80 : 0, 
    y: typeof window !== 'undefined' ? window.innerHeight - 220 : 0 
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Load position from localStorage on mount
  useEffect(() => {
    try {
      const savedPos = localStorage.getItem('notepadTogglePosition');
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (parsed.x && parsed.y && parsed.x < window.innerWidth && parsed.y < window.innerHeight) {
            setPosition(parsed);
        } else {
            setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 220 });
        }
      }
    } catch (e) {
      console.error("Error loading notepad toggle position", e);
    }
  }, []);

  useEffect(() => {
    const handleMove = (clientX, clientY) => {
      if (!isDragging) return;
      
      const dx = clientX - dragStartPos.current.x;
      const dy = clientY - dragStartPos.current.y;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMoved.current = true;
      }

      setPosition(prev => {
        let newX = clientX - 24; 
        let newY = clientY - 24;

        const padding = 10;
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;

        newX = Math.max(padding, Math.min(newX, maxX));
        newY = Math.max(padding, Math.min(newY, maxY));

        return { x: newX, y: newY };
      });
    };

    const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
        if (e.touches && e.touches[0]) {
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const handleEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('notepadTogglePosition', JSON.stringify(position));
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, position]);

  const handleStart = (clientX, clientY) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: clientX, y: clientY };
  };

  const handleMouseDown = (e) => handleStart(e.clientX, e.clientY);
  const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
          handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
  };

  const handleClick = (e) => {
      if (!hasMoved.current) {
          onToggle();
      }
  };

  return (
    <div 
        className="fixed z-[9999]"
        style={{ 
            left: position.x, 
            top: position.y,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            opacity: isOpen ? 0 : 1,
            pointerEvents: isOpen ? 'none' : 'auto',
            transform: isOpen ? 'scale(0.8)' : 'scale(1)',
            touchAction: 'none'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
    >
      <Button
        onClick={handleClick}
        className={cn(
          "rounded-full w-12 h-12 shadow-lg p-0 flex items-center justify-center border-2 border-white dark:border-slate-800 transition-all duration-300",
          "bg-amber-500 hover:bg-amber-600 text-white",
          isDragging && "scale-110 shadow-xl ring-2 ring-amber-400/50"
        )}
        title="Open Notepad"
      >
        <StickyNote className="w-6 h-6" />
        {noteCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-900 pointer-events-none">
                {noteCount}
            </span>
        )}
      </Button>
    </div>
  );
};

export default FloatingNotepadToggle;