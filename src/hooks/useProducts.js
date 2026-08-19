import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';

/**
 * Custom hook for managing product operations with safe updates
 * Handles category changes without triggering database conflicts
 */
export const useProducts = () => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Safely update a product with conflict resolution
   * Implements retry logic and minimal field updates
   */
  const updateProduct = useCallback(async (productId, updates, originalProduct = null) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 500;

    // Helper function to determine which fields actually changed
    const getChangedFields = (newData, oldData) => {
      if (!oldData) return newData;

      const changed = {};
      Object.keys(newData).forEach(key => {
        // Deep comparison for objects/arrays
        if (JSON.stringify(newData[key]) !== JSON.stringify(oldData[key])) {
          changed[key] = newData[key];
        }
      });
      return changed;
    };

    // Extract only changed fields to minimize update scope
    const changedFields = originalProduct 
      ? getChangedFields(updates, originalProduct)
      : updates;

    // CRITICAL FIX: If only category_id changed, update ONLY that field
    // This prevents conflicts with HSN inheritance triggers
    const updatePayload = Object.keys(changedFields).length === 1 && 'category_id' in changedFields
      ? { category_id: changedFields.category_id }
      : changedFields;

    // Add updated_at timestamp
    updatePayload.updated_at = new Date().toISOString();

    const attemptUpdate = async (retryCount = 0) => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('products')
          .update(updatePayload)
          .eq('id', productId)
          .select(`*, categories(id, name), brands(id, name)`)
          .single();

        if (error) throw error;

        return { data, error: null };
      } catch (error) {
        // Handle "tuple already modified" conflicts with retry logic
        if (
          error.message?.includes('tuple to be updated was already modified') ||
          error.code === '40001' // PostgreSQL serialization failure
        ) {
          if (retryCount < MAX_RETRIES) {
            console.warn(`[useProducts] Conflict detected, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            
            return attemptUpdate(retryCount + 1);
          } else {
            // Max retries exceeded
            return {
              data: null,
              error: {
                ...error,
                message: 'Product update conflict. Please try again in a moment.',
                userFriendly: true
              }
            };
          }
        }

        // Other errors
        return { data: null, error };
      } finally {
        setIsLoading(false);
      }
    };

    return attemptUpdate();
  }, []);

  /**
   * Create a new product
   */
  const createProduct = useCallback(async (productData) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select(`*, categories(id, name), brands(id, name)`)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete a product
   */
  const deleteProduct = useCallback(async (productId) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Toggle product splash sale status
   */
  const toggleSplashSale = useCallback(async (productId, currentStatus) => {
    const newStatus = !currentStatus;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('products')
        .update({ 
          is_splash_sale: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      return { data: newStatus, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Toggle product enabled/disabled status
   */
  const toggleProductStatus = useCallback(async (productId, currentStatus) => {
    const newStatus = !currentStatus;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('products')
        .update({ 
          is_disabled: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      return { data: newStatus, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch products with filters
   */
  const fetchProducts = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('products')
        .select(`*, categories(id, name), brands(id, name)`)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters.brandId) {
        query = query.eq('brand_id', filters.brandId);
      }

      if (filters.isDisabled !== undefined) {
        query = query.eq('is_disabled', filters.isDisabled);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    updateProduct,
    createProduct,
    deleteProduct,
    toggleSplashSale,
    toggleProductStatus,
    fetchProducts,
  };
};