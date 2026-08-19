import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { PlusCircle, Filter, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';

import BillsTable from '@/components/retailer/bills/BillsTable';
import AddBillForm from '@/components/retailer/bills/AddBillForm';
import BillsSummary from '@/components/retailer/bills/BillsSummary';
import BillsFilters from '@/components/retailer/bills/BillsFilters';
import PendingBillsBySupplier from '@/components/retailer/bills/PendingBillsBySupplier';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const BillsRegister = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    paymentMethod: 'all',
    dateRange: { from: null, to: null }
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['dior_bill_categories', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dior_bill_categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const { data: bills, isLoading: isLoadingBills } = useQuery({
    queryKey: ['dior_bills', user.id, debouncedSearchTerm, filters],
    queryFn: async () => {
      let query = supabase
        .from('dior_bills')
        .select(`
          *,
          category:dior_bill_categories(name)
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(`description.ilike.%${debouncedSearchTerm}%,bill_number.ilike.%${debouncedSearchTerm}%,supplier_name.ilike.%${debouncedSearchTerm}%`);
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.category !== 'all') {
        query = query.eq('category_id', filters.category);
      }
      if (filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters.dateRange.from) {
        query = query.gte('due_date', filters.dateRange.from.toISOString().split('T')[0]);
      }
      if (filters.dateRange.to) {
        query = query.lte('due_date', filters.dateRange.to.toISOString().split('T')[0]);
      }
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      return data;
    },
    enabled: !!user,
  });

  const onBillAdded = () => {
    setIsFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ['dior_bills'] });
    queryClient.invalidateQueries({ queryKey: ['dior_bills_summary'] });
    queryClient.invalidateQueries({ queryKey: ['dior_monthly_bills_analytics'] });
  };
  
  const onBillUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['dior_bills'] });
    queryClient.invalidateQueries({ queryKey: ['dior_bills_summary'] });
    queryClient.invalidateQueries({ queryKey: ['dior_monthly_bills_analytics'] });
  };

  const onBillDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ['dior_bills'] });
    queryClient.invalidateQueries({ queryKey: ['dior_bills_summary'] });
    queryClient.invalidateQueries({ queryKey: ['dior_monthly_bills_analytics'] });
  };

  const unpaidBills = useMemo(() => (bills || []).filter(bill => bill.status === 'unpaid'), [bills]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Bills Register</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Add New Bill</DialogTitle>
            </DialogHeader>
            <AddBillForm
              categories={categories || []}
              onBillAdded={onBillAdded}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <BillsSummary bills={bills || []} />

      <PendingBillsBySupplier bills={unpaidBills} isLoading={isLoadingBills} />

      <div className="bg-card p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by description or bill number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Button variant="outline" onClick={() => setIsFiltersOpen(!isFiltersOpen)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
        
        {isFiltersOpen && (
          <BillsFilters 
            filters={filters}
            setFilters={setFilters}
            categories={categories || []}
          />
        )}
      </div>

      <BillsTable
        bills={bills || []}
        isLoading={isLoadingBills || isLoadingCategories}
        categories={categories || []}
        onBillUpdated={onBillUpdated}
        onBillDeleted={onBillDeleted}
      />
    </div>
  );
};

export default BillsRegister;