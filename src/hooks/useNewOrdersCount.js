import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const usePendingOrdersCount = (businessId) => {
    const [pendingCount, setPendingCount] = useState(0);
    const isMounted = useRef(true);

    const fetchPendingCount = useCallback(async () => {
        if (!businessId || !isMounted.current) return;

        try {
            const { count, error } = await supabase
                .from('digital_shop_orders')
                .select('*', { count: 'exact', head: true })
                .eq('retailer_id', businessId)
                .eq('status', 'Pending');

            if (error) throw error;
            
            if (isMounted.current) {
                setPendingCount(count || 0);
            }

        } catch (error) {
            console.error("[usePendingOrdersCount] Error fetching count:", error);
        }
    }, [businessId]);

    useEffect(() => {
        isMounted.current = true;
        if (!businessId) return;

        fetchPendingCount();

        let channel;
        try {
            const channelName = `pending-orders-${businessId}-${Date.now()}`;
            channel = supabase.channel(channelName)
                .on('postgres_changes', {
                    event: '*', 
                    schema: 'public',
                    table: 'digital_shop_orders',
                    filter: `retailer_id=eq.${businessId}`
                }, () => {
                    if (isMounted.current) {
                        fetchPendingCount();
                    }
                })
                .subscribe((status, err) => {
                    if (status === 'CHANNEL_ERROR') {
                        console.error(`[usePendingOrdersCount] Channel error for ${channelName}:`, err);
                    }
                });
        } catch (error) {
            console.error('Subscription error:', error);
        }

        const interval = setInterval(fetchPendingCount, 30000);

        return () => {
            isMounted.current = false;
            clearInterval(interval);
            if (channel) supabase.removeChannel(channel);
        };
    }, [businessId, fetchPendingCount]);

    return { pendingCount };
};

export const useNewOrdersCount = (businessId) => {
    const { pendingCount } = usePendingOrdersCount(businessId);
    
    return { 
        unreadCount: pendingCount, 
        markOrdersAsRead: () => {} 
    };
};