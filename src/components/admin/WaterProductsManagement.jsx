import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Plus, Search, Edit, Trash2, Droplet, Filter, Loader2, CheckCircle2, XCircle, QrCode, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import WaterProductForm from './WaterProductForm';
import CommonWaterQRModal from './CommonWaterQRModal';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const WaterProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  
  // QR Modal State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('water_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching water products:', error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('water_products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productToDelete.id));
      toast({
        title: "Success",
        description: "Product deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (selectedProduct) {
        // Update existing product
        const { data, error } = await supabase
          .from('water_products')
          .update({
            name: formData.name,
            description: formData.description,
            price: formData.price,
            is_available: formData.is_available,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedProduct.id)
          .select()
          .single();

        if (error) throw error;

        setProducts(products.map(p => p.id === selectedProduct.id ? data : p));
        toast({
          title: "Success",
          description: "Product updated successfully.",
        });
      } else {
        // Create new product
        const { data, error } = await supabase
          .from('water_products')
          .insert([{
            name: formData.name,
            description: formData.description,
            price: formData.price,
            is_available: formData.is_available,
          }])
          .select()
          .single();

        if (error) throw error;

        setProducts([data, ...products]);
        toast({
          title: "Success",
          description: "New water product created successfully.",
        });
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: "Failed to save product. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Filter products based on search and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'available' && product.is_available) ||
      (statusFilter === 'unavailable' && !product.is_available);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200/60">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Droplet className="h-8 w-8 text-blue-600 fill-blue-100" />
            Water Products Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Manage water products and generate QR codes for tracking
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-3 mt-4 md:mt-0">
          <Button 
            onClick={() => navigate('/admin/dashboard')} 
            variant="outline"
            className="border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm transition-all hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button 
            onClick={() => setIsQRModalOpen(true)} 
            variant="outline"
            className="border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm transition-all hover:scale-105"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR
          </Button>
          <Button 
            onClick={() => navigate('/admin/water-orders')} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all hover:scale-105 hover:opacity-90"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            View Water Orders
          </Button>
          <Button 
            onClick={handleCreate} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all hover:scale-105 hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Product
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="rounded-xl shadow-sm border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span>{statusFilter === 'all' ? 'All Status' : statusFilter === 'available' ? 'Available' : 'Unavailable'}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table/List */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-500">Loading water products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <Droplet className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No products found</h3>
            <p className="text-slate-500 mt-1 max-w-sm">
              {searchQuery || statusFilter !== 'all' 
                ? "Try adjusting your search or filters to find what you're looking for." 
                : "Get started by creating your first water product."}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Product
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[30%]">Product Name</TableHead>
                  <TableHead className="w-[30%] hidden md:table-cell">Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-semibold">{product.name}</span>
                        <span className="md:hidden text-xs text-slate-500 truncate max-w-[150px]">{product.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-600">
                      <div className="truncate max-w-xs" title={product.description}>
                        {product.description}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      ₹{parseFloat(product.price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {product.is_available ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Unavailable
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-500 text-sm">
                      {product.created_at ? format(new Date(product.created_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(product)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteClick(product)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? 'Edit Water Product' : 'Create New Water Product'}</DialogTitle>
          </DialogHeader>
          <WaterProductForm 
            product={selectedProduct} 
            onSave={handleSave} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Global Shop QR Modal */}
      <CommonWaterQRModal 
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              <span className="font-semibold text-slate-900"> "{productToDelete?.name}" </span>
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WaterProductsManagement;