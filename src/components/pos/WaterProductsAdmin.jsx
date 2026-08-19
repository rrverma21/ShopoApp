import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Edit, Plus, Droplet, Loader2, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const WaterProductsAdmin = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('water_products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `water-products/${fileName}`;

    try {
      // Assuming 'product-images' bucket exists and is public
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast({ title: "Missing fields", description: "Name and Price are required", variant: "destructive" });
      return;
    }

    try {
      const payload = { ...formData, price: parseFloat(formData.price) };
      
      if (editingProduct) {
        const { error } = await supabase
          .from('water_products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from('water_products')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Product created successfully" });
      }

      setIsDialogOpen(false);
      fetchProducts();
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', image_url: '', is_available: true });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const { error } = await supabase.from('water_products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Product deleted" });
      fetchProducts();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      image_url: product.image_url || '',
      is_available: product.is_available
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-lg border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Droplet className="w-6 h-6 text-blue-500" /> 
            Water Products Management
          </h1>
          <p className="text-slate-500 mt-1">Create and manage global water products.</p>
        </div>
        <Button 
          onClick={() => { 
            setEditingProduct(null); 
            setFormData({ name: '', description: '', price: '', image_url: '', is_available: true }); 
            setIsDialogOpen(true); 
          }} 
          className="bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <Card className="shadow-lg rounded-xl overflow-hidden border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>Product Info</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    No products found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="text-sm text-slate-500 max-w-md truncate">{product.description || 'No description'}</div>
                    </TableCell>
                    <TableCell className="font-medium">₹{product.price}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {product.is_available ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(product)} className="hover:bg-blue-50 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <CardDescription>Enter details for the water product.</CardDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. 20L Water Jar" />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Product description..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input type="number" id="price" name="price" value={formData.price} onChange={handleInputChange} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="grid gap-2">
                <Label>Availability</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch checked={formData.is_available} onCheckedChange={(c) => setFormData(prev => ({...prev, is_available: c}))} />
                  <span className="text-sm text-slate-600">{formData.is_available ? 'Available' : 'Unavailable'}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                {formData.image_url && (
                  <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <Input type="file" onChange={handleImageUpload} disabled={uploading} accept="image/*" className="text-sm" />
                  {uploading && <span className="text-xs text-blue-500 mt-1 block">Uploading...</span>}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
              {uploading ? 'Processing...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaterProductsAdmin;