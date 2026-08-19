import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useDiorCategories = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dior_bill_categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('dior_bill_categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        throw new Error(error.message);
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2
  });
};