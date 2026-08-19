import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Pencil, Trash2, Store, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ShopTypeForm from './ShopTypeForm';

const ShopTypesManagement = () => {
  const [shopTypes, setShopTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentShopType, setCurrentShopType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchShopTypes();
  }, []);

  const fetchShopTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setShopTypes(data || []);
    } catch (error) {
      console.error('Error fetching shop types:', error);
      toast({
        title: "Error",
        description: "Failed to load shop types.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('shop_types')
        .insert([{
          ...formData,
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      setShopTypes(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Shop type created successfully." });
    } catch (error) {
      console.error('Error creating shop type:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (formData) => {
    if (!currentShopType) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('shop_types')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentShopType.id)
        .select();

      if (error) throw error;

      setShopTypes(prev => prev.map(item => item.id === currentShopType.id ? data[0] : item).sort((a, b) => a.name.localeCompare(b.name)));
      setIsDialogOpen(false);
      setCurrentShopType(null);
      toast({ title: "Success", description: "Shop type updated successfully." });
    } catch (error) {
      console.error('Error updating shop type:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentShopType) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('shop_types')
        .delete()
        .eq('id', currentShopType.id);

      if (error) throw error;

      setShopTypes(prev => prev.filter(item => item.id !== currentShopType.id));
      setIsDeleteDialogOpen(false);
      setCurrentShopType(null);
      toast({ title: "Success", description: "Shop type deleted successfully." });
    } catch (error) {
      console.error('Error deleting shop type:', error);
      toast({ title: "Error", description: "Failed to delete. It might be in use.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredShopTypes = shopTypes.filter(type => 
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (type.description && type.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openEditDialog = (type) => {
    setCurrentShopType(type);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (type) => {
    setCurrentShopType(type);
    setIsDeleteDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setCurrentShopType(null), 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shop Types</h1>
          <p className="text-slate-500">Manage the categories of shops available in the system.</p>
        </div>
        <Button onClick={() => { setCurrentShopType(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add New Shop Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Shop Types</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : filteredShopTypes.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Store className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No shop types found matching your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShopTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="text-2xl">{type.icon || '🏪'}</TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-slate-500 truncate max-w-xs">
                        {type.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? "default" : "secondary"} className={type.is_active ? "bg-green-500 hover:bg-green-600" : ""}>
                          {type.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(type)}>
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(type)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentShopType ? 'Edit Shop Type' : 'Add New Shop Type'}</DialogTitle>
            <DialogDescription>
              Configure the shop type details below.
            </DialogDescription>
          </DialogHeader>
          <ShopTypeForm 
            initialData={currentShopType} 
            onSubmit={currentShopType ? handleUpdate : handleCreate} 
            isSubmitting={isSubmitting}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the 
              <strong> {currentShopType?.name} </strong> shop type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShopTypesManagement;