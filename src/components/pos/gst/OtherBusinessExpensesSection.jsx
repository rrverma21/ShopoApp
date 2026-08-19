import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useBusinessExpenses } from '@/hooks/useBusinessExpenses';
import { useToast } from '@/components/ui/use-toast';
import AddExpenseModal from './AddExpenseModal';
import ExpenseListTable from './ExpenseListTable';
import ExpenseFiltersBar from './ExpenseFiltersBar';
import ExpenseSummaryCards from './ExpenseSummaryCards';
import ExpenseDetailsModal from './ExpenseDetailsModal';
import { exportExpensesToCSV } from '@/utils/expenseExportUtils';

const OtherBusinessExpensesSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { expenses, loading, error, addExpense, updateExpense, deleteExpense } = useBusinessExpenses(user?.id);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [filters, setFilters] = useState({
    expenseType: 'All Types',
    paymentMethod: 'All Methods',
    searchDescription: '',
    searchReference: '',
    dateRange: { start: null, end: null }
  });

  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Type filter
      if (filters.expenseType !== 'All Types' && expense.expense_type !== filters.expenseType) {
        return false;
      }

      // Payment method filter
      if (filters.paymentMethod !== 'All Methods' && expense.payment_method !== filters.paymentMethod) {
        return false;
      }

      // Description search
      if (filters.searchDescription && !expense.description?.toLowerCase().includes(filters.searchDescription.toLowerCase())) {
        return false;
      }

      // Reference search
      if (filters.searchReference && !expense.reference_no?.toLowerCase().includes(filters.searchReference.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const expenseDate = new Date(expense.date);
        if (filters.dateRange.start && expenseDate < filters.dateRange.start) {
          return false;
        }
        if (filters.dateRange.end && expenseDate > filters.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, filters]);

  const handleAddExpense = async (data) => {
    try {
      await addExpense(data);
      setIsAddModalOpen(false);
      toast({
        title: 'Success',
        description: 'Business expense added successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add expense',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateExpense = async (data) => {
    try {
      await updateExpense(selectedExpense.id, data);
      setIsAddModalOpen(false);
      setIsEditMode(false);
      setSelectedExpense(null);
      toast({
        title: 'Success',
        description: 'Expense updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update expense',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id);
      toast({
        title: 'Success',
        description: 'Expense deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete expense',
        variant: 'destructive'
      });
    }
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setIsEditMode(true);
    setIsAddModalOpen(true);
  };

  const handleViewDetails = (expense) => {
    setSelectedExpense(expense);
    setIsDetailsModalOpen(true);
  };

  const handleExport = () => {
    try {
      if (filteredExpenses.length === 0) {
        toast({
          title: 'No data to export',
          description: 'There are no expenses matching your current filters.',
          variant: 'destructive'
        });
        return;
      }
      exportExpensesToCSV(filteredExpenses);
      toast({
        title: 'Success',
        description: 'Expenses exported to CSV successfully'
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export expenses',
        variant: 'destructive'
      });
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load expenses: {error.message}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Other Business Expenses</h2>
          <p className="text-muted-foreground text-sm">Track and manage miscellaneous business expenses for accurate bookkeeping.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" disabled={filteredExpenses.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={() => { setIsEditMode(false); setSelectedExpense(null); setIsAddModalOpen(true); }}
            className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <ExpenseSummaryCards expenses={filteredExpenses} />

      {/* Filters */}
      <ExpenseFiltersBar filters={filters} onFiltersChange={setFilters} />

      {/* Expense List */}
      <ExpenseListTable 
        expenses={filteredExpenses}
        loading={loading}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
        onViewDetails={handleViewDetails}
      />

      {/* Add/Edit Modal */}
      <AddExpenseModal 
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsEditMode(false); setSelectedExpense(null); }}
        onSubmit={isEditMode ? handleUpdateExpense : handleAddExpense}
        initialData={isEditMode ? selectedExpense : null}
        isLoading={false}
      />

      {/* Details Modal */}
      <ExpenseDetailsModal 
        expense={selectedExpense}
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedExpense(null); }}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
      />
    </div>
  );
};

export default OtherBusinessExpensesSection;