import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch categories with product count
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .or(`seller_id.eq.${user.id},seller_id.is.null`)
        .order('name');

      if (categoriesError) throw categoriesError;

      // Then fetch product counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count, error: countError } = await supabase
            .from('point_of_sale_products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('user_id', user.id)
            .eq('archived', false);

          if (countError) {
            console.error('Error counting products for category:', category.id, countError);
          }

          return {
            ...category,
            product_count: count || 0
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.message);
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new category
  const createCategory = useCallback(async (categoryData, onSuccess) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          seller_id: user.id,
          name: categoryData.name,
          description: categoryData.description || null,
          image_url: categoryData.image_url || null,
          color: categoryData.color || null,
          icon: categoryData.icon || null,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Category created successfully');
      await fetchCategories();
      if (onSuccess) onSuccess(data);
      return { success: true, data };
    } catch (err) {
      console.error('Error creating category:', err);
      toast.error(err.message || 'Failed to create category');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Update existing category
  const updateCategory = useCallback(async (categoryId, categoryData, onSuccess) => {
    setLoading(true);
    try {
      const updateData = {
        name: categoryData.name,
        description: categoryData.description || null,
        image_url: categoryData.image_url || null,
        color: categoryData.color || null,
        icon: categoryData.icon || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Category updated successfully');
      await fetchCategories();
      if (onSuccess) onSuccess(data);
      return { success: true, data };
    } catch (err) {
      console.error('Error updating category:', err);
      toast.error(err.message || 'Failed to update category');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Delete category
  const deleteCategory = useCallback(async (categoryId, onSuccess) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if category has products
      const { count, error: countError } = await supabase
        .from('point_of_sale_products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .eq('user_id', user.id)
        .eq('archived', false);

      if (countError) throw countError;

      if (count > 0) {
        // Update products to remove category reference before deletion
        const { error: updateError } = await supabase
          .from('point_of_sale_products')
          .update({ category_id: null })
          .eq('category_id', categoryId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      // Now delete the category
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;

      toast.success(`Category deleted successfully${count > 0 ? ` (${count} products moved to uncategorized)` : ''}`);
      await fetchCategories();
      if (onSuccess) onSuccess();
      return { success: true };
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error(err.message || 'Failed to delete category');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  };
};