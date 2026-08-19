import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

const FloatingCalculatorToggle = ({ isOpen, onToggle }) => {
  // Initial position: Bottom right, but safe for mobile
  const [position, setPosition] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 80 : 0, 
    y: typeof window !== 'undefined' ? window.innerHeight - 150 : 0 
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const buttonRef = useRef(null);

  // Load position from localStorage on mount
  useEffect(() => {
    try {
      const savedPos = localStorage.getItem('calculatorTogglePosition');
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        // Ensure it's within bounds
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        
        if (parsed.x && parsed.y && parsed.x < window.innerWidth && parsed.y < window.innerHeight) {
            setPosition(parsed);
        } else {
            // Reset if out of bounds (e.g. screen resize)
            setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
        }
      }
    } catch (e) {
      console.error("Error loading calculator toggle position", e);
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
        localStorage.setItem('calculatorTogglePosition', JSON.stringify(position));
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
          // Prevent default to stop scrolling while trying to drag
          // e.preventDefault(); 
          handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
  };

  const handleClick = (e) => {
      if (!hasMoved.current) {
          onToggle();
      }
  };

  if (isOpen) return null; 

  return (
    <div 
        ref={buttonRef}
        className="fixed z-[9999]" // High z-index to ensure visibility on mobile
        style={{ 
            left: position.x, 
            top: position.y,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            touchAction: 'none' 
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
    >
      <Button
        onClick={handleClick}
        className={cn(
          "rounded-full w-12 h-12 shadow-lg p-0 flex items-center justify-center border-2 border-white dark:border-slate-800 transition-all duration-300 bg-indigo-600 hover:bg-indigo-700 text-white",
          isDragging && "scale-110 shadow-xl ring-2 ring-indigo-400/50"
        )}
        title="Open Calculator"
      >
        <Calculator className="w-6 h-6" />
      </Button>
    </div>
  );
};

export default FloatingCalculatorToggle;