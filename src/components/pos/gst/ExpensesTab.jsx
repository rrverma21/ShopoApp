import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays } from 'date-fns';
import { fetchExpenses, filterExpenses } from '@/utils/expenseDataUtils';
import { isValidDate } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

import ExpenseFilters from './ExpenseFilters';
import ExpenseSummaryStats from './ExpenseSummaryStats';
import ExpenseCharts from './ExpenseCharts';
import ExpenseBreakdownByVendor from './ExpenseBreakdownByVendor';
import ExpenseList from './ExpenseList';
import AddExpenseModal from './AddExpenseModal';

const ExpensesTab = ({ sellerId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: todayStr,
    searchQuery: '',
    category: 'all',
    paymentMethod: 'all',
    expenseType: 'all'
  });

  const loadData = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses(sellerId, {
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      
      // Data integrity check logging
      const invalidData = data.filter(e => !isValidDate(e.date));
      if (invalidData.length > 0) {
        console.warn(`Data Integrity Warning: Found ${invalidData.length} expenses with invalid dates in database.`);
      }
      
      setRawData(data);
    } catch (err) {
      setError(err);
      toast({
        title: "Error loading expenses",
        description: err.message || "Failed to load data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [sellerId, filters.startDate, filters.endDate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscription for purchase_bills and custom_expenses updates
  useEffect(() => {
    if (!sellerId) return;

    const channel1 = supabase.channel('schema-db-changes-pb')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_bills', filter: `user_id=eq.${sellerId}` }, () => { setTimeout(loadData, 500); })
      .subscribe();

    const channel2 = supabase.channel('schema-db-changes-ce')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_expenses', filter: `seller_id=eq.${sellerId}` }, () => { setTimeout(loadData, 500); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [sellerId, loadData]);

  const handleResetFilters = () => {
    setFilters({
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      searchQuery: '',
      category: 'all',
      paymentMethod: 'all',
      expenseType: 'all'
    });
  };

  const handleVendorClick = (vendorName) => {
    setFilters(prev => ({ ...prev, searchQuery: vendorName }));
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const filteredData = useMemo(() => {
    return filterExpenses(rawData, filters);
  }, [rawData, filters]);

  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return { totalAmount: 0, totalGst: 0, count: 0 };
    return {
      totalAmount: filteredData.reduce((sum, exp) => sum + exp.total_amount, 0),
      totalGst: filteredData.reduce((sum, exp) => sum + exp.gst_amount, 0),
      count: filteredData.length
    };
  }, [filteredData]);

  return (
    <div className="space-y-2 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Expenses & Bills</h2>
        <Button onClick={openAddModal} className="btn-primary shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Add New Expense
        </Button>
      </div>
      
      <ExpenseFilters 
        filters={filters} 
        setFilters={setFilters} 
        onReset={handleResetFilters} 
      />

      <ExpenseSummaryStats expenses={filteredData} />

      <ExpenseCharts expenses={filteredData} />

      <ExpenseBreakdownByVendor expenses={filteredData} onVendorClick={handleVendorClick} />

      <ExpenseList 
        expenses={filteredData} 
        loading={loading} 
        error={error} 
        onRetry={loadData}
        dateRange={{ start: filters.startDate, end: filters.endDate }}
        stats={stats}
        onEdit={handleEditExpense}
      />

      <AddExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        sellerId={sellerId}
        editExpense={editingExpense}
        onSuccess={loadData}
      />
    </div>
  );
};

export default ExpensesTab;