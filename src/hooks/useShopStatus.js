import { useState, useEffect, useMemo } from 'react';
import { calculateShopStatus } from '@/utils/shopStatusCalculator';

/**
 * React hook to calculate and auto-refresh shop open/closed status
 * Automatically recalculates status every 60 seconds for real-time updates
 * 
 * @param {Object} settings - pos_retailer_settings object from database
 * @returns {Object} Status object with displayText, icon, color, times, nextAction
 * 
 * @example
 * const status = useShopStatus(shop.pos_retailer_settings);
 * console.log(status.displayText); // "Open Now" | "Closed Now" | "Hours not set"
 * console.log(status.icon); // 'check' | 'x' | null
 * console.log(status.color); // CSS classes for badge styling
 * console.log(status.times); // "9:00 AM - 9:00 PM" or null
 * console.log(status.nextAction); // "Closes at 9:00 PM" or null
 */
export const useShopStatus = (settings) => {
  // State to trigger recalculation every 60 seconds
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Auto-refresh status every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 60000); // 60 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Calculate status (memoized to avoid unnecessary recalculations)
  // Only recalculates when settings change or refreshTrigger updates
  const status = useMemo(() => {
    return calculateShopStatus(settings);
  }, [settings, refreshTrigger]);

  return status;
};