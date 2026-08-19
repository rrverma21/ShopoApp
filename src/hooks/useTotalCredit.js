import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useTotalCredit = () => {
  const { user } = useAuth();
  const [totalCredit, setTotalCredit] = useState(0);
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

    const fetchTotalCredit = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('point_of_sale_sales')
          .select('balance_due')
          .eq('user_id', user.id)
          .eq('payment_method', 'Credit')
          .gt('balance_due', 0);

        if (fetchError) throw fetchError;

        if (isMounted) {
          const sum = data ? data.reduce((acc, curr) => acc + (Number(curr.balance_due) || 0), 0) : 0;
          
          if (sum !== lastTotalRef.current) {
            lastTotalRef.current = sum;
            setTotalCredit(sum);
          }
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching total credit:', err);
        if (isMounted) setError(err.message || 'Failed to fetch credit');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Initial fetch
    fetchTotalCredit();

    // Fallback polling mechanism
    pollInterval = setInterval(fetchTotalCredit, 10000);

    // Subscribe to real-time changes
    try {
        const channelName = `public:point_of_sale_sales_total_credit_${Date.now()}`;
        subscription = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'point_of_sale_sales',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchTotalCredit();
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR') console.error('Total credit channel error:', err);
          });
    } catch (error) {
        console.error('Subscription error:', error);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [user]);

  const formattedCredit = `${currency}${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return { totalCredit, formattedCredit, isLoading, error };
};