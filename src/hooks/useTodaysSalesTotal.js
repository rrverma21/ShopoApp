import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Set to true to enable verbose real-time event debugging
const DEBUG_MODE = true;

const log = (...args) => {
  if (DEBUG_MODE) {
    console.log('[useTodaysSalesTotal]', ...args);
  }
};

export const useTodaysSalesTotal = () => {
  const { user } = useAuth();
  const [todaysSalesTotal, setTodaysSalesTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currency] = useState('₹');

  // Track last update to avoid unnecessary state updates
  const lastTotalRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let subscription = null;
    let pollInterval = null;

    const fetchTodaysSales = async (source = 'initial') => {
      log(`Fetching sales via query (source: ${source})...`);
      try {
        if (source === 'initial') setIsLoading(true);
        
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const { data, error: fetchError } = await supabase
          .from('point_of_sale_sales')
          .select('total_amount')
          .eq('user_id', user.id)
          .eq('status', 'Completed')
          .gte('created_at', startOfToday.toISOString())
          .lt('created_at', endOfToday.toISOString());

        if (fetchError) throw fetchError;

        if (isMounted) {
          const sum = data ? data.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) : 0;
          
          if (sum !== lastTotalRef.current) {
            lastTotalRef.current = sum;
            setTodaysSalesTotal(sum);
            log(`State updated. New total: ${sum}`);
          } else {
            log(`No state update needed. Total remains: ${sum}`);
          }
          
          setError(null);
        }
      } catch (err) {
        log('Error fetching today\'s sales:', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Initial fetch
    fetchTodaysSales('initial');

    // Fallback polling mechanism: fetch every 10 seconds just in case real-time misses an event
    pollInterval = setInterval(() => {
      fetchTodaysSales('fallback-polling');
    }, 10000);

    // Subscribe to real-time changes
    try {
        log('Setting up real-time subscription for point_of_sale_sales...');
        const channelName = `public:point_of_sale_sales_todays_total_${Date.now()}`;
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
              
              // Re-fetch to ensure calculations are entirely accurate across all edge cases (taxes, discounts)
              // You could also compute differences locally if payload.new.status === 'Completed' and created_at is today
              fetchTodaysSales('realtime-event');
            }
          )
          .subscribe((status, err) => {
            log(`Subscription status changed to: ${status}`);
            if (err) log('Subscription error:', err);
          });
    } catch (error) {
        console.error('Subscription error:', error);
    }

    return () => {
      log('Unmounting hook: cleaning up polling and subscriptions...');
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user]);

  return { todaysSalesTotal, currency, isLoading, error };
};