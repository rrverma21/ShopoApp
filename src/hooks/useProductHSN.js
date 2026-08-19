import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const useProductHSN = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get product HSN details with category and HSN master data
  const getProductHSN = useCallback(async (productId) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('point_of_sale_products')
        .select(`
          id,
          name,
          hsn_id,
          manual_hsn_override,
          category_id,
          categories:category_id (
            id,
            name,
            default_hsn_id,
            category_hsn:default_hsn_id (
              id,
              hsn_code,
              gst_percentage,
              label,
              description
            )
          ),
          hsn_master:hsn_id (
            id,
            hsn_code,
            gst_percentage,
            label,
            description
          )
        `)
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      return {
        success: true,
        data: {
          ...data,
          inherited_hsn: data.categories?.category_hsn,
          current_hsn: data.manual_hsn_override ? data.hsn_master : data.categories?.category_hsn
        }
      };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update product HSN configuration
  const updateProductHSN = useCallback(async (productId, hsnId, manualOverride) => {
    setLoading(true);
    setError(null);

    try {
      const updateData = {
        hsn_id: hsnId,
        manual_hsn_override: manualOverride
      };

      const { data, error: updateError } = await supabase
        .from('point_of_sale_products')
        .update(updateData)
        .eq('id', productId)
        .select()
        .single();

      if (updateError) throw updateError;

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all products using a specific HSN
  const getProductsByHSN = useCallback(async (hsnId) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('point_of_sale_products')
        .select(`
          id,
          name,
          sku,
          selling_price,
          stock_level,
          manual_hsn_override,
          hsn_master:hsn_id (
            id,
            hsn_code,
            gst_percentage,
            label
          ),
          categories:category_id (
            name
          )
        `)
        .eq('hsn_id', hsnId)
        .order('name');

      if (fetchError) throw fetchError;

      return { success: true, data: data || [] };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message, data: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all products with a specific GST rate
  const getProductsByGST = useCallback(async (gstRate) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('point_of_sale_products')
        .select(`
          id,
          name,
          sku,
          selling_price,
          stock_level,
          manual_hsn_override,
          hsn_master:hsn_id (
            id,
            hsn_code,
            gst_percentage,
            label
          ),
          categories:category_id (
            name
          )
        `)
        .not('hsn_id', 'is', null)
        .order('name');

      if (fetchError) throw fetchError;

      // Filter by GST rate (since we can't join filter on nested relation)
      const filtered = (data || []).filter(
        product => product.hsn_master?.gst_percentage === gstRate
      );

      return { success: true, data: filtered };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message, data: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all products with manual HSN override
  const getProductsWithManualOverride = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('point_of_sale_products')
        .select(`
          id,
          name,
          sku,
          selling_price,
          stock_level,
          manual_hsn_override,
          hsn_master:hsn_id (
            id,
            hsn_code,
            gst_percentage,
            label
          ),
          categories:category_id (
            name,
            category_hsn:default_hsn_id (
              hsn_code,
              gst_percentage,
              label
            )
          )
        `)
        .eq('manual_hsn_override', true)
        .order('name');

      if (fetchError) throw fetchError;

      return { success: true, data: data || [] };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message, data: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to product HSN changes
  const subscribeToProductHSN = useCallback((productId, callback) => {
    const channel = supabase
      .channel(`product-hsn-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'point_of_sale_products',
          filter: `id=eq.${productId}`
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    loading,
    error,
    getProductHSN,
    updateProductHSN,
    getProductsByHSN,
    getProductsByGST,
    getProductsWithManualOverride,
    subscribeToProductHSN
  };
};