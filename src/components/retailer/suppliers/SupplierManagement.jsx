import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import SuppliersTable from './SuppliersTable';
import SupplierForm from './SupplierForm';

const SupplierManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['dior_suppliers', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dior_suppliers')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const onSupplierChange = () => {
    queryClient.invalidateQueries({ queryKey: ['dior_suppliers', user.id] });
    setIsFormOpen(false);
  };
  
  const handleSyncSuppliers = async () => {
    setIsSyncing(true);
    toast({ title: 'Syncing started...', description: 'Fetching suppliers from your B2B dashboard.' });

    try {
        const { data: b2bSuppliers, error: rpcError } = await supabase.rpc('get_b2b_suppliers_for_dior');
        if (rpcError) throw rpcError;

        if (!b2bSuppliers || b2bSuppliers.length === 0) {
            toast({ title: 'No new suppliers to sync.', variant: 'default' });
            setIsSyncing(false);
            return;
        }

        const existingGstins = new Set(suppliers.map(s => s.gstin).filter(Boolean));
        
        const newSuppliersToInsert = b2bSuppliers
            .filter(b2bSupplier => b2bSupplier.gst_no && !existingGstins.has(b2bSupplier.gst_no))
            .map(b2bSupplier => ({
                user_id: user.id,
                name: b2bSupplier.name,
                gstin: b2bSupplier.gst_no,
            }));

        if (newSuppliersToInsert.length === 0) {
            toast({ title: 'Suppliers are already up-to-date.', variant: 'default' });
            setIsSyncing(false);
            return;
        }

        const { error: insertError } = await supabase.from('dior_suppliers').insert(newSuppliersToInsert);
        if (insertError) throw insertError;

        toast({ title: 'Sync successful!', description: `${newSuppliersToInsert.length} new supplier(s) imported.` });
        onSupplierChange();

    } catch (error) {
        toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsSyncing(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Suppliers</h1>
        <div className="flex gap-2">
            <Button onClick={handleSyncSuppliers} disabled={isSyncing} variant="outline" className="bg-white dark:bg-slate-900">
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync from B2B'}
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Supplier</DialogTitle>
                </DialogHeader>
                <SupplierForm onSave={onSupplierChange} />
            </DialogContent>
            </Dialog>
        </div>
      </div>
      <SuppliersTable
        suppliers={suppliers || []}
        isLoading={isLoading}
        onSupplierChange={onSupplierChange}
      />
    </div>
  );
};

export default SupplierManagement;