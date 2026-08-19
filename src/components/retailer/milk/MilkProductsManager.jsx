import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, Save, X, Milk } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';

const MilkProductsManager = ({ userId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form States
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  
  // Edit Form States
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchProducts();
    }
  }, [userId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('retailer_milk_products')
        .select('*')
        .eq('retailer_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching milk products:', error);
      toast({
        title: "Error",
        description: "Failed to load milk products.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({ title: "Name required", description: "Please enter a product name", variant: "destructive" });
      return;
    }

    try {
      setAdding(true);
      const { data, error } = await supabase
        .from('retailer_milk_products')
        .insert({
          retailer_id: userId,
          name: newName.trim(),
          price: parseFloat(newPrice) || 0,
          is_available: true
        })
        .select()
        .single();

      if (error) throw error;

      setProducts([...products, data]);
      setNewName('');
      setNewPrice('');
      toast({ title: "Product Added", description: `${data.name} has been added.` });
    } catch (error) {
      console.error('Error adding product:', error);
      toast({ title: "Error", description: "Failed to add product.", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice(product.price);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPrice('');
  };

  const handleUpdate = async () => {
    try {
      const { error } = await supabase
        .from('retailer_milk_products')
        .update({
          name: editName.trim(),
          price: parseFloat(editPrice) || 0
        })
        .eq('id', editingId);

      if (error) throw error;

      setProducts(products.map(p => p.id === editingId ? { ...p, name: editName, price: parseFloat(editPrice) || 0 } : p));
      cancelEdit();
      toast({ title: "Updated", description: "Product details updated successfully." });
    } catch (error) {
      console.error('Error updating product:', error);
      toast({ title: "Error", description: "Failed to update product.", variant: "destructive" });
    }
  };

  const toggleAvailability = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('retailer_milk_products')
        .update({ is_available: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setProducts(products.map(p => p.id === id ? { ...p, is_available: !currentStatus } : p));
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product type?')) return;

    try {
      const { error } = await supabase
        .from('retailer_milk_products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== id));
      toast({ title: "Deleted", description: "Product type removed." });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
    }
  };

  return (
    <Card className="border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10">
      <CardHeader>
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <Milk className="w-5 h-5" />
            <CardTitle>Milk Types Management</CardTitle>
        </div>
        <CardDescription>Define the types of milk you offer for subscription (e.g., Cow Milk, Buffalo Milk).</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Add New Form */}
        <div className="flex flex-col sm:flex-row gap-3 items-end mb-6 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="w-full sm:flex-1">
            <Label className="text-xs mb-1.5 block">Product Name</Label>
            <Input 
              placeholder="e.g. Full Cream Milk" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-32">
            <Label className="text-xs mb-1.5 block">Price / Unit</Label>
            <Input 
              type="number" 
              placeholder="0.00" 
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Type
          </Button>
        </div>

        {/* List */}
        <div className="rounded-md border bg-white dark:bg-slate-900 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                    No milk types added yet. Add one above.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {editingId === product.id ? (
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                      ) : (
                        product.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="h-8 w-24" />
                      ) : (
                        `₹${product.price}`
                      )}
                    </TableCell>
                    <TableCell>
                        <Switch 
                            checked={product.is_available} 
                            onCheckedChange={() => toggleAvailability(product.id, product.is_available)}
                        />
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === product.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleUpdate}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500" onClick={cancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => startEdit(product)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-600" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MilkProductsManager;