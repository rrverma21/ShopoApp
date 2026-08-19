import { supabase } from '@/lib/supabaseClient';

export const getSegments = async (shopId) => {
    const { data, error } = await supabase.from('customer_segments').select('*').eq('shop_id', shopId);
    if (error) throw error;
    return data;
};

export const createSegment = async (segmentData) => {
    const { data, error } = await supabase.from('customer_segments').insert([segmentData]).select().single();
    if (error) throw error;
    return data;
};