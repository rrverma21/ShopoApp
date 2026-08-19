import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDebounce } from '@/hooks/useDebounce';

export const useCategorySearch = (userId, initialCategoryName = '') => {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialCategoryName);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .or(`seller_id.eq.${userId},seller_id.is.null`)
        .order('name');

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!debouncedSearchTerm) return categories;
    
    const lowerTerm = debouncedSearchTerm.toLowerCase();
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(lowerTerm)
    );
  }, [categories, debouncedSearchTerm]);

  return {
    categories,
    filteredCategories,
    searchTerm,
    setSearchTerm,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    refreshCategories: fetchCategories
  };
};