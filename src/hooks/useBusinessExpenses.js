import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Custom hook for managing business expenses
 * @param {string} userId - Current user ID
 * @returns {Object} - Expenses data and operations
 */
export const useBusinessExpenses = (userId) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all expenses for user
  const fetchExpenses = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('business_expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      setExpenses(data || []);
    } catch (err) {
      console.error('Error fetching business expenses:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Add new expense
  const addExpense = useCallback(async (expenseData) => {
    if (!userId) throw new Error('User ID is required');

    const { data, error: insertError } = await supabase
      .from('business_expenses')
      .insert([{ ...expenseData, user_id: userId }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Optimistically update state
    setExpenses(prev => [data, ...prev]);
    return data;
  }, [userId]);

  // Update existing expense
  const updateExpense = useCallback(async (id, updates) => {
    if (!id) throw new Error('Expense ID is required');

    const { data, error: updateError } = await supabase
      .from('business_expenses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Optimistically update state
    setExpenses(prev => prev.map(exp => exp.id === id ? data : exp));
    return data;
  }, [userId]);

  // Delete expense
  const deleteExpense = useCallback(async (id) => {
    if (!id) throw new Error('Expense ID is required');

    const { error: deleteError } = await supabase
      .from('business_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Optimistically update state
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  }, [userId]);

  // Get expenses by type
  const getExpensesByType = useCallback((expenseType) => {
    if (!expenseType || expenseType === 'all') return expenses;
    return expenses.filter(exp => exp.expense_type === expenseType);
  }, [expenses]);

  // Initial fetch
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('business_expenses_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'business_expenses',
        filter: `user_id=eq.${userId}`
      }, () => {
        // Refetch on any change
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchExpenses]);

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByType,
    refetch: fetchExpenses
  };
};