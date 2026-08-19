import { supabase } from '@/lib/supabaseClient';

export const trackPromotionEvent = async (promotionId, eventType, orderId = null) => {
    try {
        const { error } = await supabase
            .from('promotion_analytics')
            .insert([{
                promotion_id: promotionId,
                event_type: eventType,
                order_id: orderId
            }]);
            
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Failed to track analytics event:', err);
        return false;
    }
};

export const incrementLinkClicks = async (linkId, type = 'promotion') => {
    try {
        const table = type === 'promotion' ? 'promotion_links' : 'shop_links';
        // Simple RPC would be better, but we can do a read then write if RLS allows, or just a simple update.
        // Assuming RLS allows update or we have a trusted environment.
        const { data } = await supabase.from(table).select('clicks').eq('id', linkId).single();
        if (data) {
             await supabase.from(table).update({ clicks: data.clicks + 1 }).eq('id', linkId);
        }
    } catch (err) {
        console.error('Failed to increment clicks:', err);
    }
};