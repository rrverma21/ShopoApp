import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import SupplierForm from './SupplierForm';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const SupplierModal = ({ isOpen, onClose, onSuppliersChange }) => {
  const { user } = useAuth();
  
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isFormView, setIsFormView] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchSuppliers();
    } else {
      setIsFormView(false);
      setEditingSupplier(null);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      setFilteredSuppliers(suppliers.filter(s => 
        s.name.toLowerCase().includes(q) || 
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
      ));
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [search, suppliers]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('seller_id', user.id)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      window.alert('Error fetching suppliers: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setIsFormView(true);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsFormView(true);
  };

  const handleDeleteClick = (supplier) => {
    setSupplierToDelete(supplier);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    try {
      // Basic check if bills are linked might throw FK constraint error. Handled in catch.
      const { error } = await supabase.from('suppliers').delete().eq('id', supplierToDelete.id);
      if (error) throw error;
      
      window.alert('Success: Supplier deleted successfully.');
      setDeleteConfirmOpen(false);
      fetchSuppliers();
      if (onSuppliersChange) onSuppliersChange();
    } catch (err) {
      if (err.code === '23503') {
          window.alert('Cannot Delete: This supplier is linked to existing bills or records.');
      } else {
          window.alert('Error: ' + err.message);
      }
    } finally {
      setIsDeleting(false);
      setSupplierToDelete(null);
    }
  };

  const handleSave = () => {
    setIsFormView(false);
    fetchSuppliers();
    if (onSuppliersChange) onSuppliersChange();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isFormView ? (editingSupplier ? 'Edit Supplier' : 'Add Supplier') : 'Manage Suppliers'}</DialogTitle>
            <DialogDescription>
               {isFormView ? 'Enter the details of the supplier.' : 'View, search, and manage your supplier list.'}
            </DialogDescription>
          </DialogHeader>

          {isFormView ? (
            <SupplierForm supplier={editingSupplier} onSave={handleSave} onCancel={() => setIsFormView(false)} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Search suppliers..." 
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" /> Add Supplier
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                        </TableCell>
                      </TableRow>
                    ) : filteredSuppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          No suppliers found. Add one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSuppliers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.contact_person || '-'}</TableCell>
                          <TableCell>{s.email || '-'}</TableCell>
                          <TableCell>{s.phone || '-'}</TableCell>
                          <TableCell>{s.city || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(s)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the supplier "{supplierToDelete?.name}" from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SupplierModal;