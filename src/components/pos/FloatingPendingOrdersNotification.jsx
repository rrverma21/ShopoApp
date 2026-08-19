import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePosData } from '@/contexts/PosDataContext';
import { usePendingOrdersCount } from '@/hooks/useNewOrdersCount';
import { cn } from '@/lib/utils';

const FloatingPendingOrdersNotification = () => {
  const navigate = useNavigate();
  const { businessId } = usePosData();
  const { pendingCount } = usePendingOrdersCount(businessId);
  const [isVisible, setIsVisible] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Persistence logic for Position and Dismissal
  useEffect(() => {
    // Check session dismissal
    const dismissed = sessionStorage.getItem('pos_pending_badge_dismissed');
    if (dismissed) {
      setIsVisible(false);
    }

    // Check saved position
    try {
      const savedPos = localStorage.getItem('pos_pending_badge_pos');
      if (savedPos) {
        setOffset(JSON.parse(savedPos));
      }
    } catch (e) {
      console.error("Failed to load badge position", e);
    }
    
    setIsLoaded(true);
  }, []);

  // Re-show logic if needed, but respecting session dismissal for now unless count increases from 0
  // Task implies simple count tracking. If users dismisses, we keep it hidden for session.
  // However, if a *new* order comes (count increases), it might be good to show it.
  // For strict adherence to "dismiss for the session", we won't auto-reshow. 
  // We only hide if count becomes 0.
  useEffect(() => {
    if (pendingCount === 0) {
      setIsVisible(false);
    } else {
        const dismissed = sessionStorage.getItem('pos_pending_badge_dismissed');
        if (!dismissed) setIsVisible(true);
    }
  }, [pendingCount]);

  const handleDismiss = (e) => {
    e.stopPropagation(); // Prevent navigation click
    setIsVisible(false);
    sessionStorage.setItem('pos_pending_badge_dismissed', 'true');
  };

  const handleDragEnd = (event, info) => {
    // Update the offset based on drag distance
    const newOffset = {
      x: offset.x + info.offset.x,
      y: offset.y + info.offset.y
    };
    setOffset(newOffset);
    localStorage.setItem('pos_pending_badge_pos', JSON.stringify(newOffset));
  };

  const handleClick = () => {
    navigate('/pos/orders');
  };

  // Render conditions
  if (!isLoaded || pendingCount <= 0 || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0, x: offset.x, y: offset.y }}
        animate={{ opacity: 1, scale: 1, x: offset.x, y: offset.y }}
        exit={{ opacity: 0, scale: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className={cn(
          "fixed bottom-20 right-4 z-50 block md:hidden", // Mobile only, fixed positioning (80px bottom, 16px right)
          "cursor-grab active:cursor-grabbing touch-none select-none"
        )}
      >
        <div className="relative group">
          {/* Main Badge Circle */}
          <div className="relative flex flex-col items-center justify-center w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl border-2 border-white dark:border-slate-800 z-10 overflow-hidden">
            <span className="font-bold text-xl leading-none tracking-tighter">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
            <span className="text-[8px] uppercase font-bold tracking-wide mt-0.5 opacity-90">
              Orders
            </span>
            
            {/* Glossy Effect overlay */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 rounded-t-full pointer-events-none" />
          </div>

          {/* Pulse Ring Animation */}
          <span className="absolute inset-0 rounded-full bg-red-500 opacity-75 animate-ping -z-10 pointer-events-none"></span>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="absolute -top-2 -left-2 bg-slate-900 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center shadow-lg border border-slate-700 hover:bg-red-600 transition-colors z-30"
            aria-label="Dismiss notification"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingPendingOrdersNotification;