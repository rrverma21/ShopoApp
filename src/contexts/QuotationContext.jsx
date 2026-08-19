import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

const QuotationContext = createContext({});

export const QuotationProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchQuotations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_quotations')
        .select(`
          id, user_id, customer_id, quotation_number, quotation_date, quotation_items, subtotal, sgst_total, cgst_total, grand_total, discount_type, discount_value, discount_amount, final_total, status, notes, created_at, updated_at,
          point_of_sale_customers(id, name, phone, firm_name, gstin)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedData = data?.map(q => ({
        ...q,
        customer: q.point_of_sale_customers
      })) || [];
      
      setQuotations(mappedData);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast({ title: 'Error', description: 'Failed to load quotations.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const fetchQuotationById = async (id) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('pos_quotations')
        .select(`
          id, user_id, customer_id, quotation_number, quotation_date, quotation_items, subtotal, sgst_total, cgst_total, grand_total, discount_type, discount_value, discount_amount, final_total, status, notes, created_at, updated_at,
          point_of_sale_customers(id, name, phone, firm_name, gstin)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        data.customer = data.point_of_sale_customers;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast({ title: 'Error', description: 'Failed to load quotation details.', variant: 'destructive' });
      return null;
    }
  };

  const createQuotation = async (quotationData) => {
    if (!user) return null;
    setLoading(true);
    try {
      const qNo = quotationData.quotation_number || `QT-${Date.now().toString().slice(-6)}`;
      
      // Clean up virtual properties before insert
      const { customer, point_of_sale_customers, ...insertData } = quotationData;
      
      const { data, error } = await supabase
        .from('pos_quotations')
        .insert([{ ...insertData, user_id: user.id, quotation_number: qNo }])
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Success', description: 'Quotation created successfully.' });
      fetchQuotations(); 
      return data;
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create quotation.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateQuotation = async (id, quotationData) => {
    if (!user) return null;
    setLoading(true);
    try {
      // Clean up virtual properties before update
      const { customer, point_of_sale_customers, id: _id, user_id, created_at, ...updateData } = quotationData;
      
      const { data, error } = await supabase
        .from('pos_quotations')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Success', description: 'Quotation updated successfully.' });
      fetchQuotations();
      return data;
    } catch (error) {
      console.error('Error updating quotation:', error);
      toast({ title: 'Error', description: 'Failed to update quotation.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateQuotationStatus = async (id, status) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('pos_quotations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: 'Success', description: `Quotation marked as ${status}.` });
      fetchQuotations();
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
      return false;
    }
  };

  const deleteQuotation = async (id) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('pos_quotations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Quotation deleted.' });
      fetchQuotations();
      return true;
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast({ title: 'Error', description: 'Failed to delete quotation.', variant: 'destructive' });
      return false;
    }
  };

  return (
    <QuotationContext.Provider value={{
      quotations,
      loading,
      fetchQuotations,
      fetchQuotationById,
      createQuotation,
      updateQuotation,
      updateQuotationStatus,
      deleteQuotation
    }}>
      {children}
    </QuotationContext.Provider>
  );
};

export const useQuotation = () => useContext(QuotationContext);