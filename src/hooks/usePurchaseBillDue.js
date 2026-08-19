import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const usePurchaseBillDue = () => {
  const { user } = useAuth();
  const [totalDue, setTotalDue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currency] = useState('₹');

  const lastTotalRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let subscription = null;
    let pollInterval = null;

    const fetchTotalDue = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('purchase_bills')
          .select('balance_due')
          .eq('user_id', user.id)
          .gt('balance_due', 0);

        if (fetchError) throw fetchError;

        if (isMounted) {
          const sum = data ? data.reduce((acc, curr) => acc + (Number(curr.balance_due) || 0), 0) : 0;
          
          if (sum !== lastTotalRef.current) {
            lastTotalRef.current = sum;
            setTotalDue(sum);
          }
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching total purchase bill due:', err);
        if (isMounted) setError(err.message || 'Failed to fetch due amount');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTotalDue();

    pollInterval = setInterval(fetchTotalDue, 10000);

    try {
        const channelName = `public:purchase_bills_due_${Date.now()}`;
        subscription = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'purchase_bills',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchTotalDue();
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR') console.error('Purchase bills channel error:', err);
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

  const formattedDue = `${currency}${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return { totalDue, formattedDue, isLoading, error };
};