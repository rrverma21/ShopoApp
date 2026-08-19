import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useWaterOrderNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchNotifications = async () => {
    if (!user || !isMounted.current) {
        setNotifications([]);
        setLoading(false);
        return;
    }
    
    try {
      setLoading(true);
      
      const { data: settings, error: settingsError } = await supabase
        .from('pos_retailer_settings')
        .select('water_delivery_areas')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (settingsError && settingsError.code !== 'PGRST116') {
          console.error("[useWaterOrderNotifications] Error fetching settings:", settingsError);
      }
      
      const deliveryAreas = settings?.water_delivery_areas || [];
      
      let query = supabase
        .from('water_orders')
        .select('id, status, created_at, delivery_area_id, seller_id')
        .eq('status', 'pending');

      if (deliveryAreas.length > 0) {
          const areasStr = `(${deliveryAreas.join(',')})`;
          query = query.or(`seller_id.eq.${user.id},delivery_area_id.in.${areasStr}`);
      } else {
          query = query.eq('seller_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const actionableOrders = (data || []).filter(order => {
          const isAssignedToMe = order.seller_id === user.id;
          const isInMyArea = deliveryAreas.includes(order.delivery_area_id);
          const isUnassigned = !order.seller_id;
          
          return isAssignedToMe || (isInMyArea && isUnassigned);
      });
      
      if (isMounted.current) {
          setNotifications(actionableOrders);
      }
    } catch (error) {
      console.error("[useWaterOrderNotifications] Error fetching notifications:", error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    if (!user) return;

    fetchNotifications();
    
    let channel;
    try {
        const channelName = `water-notifications-${user.id}-${Date.now()}`;
        channel = supabase.channel(channelName)
          .on('postgres_changes', { 
              event: '*', 
              schema: 'public', 
              table: 'water_orders' 
            }, () => {
              if (isMounted.current) fetchNotifications();
            })
          .subscribe((status, err) => {
              if (status === 'CHANNEL_ERROR') {
                  console.error(`[useWaterOrderNotifications] Channel error for ${channelName}:`, err);
              }
          });
    } catch (error) {
        console.error('Subscription error:', error);
    }

    return () => {
      isMounted.current = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  return { notifications, loading, refresh: fetchNotifications };
};