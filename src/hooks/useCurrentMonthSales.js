import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { formatPrice } from '@/lib/utils';

// Set to true to enable verbose debugging
const DEBUG_MODE = false;

const log = (...args) => {
  if (DEBUG_MODE) {
    console.log('[useCurrentMonthSales]', ...args);
  }
};

export const useCurrentMonthSales = () => {
  const { user } = useAuth();
  const [currentMonthSales, setCurrentMonthSales] = useState(0);
  const [formattedMonthSales, setFormattedMonthSales] = useState('₹0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track last update to avoid unnecessary state updates
  const lastTotalRef = useRef(0);

  const formatMonthSales = useCallback((amount) => {
    const num = Number(amount) || 0;
    if (num >= 1000000) return `₹${(num / 1000000).toFixed(1)}M`;
    if (num >= 10000) return `₹${(num / 1000).toFixed(1)}K`;
    return formatPrice(num);
  }, []);

  const fetchCurrentMonthSales = useCallback(async (source = 'initial') => {
    if (!user) return;

    log(`Fetching current month sales (source: ${source})...`);
    
    try {
      if (source === 'initial') setIsLoading(true);

      // CRITICAL: Match exact date range logic from PosReports.jsx
      // This ensures both components query the same time period
      const now = new Date();
      const fromDate = startOfDay(startOfMonth(now));
      const toDate = endOfDay(endOfMonth(now));

      log('Date range:', { from: fromDate.toISOString(), to: toDate.toISOString() });

      // CRITICAL: Use pagination to handle large datasets (same as PosReports.jsx)
      let accumulatedData = [];
      let page = 0;
      const PAGE_SIZE = 1000;
      let hasNextPage = true;

      while (hasNextPage) {
        const { data, error: fetchError } = await supabase
          .from('point_of_sale_sales')
          .select('total_amount, refund_amount')
          .eq('user_id', user.id)
          .gte('created_at', fromDate.toISOString())
          .lte('created_at', toDate.toISOString())
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          accumulatedData = [...accumulatedData, ...data];
          if (data.length < PAGE_SIZE) {
            hasNextPage = false;
          } else {
            page++;
          }
        } else {
          hasNextPage = false;
        }
      }

      // CRITICAL: Match exact calculation from PosReports.jsx (lines 188-191)
      // Net Sales = SUM(total_amount)
      // total_amount already has refunds deducted (per DB trigger)
      const netSales = accumulatedData.reduce((sum, sale) => {
        return sum + (Number(sale.total_amount) || 0);
      }, 0);

      log(`Raw net sales: ${netSales}, Previous: ${lastTotalRef.current}`);

      // Only update state if value changed (prevents unnecessary re-renders)
      if (netSales !== lastTotalRef.current) {
        lastTotalRef.current = netSales;
        setCurrentMonthSales(netSales);
        setFormattedMonthSales(formatMonthSales(netSales));
        log(`State updated. New total: ${netSales}, Formatted: ${formatMonthSales(netSales)}`);
      } else {
        log(`No state update needed. Total remains: ${netSales}`);
      }

      setError(null);
    } catch (err) {
      log('Error fetching current month sales:', err);
      console.error('[useCurrentMonthSales] Error:', err);
      setError(err);
    } finally {
      if (source === 'initial') setIsLoading(false);
    }
  }, [user, formatMonthSales]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let subscription = null;
    let pollInterval = null;

    // Initial fetch
    fetchCurrentMonthSales('initial');

    // Fallback polling: fetch every 15 seconds in case real-time misses updates
    pollInterval = setInterval(() => {
      if (isMounted) {
        fetchCurrentMonthSales('fallback-polling');
      }
    }, 15000);

    // Real-time subscription for instant updates
    try {
      log('Setting up real-time subscription...');
      const channelName = `public:point_of_sale_sales_month_${Date.now()}`;
      
      subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'point_of_sale_sales',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            log('Real-time event received:', payload.eventType, payload.new || payload.old);
            if (isMounted) {
              fetchCurrentMonthSales('realtime-event');
            }
          }
        )
        .subscribe((status, err) => {
          log(`Subscription status: ${status}`);
          if (err) log('Subscription error:', err);
        });
    } catch (error) {
      console.error('[useCurrentMonthSales] Subscription error:', error);
    }

    return () => {
      log('Unmounting hook: cleaning up...');
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user, fetchCurrentMonthSales]);

  return { 
    currentMonthSales, 
    formattedMonthSales, 
    isLoading, 
    error 
  };
};