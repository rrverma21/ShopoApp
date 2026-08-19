import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
// ... imports
import { Plus, Edit2, Trash2, Globe, User, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const BrandManagement = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const { user } = useAuth();
  const isSeller = user?.profile?.role === 'seller';

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('brands').select('*').order('name');
      if (error) throw error;
      setBrands(data);
    } catch (error) {
      toast({ title: "Error fetching brands", description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setIsBrandDialogOpen(true);
  };

  const handleDelete = async (brandId) => {
    if (!window.confirm("Are you sure you want to delete this brand?")) return;
    try {
      const { error } = await supabase.from('brands').delete().eq('id', brandId);
      if (error) throw error;
      toast({ title: "Brand Deleted", description: "The brand has been successfully removed." });
      fetchBrands();
    } catch (error) {
      toast({ title: "Deletion failed", description: error.message, variant: 'destructive' });
    }
  };

  const handleDialogStateChange = (open) => {
    setIsBrandDialogOpen(open);
    if (!open) {
      setEditingBrand(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Brand Management</h1>
            <p className="text-slate-600 text-base md:text-lg">Manage your product brands</p>
          </div>
          <BrandDialog 
            isOpen={isBrandDialogOpen} 
            onOpenChange={handleDialogStateChange} 
            onBrandUpdate={fetchBrands} 
            user={user}
            brand={editingBrand}
          />
        </div>
      </motion.div>

      <Card className="glass-effect">
        <CardHeader>
          <h2 className="text-xl md:text-2xl font-semibold">All Brands</h2>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {brands.length > 0 ? brands.map((brand) => (
              <div key={brand.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={brand.image_url} alt={brand.name} />
                      <AvatarFallback>{brand.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{brand.name}</span>
                  </div>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    {brand.seller_id ? <User className="h-3 w-3" /> : <Globe className="h-3 w-3 text-blue-500" />}
                    {brand.seller_id ? 'Your Brand' : 'Global'}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  Created: {new Date(brand.created_at).toLocaleDateString()}
                </div>
                {((isSeller && brand.seller_id === user.id) || !isSeller) && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(brand)} className="flex-1"><Edit2 className="h-3 w-3 mr-1" /> Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(brand.id)} className="flex-1 text-red-500 hover:text-red-600"><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                  </div>
                )}
              </div>
            )) : (
              <p className="text-center text-slate-500 py-10">No brands found. Add your first brand to get started!</p>
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.length > 0 ? brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={brand.image_url} alt={brand.name} />
                          <AvatarFallback>{brand.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {brand.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {brand.seller_id ? <User className="h-4 w-4 text-slate-500" /> : <Globe className="h-4 w-4 text-blue-500" />}
                        {brand.seller_id ? 'Your Brand' : 'Global'}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(brand.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {((isSeller && brand.seller_id === user.id) || !isSeller) && (
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(brand)}><Edit2 className="h-3 w-3 mr-1" /> Edit</Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(brand.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan="4" className="text-center h-24">No brands found. Add your first brand to get started!</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const BrandDialog = ({ isOpen, onOpenChange, onBrandUpdate, user, brand }) => {
  const [brandName, setBrandName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const isEditing = !!brand;
  const isSeller = user?.profile?.role === 'seller';

  useEffect(() => {
    if (isEditing) {
      setBrandName(brand.name);
      setLogoPreview(brand.image_url);
    } else {
      setBrandName('');
      setLogoPreview(null);
    }
    setLogoFile(null);
  }, [brand, isEditing, isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    const trimmedBrandName = brandName.trim();
    if (!trimmedBrandName) {
      toast({ title: "Brand name is required", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      let imageUrl = brand?.image_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/brand-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        
        imageUrl = urlData.publicUrl;
      }

      const brandData = { 
        name: trimmedBrandName,
        image_url: imageUrl,
      };
      
      let query;

      if (isEditing) {
        query = supabase.from('brands').update(brandData).eq('id', brand.id);
      } else {
        if (isSeller) {
          brandData.seller_id = user.id;
        }
        query = supabase.from('brands').insert(brandData);
      }

      const { error } = await query;

      if (error) {
        if (error.code === '23505') {
          throw new Error(`Brand "${trimmedBrandName}" already exists.`);
        }
        throw error;
      }
      
      onOpenChange(false);
      onBrandUpdate();
      toast({ title: isEditing ? "Brand Updated" : "Brand Added", description: `${trimmedBrandName} has been saved.` });
    } catch (error) {
      console.error('Brand save error:', error);
      toast({ title: isEditing ? 'Update failed' : 'Failed to add brand', description: error.message, variant: 'destructive'});
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="btn-primary w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />{isEditing ? 'Edit Brand' : 'Add Brand'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditing ? 'Edit Brand' : 'Add New Brand'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="brandName">Brand Name</Label>
            <Input id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Enter brand name" />
          </div>
          <div>
            <Label>Brand Logo</Label>
            <div className="mt-2 flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={logoPreview} />
                <AvatarFallback><Upload className="h-6 w-6 text-slate-400" /></AvatarFallback>
              </Avatar>
              <Input id="logo" type="file" accept="image/*" onChange={handleFileChange} className="flex-1" />
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={isUploading}>
            {isUploading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Brand')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandManagement;