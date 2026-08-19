import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * In the current schema, Expense Categories act as Ledgers.
 * This hook fetches bill categories to serve as ledger options.
 */
export const useDiorLedgers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dior_ledgers', user?.id], // Using distinct key to allow separate invalidation if needed later
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch categories to usage as ledgers
      const { data, error } = await supabase
        .from('dior_bill_categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching ledgers:', error);
        throw new Error(error.message);
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });
};