import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';

export const useHSNMaster = () => {
  const { user } = useAuth();
  const [hsnCodes, setHsnCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHSNCodes = useCallback(async () => {
    if (!user?.id) return;

    console.log('[useHSNMaster] Fetching HSN codes for user:', user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hsn_master')
        .select('*')
        .eq('user_id', user.id)
        .order('hsn_code');

      if (error) throw error;
      
      console.log('[useHSNMaster] ✓ Fetched', data?.length || 0, 'HSN codes');
      setHsnCodes(data || []);
      return { success: true, data };
    } catch (error) {
      console.error('[useHSNMaster] ✗ Error fetching HSN codes:', error);
      toast.error('Failed to fetch HSN codes');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHSNCodes();
  }, [fetchHSNCodes]);

  const createHSN = async (hsnData) => {
    console.log('[useHSNMaster] Creating HSN:', hsnData);
    try {
      const { data, error } = await supabase
        .from('hsn_master')
        .insert([{ ...hsnData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      console.log('[useHSNMaster] ✓ HSN created:', data);
      toast.success('HSN code created successfully');
      
      // Wait for refresh to complete
      await fetchHSNCodes();
      return { success: true, data };
    } catch (error) {
      console.error('[useHSNMaster] ✗ Error creating HSN:', error);
      toast.error(error.message || 'Failed to create HSN code');
      return { success: false, error: error.message };
    }
  };

  const updateHSN = async (id, hsnData) => {
    console.log('[useHSNMaster] Updating HSN:', id, hsnData);
    try {
      const { data, error } = await supabase
        .from('hsn_master')
        .update(hsnData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      console.log('[useHSNMaster] ✓ HSN updated:', data);
      toast.success('HSN code updated successfully');
      
      // CRITICAL FIX: Wait for refresh to complete before returning
      await fetchHSNCodes();
      
      return { success: true, data };
    } catch (error) {
      console.error('[useHSNMaster] ✗ Error updating HSN:', error);
      toast.error(error.message || 'Failed to update HSN code');
      return { success: false, error: error.message };
    }
  };

  const deleteHSN = async (id) => {
    console.log('[useHSNMaster] Deleting HSN:', id);
    try {
      const { error } = await supabase
        .from('hsn_master')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('[useHSNMaster] ✓ HSN deleted');
      toast.success('HSN code deleted successfully');
      
      // Wait for refresh to complete
      await fetchHSNCodes();
      return { success: true };
    } catch (error) {
      console.error('[useHSNMaster] ✗ Error deleting HSN:', error);
      toast.error(error.message || 'Failed to delete HSN code');
      return { success: false, error: error.message };
    }
  };

  const getAllCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id, 
          name,
          default_hsn_id
        `)
        .eq('seller_id', user.id)
        .order('name');

      if (error) throw error;

      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('point_of_sale_products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('user_id', user.id)
            .eq('archived', false);

          return {
            ...category,
            product_count: count || 0
          };
        })
      );

      return categoriesWithCounts;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  };

  const getProductsInCategory = async (categoryId, includeManualOverrides = false) => {
    try {
      let query = supabase
        .from('point_of_sale_products')
        .select(`
          id,
          name,
          sku,
          hsn_id,
          manual_hsn_override,
          hsn_master (
            id,
            hsn_code,
            label,
            gst_percentage
          )
        `)
        .eq('category_id', categoryId)
        .eq('user_id', user.id)
        .eq('archived', false);

      if (!includeManualOverrides) {
        query = query.or('manual_hsn_override.is.null,manual_hsn_override.eq.false');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  };

  const getProductsWithManualOverrideInCategory = async (categoryId) => {
    try {
      const { data, error } = await supabase
        .from('point_of_sale_products')
        .select('id, name, sku')
        .eq('category_id', categoryId)
        .eq('user_id', user.id)
        .eq('archived', false)
        .eq('manual_hsn_override', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching manual override products:', error);
      throw error;
    }
  };

  const applyHSNToCategory = async (hsnId, categoryId, includeManualOverrides = false) => {
    try {
      const { data, error } = await supabase.rpc('apply_hsn_to_category', {
        p_hsn_id: hsnId,
        p_category_id: categoryId,
        p_user_id: user.id,
        p_include_manual_overrides: includeManualOverrides
      });

      if (error) throw error;

      toast.success(`Successfully updated ${data || 0} product(s)`);
      return { success: true, updatedCount: data || 0 };
    } catch (error) {
      console.error('Error applying HSN to category:', error);
      toast.error(error.message || 'Failed to apply HSN to category');
      return { success: false, error: error.message, updatedCount: 0 };
    }
  };

  const getHSNUsageStats = async () => {
    try {
      if (!user?.id) return { data: null };

      // Get all HSN codes for the user
      const { data: hsnData, error: hsnError } = await supabase
        .from('hsn_master')
        .select('id, hsn_code, label, gst_percentage')
        .eq('user_id', user.id);

      if (hsnError) throw hsnError;

      // Get products using each HSN
      const { data: productsData, error: productsError } = await supabase
        .from('point_of_sale_products')
        .select('hsn_id')
        .eq('user_id', user.id)
        .eq('archived', false)
        .not('hsn_id', 'is', null);

      if (productsError) throw productsError;

      // Get categories using HSN
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('default_hsn_id')
        .eq('seller_id', user.id)
        .not('default_hsn_id', 'is', null);

      if (categoriesError) throw categoriesError;

      // Count products by HSN
      const hsnProductCount = {};
      productsData.forEach(product => {
        if (product.hsn_id) {
          hsnProductCount[product.hsn_id] = (hsnProductCount[product.hsn_id] || 0) + 1;
        }
      });

      // Find most used HSN
      let mostUsedHSN = null;
      let maxCount = 0;
      Object.entries(hsnProductCount).forEach(([hsnId, count]) => {
        if (count > maxCount) {
          maxCount = count;
          const hsn = hsnData.find(h => h.id === hsnId);
          if (hsn) {
            mostUsedHSN = { ...hsn, productCount: count };
          }
        }
      });

      // GST rate distribution
      const gstRateMap = {};
      hsnData.forEach(hsn => {
        const rate = hsn.gst_percentage || 0;
        gstRateMap[rate] = (gstRateMap[rate] || 0) + 1;
      });

      const gstRateDistribution = Object.entries(gstRateMap)
        .map(([rate, count]) => ({ rate: parseFloat(rate), count }))
        .sort((a, b) => a.rate - b.rate);

      const stats = {
        totalHSN: hsnData.length,
        productsUsingHSN: productsData.length,
        categoriesUsingHSN: categoriesData.length,
        mostUsedHSN,
        gstRateDistribution
      };

      return { data: stats };
    } catch (error) {
      console.error('Error fetching HSN usage stats:', error);
      toast.error('Failed to fetch HSN statistics');
      return { data: null, error: error.message };
    }
  };

  const subscribeToHSNChanges = (callback) => {
    if (!user?.id) {
      console.warn('[useHSNMaster] Cannot subscribe: user not authenticated');
      return () => {};
    }

    console.log('[useHSNMaster] Setting up real-time subscription for user:', user.id);

    try {
      const channel = supabase
        .channel('hsn_master_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hsn_master',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[useHSNMaster] Real-time event:', payload.eventType, payload);
            
            // CRITICAL FIX: Update local state immediately based on event type
            if (payload.eventType === 'INSERT') {
              console.log('[useHSNMaster] → Adding new HSN to state');
              setHsnCodes(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              console.log('[useHSNMaster] → Updating HSN in state');
              setHsnCodes(prev => 
                prev.map(hsn => hsn.id === payload.new.id ? payload.new : hsn)
              );
            } else if (payload.eventType === 'DELETE') {
              console.log('[useHSNMaster] → Removing HSN from state');
              setHsnCodes(prev => prev.filter(hsn => hsn.id !== payload.old.id));
            }
            
            // Also call the provided callback
            if (callback && typeof callback === 'function') {
              callback(payload);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[useHSNMaster] ✓ Successfully subscribed to HSN changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useHSNMaster] ✗ Subscription error:', status);
          }
        });

      return () => {
        console.log('[useHSNMaster] Unsubscribing from HSN changes');
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('[useHSNMaster] ✗ Error subscribing to HSN changes:', error);
      return () => {};
    }
  };

  return {
    hsnCodes,
    loading,
    fetchHSNCodes,
    createHSN,
    updateHSN,
    deleteHSN,
    getAllCategories,
    getProductsInCategory,
    getProductsWithManualOverrideInCategory,
    applyHSNToCategory,
    getHSNUsageStats,
    subscribeToHSNChanges
  };
};