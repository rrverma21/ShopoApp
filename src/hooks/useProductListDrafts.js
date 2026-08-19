import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useProductListDrafts = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [drafts, setDrafts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchDrafts = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('product_list_drafts')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setDrafts(data || []);
        } catch (error) {
            console.error('Error fetching product list drafts:', error);
            toast({
                title: 'Error',
                description: 'Failed to load drafts.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    const saveDraft = async (draftData, draftId = null) => {
        if (!user) return null;
        setIsLoading(true);
        try {
            const payload = {
                user_id: user.id,
                supplier_id: draftData.supplier_id || null,
                supplier_info: draftData.supplier_info || {},
                product_list: draftData.product_list || [],
                status: draftData.status || 'draft',
                updated_at: new Date().toISOString()
            };

            let result;
            if (draftId) {
                const { data, error } = await supabase
                    .from('product_list_drafts')
                    .update(payload)
                    .eq('id', draftId)
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            } else {
                const { data, error } = await supabase
                    .from('product_list_drafts')
                    .insert([payload])
                    .select()
                    .single();
                if (error) throw error;
                result = data;
            }
            
            await fetchDrafts();
            return result;
        } catch (error) {
            console.error('Error saving product list draft:', error);
            toast({
                title: 'Error',
                description: 'Failed to save draft.',
                variant: 'destructive',
            });
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteDraft = async (draftId) => {
        if (!user || !draftId) return false;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('product_list_drafts')
                .delete()
                .eq('id', draftId);
            
            if (error) throw error;
            
            setDrafts(prev => prev.filter(d => d.id !== draftId));
            return true;
        } catch (error) {
            console.error('Error deleting draft:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete draft.',
                variant: 'destructive',
            });
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        drafts,
        isLoading,
        fetchDrafts,
        saveDraft,
        deleteDraft
    };
};