import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';

export const useProductCategories = () => {
  const { user } = useAuth();
  const posUserId = user?.posOwnerId || user?.id;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories with accurate product counts
  const fetchCategories = useCallback(async () => {
    if (!posUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch all categories for this user
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('seller_id', posUserId)
        .order('name');

      if (categoriesError) throw categoriesError;

      // For each category, count products using BOTH category_id AND category text field
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          // Count products where:
          // 1. category_id matches (relational link), OR
          // 2. category text field matches category name (case-insensitive, legacy/text-based link)
          const { count, error: countError } = await supabase
            .from('point_of_sale_products')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', posUserId)
            .eq('archived', false)
            .or(`category_id.eq.${category.id},category.ilike.${category.name}`);

          if (countError) {
            console.error('Error counting products for category:', category.name, countError);
            return { ...category, product_count: 0 };
          }

          return {
            ...category,
            product_count: count || 0
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [posUserId]);

  // Create new category
  const createProductCategory = async (name, description = '', color = '', icon = '') => {
    if (!posUserId) {
      toast.error('User not authenticated');
      return { success: false };
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          seller_id: posUserId,
          name,
          description,
          color,
          icon
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(`Category "${name}" created successfully`);
      await fetchCategories(); // Refresh the list
      return { success: true, data };
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error(error.message || 'Failed to create category');
      return { success: false, error };
    }
  };

  // Update category
  const updateProductCategory = async (id, name, description = '', color = '', icon = '') => {
    if (!posUserId) {
      toast.error('User not authenticated');
      return { success: false };
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .update({
          name,
          description,
          color,
          icon,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('seller_id', posUserId)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Category "${name}" updated successfully`);
      await fetchCategories(); // Refresh the list
      return { success: true, data };
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.message || 'Failed to update category');
      return { success: false, error };
    }
  };

  // Delete category
  const deleteProductCategory = async (id) => {
    if (!posUserId) {
      toast.error('User not authenticated');
      return { success: false };
    }

    try {
      // First check if category has products (using same logic as count)
      const category = categories.find(c => c.id === id);
      
      if (!category) {
        toast.error('Category not found');
        return { success: false };
      }

      // Double-check product count before deletion
      const { count, error: countError } = await supabase
        .from('point_of_sale_products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', posUserId)
        .eq('archived', false)
        .or(`category_id.eq.${id},category.ilike.${category.name}`);

      if (countError) throw countError;

      if (count > 0) {
        toast.error(
          `Cannot delete category "${category.name}" because it contains ${count} product${count > 1 ? 's' : ''}. Please reassign or delete these products first.`,
          { duration: 5000 }
        );
        return { success: false, productCount: count };
      }

      // Proceed with deletion
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('seller_id', posUserId);

      if (error) throw error;

      toast.success(`Category "${category.name}" deleted successfully`);
      await fetchCategories(); // Refresh the list
      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.message || 'Failed to delete category');
      return { success: false, error };
    }
  };

  // Subscribe to real-time changes
  const subscribeToProductCategoryChanges = useCallback((callback) => {
    if (!posUserId) return null;

    const channel = supabase
      .channel('product_categories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `seller_id=eq.${posUserId}`
        },
        (payload) => {
          console.log('Category change detected:', payload);
          fetchCategories(); // Refresh on any change
          if (callback) callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [posUserId, fetchCategories]);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    createProductCategory,
    updateProductCategory,
    deleteProductCategory,
    subscribeToProductCategoryChanges,
    refreshCategories: fetchCategories
  };
};