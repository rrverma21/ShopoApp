import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useDiorSuppliers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dior_suppliers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('dior_suppliers')
        .select('id, name, gstin')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching suppliers:', error);
        throw new Error(error.message);
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2
  });
};