import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Edit, Plus, Upload, QrCode, Download, Droplet, Loader2, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { QRCodeSVG } from 'qrcode.react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const WaterProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true
  });

  const [uploading, setUploading] = useState(false);

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
      setProducts(data);
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
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
      toast({ title: "Image uploaded" });
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
        toast({ title: "Product updated" });
      } else {
        const { error } = await supabase
          .from('water_products')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Product created" });
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

  const toggleAvailability = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('water_products')
        .update({ is_available: !currentStatus })
        .eq('id', id);
      if (error) throw error;
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

  const downloadQr = () => {
    const canvas = document.getElementById("water-order-qr");
    if(canvas) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');
        
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            const pngUrl = tempCanvas.toDataURL("image/png");
            let downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = "water-order-qr.png";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };
        img.src = new XMLSerializer().serializeToString(canvas);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <Helmet>
        <title>Water Products Management - Admin</title>
        <meta name="description" content="Manage water products for your delivery service." />
      </Helmet>

      <div className="flex flex-col sm:flex-row flex-wrap justify-end gap-3 w-full md:w-auto">
        <Button variant="outline" onClick={() => setIsQrDialogOpen(true)} className="gap-2">
          <QrCode className="w-4 h-4" /> Generate QR
        </Button>

        <Button
          onClick={() => navigate('/admin/water-orders')}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
        >
          <ShoppingBag className="w-4 h-4" /> View Water Orders
        </Button>

        <Button
          onClick={() => { setEditingProduct(null); setFormData({ name: '', description: '', price: '', image_url: '', is_available: true }); setIsDialogOpen(true); }}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4" /> Create New Product
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="w-12 h-12 rounded bg-slate-100 overflow-hidden flex items-center justify-center">
                      {product.image_url ? (
                         <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                       ) : (
                         <Droplet className="h-6 w-6 text-slate-400" />
                       )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">{product.name}</TableCell>
                  <TableCell>₹{product.price}</TableCell>
                  <TableCell className="max-w-xs truncate text-slate-500">{product.description || 'N/A'}</TableCell>
                  <TableCell>
                     <Switch 
                      checked={product.is_available} 
                      onCheckedChange={() => toggleAvailability(product.id, product.is_available)} 
                    />
                    <span className="ml-2 text-sm text-slate-600">{product.is_available ? 'Available' : 'Unavailable'}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(product)}><Edit className="w-4 h-4 text-slate-600" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && !loading && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No products found.</TableCell></TableRow>
              )}
               {loading && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. 20L Water Jar" className="text-slate-900 border-slate-300 focus:border-blue-500" />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Product description..." className="text-slate-900 border-slate-300 focus:border-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input type="number" id="price" name="price" value={formData.price} onChange={handleInputChange} placeholder="0.00" step="0.01" className="text-slate-900 border-slate-300 focus:border-blue-500" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="is_available">Availability</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="is_available" checked={formData.is_available} onCheckedChange={(c) => setFormData(prev => ({...prev, is_available: c}))} />
                  <span className="text-sm text-slate-600">{formData.is_available ? 'Available' : 'Unavailable'}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image_upload">Product Image</Label>
              <div className="flex gap-4 items-center">
                {formData.image_url && <img src={formData.image_url} alt="Preview" className="w-20 h-20 rounded-md object-cover border border-slate-200" />}
                <Input id="image_upload" type="file" onChange={handleImageUpload} disabled={uploading} accept="image/*" />
              </div>
               {uploading && <p className="text-sm text-blue-500">Uploading image...</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={uploading}>{uploading ? 'Saving...' : 'Save Product'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Water Order Page QR Code</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-6 bg-white space-y-4">
                <p className="text-center text-slate-600">Scan this QR code to access the water order page directly.</p>
                <QRCodeSVG 
                    id="water-order-qr"
                    value={`${window.location.origin}/water-order`}
                    size={256}
                    level={"H"}
                    includeMargin={true}
                    className="p-4 bg-white rounded-md shadow-md"
                />
                <p className="mt-4 text-sm text-center text-slate-500 break-all">
                    {window.location.origin}/water-order
                </p>
            </div>
            <DialogFooter>
                <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700" onClick={downloadQr}>
                    <Download className="w-4 h-4" /> Download QR Image
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaterProductsPage;