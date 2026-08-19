import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDebounce } from '@/hooks/useDebounce';

export const useCustomerSearch = (searchTerm, userId, selectedCustomer) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Debounce the search term to avoid excessive API calls
  const debouncedTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    // 1. Clear results if search term is too short
    if (!debouncedTerm || debouncedTerm.trim().length < 2) {
      setResults([]);
      return;
    }

    // 2. Don't search if the term matches the currently selected customer (to prevent re-opening dropdown after selection)
    if (selectedCustomer) {
        const isPhoneMatch = selectedCustomer.phone === debouncedTerm;
        const isNameMatch = selectedCustomer.name === debouncedTerm;
        if (isPhoneMatch || isNameMatch) {
            return;
        }
    }

    const searchCustomers = async () => {
      setLoading(true);
      setError(null);
      try {
        const cleanTerm = debouncedTerm.trim();
        
        // Search across name, phone, and email
        // Using ilike for case-insensitive matching
        const { data, error } = await supabase
          .from('point_of_sale_customers')
          .select('id, name, phone, email, address, loyalty_points')
          .eq('user_id', userId)
          .or(`name.ilike.%${cleanTerm}%,phone.ilike.%${cleanTerm}%,email.ilike.%${cleanTerm}%`)
          .limit(10)
          .order('name'); // Prioritize alphabetical order for consistent UX

        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error('Customer search error:', err);
        setError(err);
        setResults([]); // Clear results on error to avoid stale data
      } finally {
        setLoading(false);
      }
    };

    searchCustomers();
  }, [debouncedTerm, userId, selectedCustomer]);

  return { results, loading, error };
};