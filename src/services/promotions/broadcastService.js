import { supabase } from '@/lib/supabaseClient';

export const getBroadcasts = async (shopId) => {
    const { data, error } = await supabase.from('broadcasts').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const createBroadcast = async (broadcastData) => {
    const { data, error } = await supabase.from('broadcasts').insert([broadcastData]).select().single();
    if (error) throw error;
    return data;
};