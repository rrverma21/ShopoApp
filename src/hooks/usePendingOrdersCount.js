import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Hook to track the count of pending orders from the 'booked_orders' table.
 * Specifically for orders booked by Sales Executives that need to be processed in POS.
 */
export function usePendingOrdersCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // We check 'booked_orders' table as these represent orders from Sales Executives
      const { count: pendingCount, error: fetchError } = await supabase
        .from('booked_orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('order_status', 'Pending');

      if (fetchError) throw fetchError;
      setCount(pendingCount || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching pending booked orders count:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchCount();

    // Set up realtime subscription to 'booked_orders'
    const channel = supabase
      .channel('pending-booked-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booked_orders',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount]);

  return { count, loading, error };
}