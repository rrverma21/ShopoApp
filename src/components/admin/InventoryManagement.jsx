import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
// ... imports
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Edit, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const InventoryManagement = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStock, setEditingStock] = useState({});

  const fetchProducts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('id, name, stock, unit, brands(name), seller_id')
        .order('name', { ascending: true });

      if (user.profile?.role === 'seller') {
        query = query.eq('seller_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      toast({ title: "Error fetching inventory", description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const results = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brands && product.brands.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredProducts(results);
  }, [searchTerm, products]);

  const handleStockChange = (productId, value) => {
    setEditingStock(prev => ({ ...prev, [productId]: value }));
  };

  const handleUpdateStock = async (productId) => {
    const newStock = parseInt(editingStock[productId], 10);
    if (isNaN(newStock) || newStock < 0) {
      toast({ title: "Invalid stock value", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (error) throw error;

      toast({ title: "Stock Updated", description: "Inventory has been successfully updated." });
      setEditingStock(prev => {
        const newState = { ...prev };
        delete newState[productId];
        return newState;
      });
      fetchProducts();
    } catch (error) {
      toast({ title: "Update Failed", description: error.message, variant: 'destructive' });
    }
  };

  const getStockInfo = (stock) => {
    if (stock === 0) {
      return {
        color: 'text-red-600 bg-red-100',
        text: 'Out of Stock',
        icon: <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
      };
    }
    if (stock < 10) {
      return {
        color: 'text-yellow-700 bg-yellow-100',
        text: 'Low Stock',
        icon: <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
      };
    }
    return {
      color: 'text-green-700 bg-green-100',
      text: 'In Stock',
      icon: null
    };
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Inventory Management</h1>
        <p className="text-slate-600 text-base md:text-lg">Monitor and update product stock levels.</p>
      </motion.div>

      <Card className="glass-effect mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search by product or brand name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <h2 className="text-xl md:text-2xl font-semibold">Product Stock</h2>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filteredProducts.length > 0 ? filteredProducts.map((product) => {
              const stockInfo = getStockInfo(product.stock);
              return (
                <div key={product.id} className="border rounded-lg p-4 space-y-3">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-slate-500">Brand: {product.brands?.name || 'N/A'}</div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      Stock: <span className="font-semibold">{product.stock} {product.unit}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${stockInfo.color}`}>
                      {stockInfo.icon && React.cloneElement(stockInfo.icon, { className: "h-3 w-3 mr-1" })}
                      {stockInfo.text}
                    </span>
                  </div>
                  <div className="pt-3 border-t">
                    {editingStock.hasOwnProperty(product.id) ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editingStock[product.id]}
                          onChange={(e) => handleStockChange(product.id, e.target.value)}
                          className="flex-1 h-9 text-center"
                          min="0"
                        />
                        <Button size="icon" className="h-9 w-9" onClick={() => handleUpdateStock(product.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStockChange(product.id, product.stock)}
                        className="w-full"
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Update Stock
                      </Button>
                    )}
                  </div>
                </div>
              );
            }) : (
              <p className="text-center text-slate-500 py-10">No products found.</p>
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? filteredProducts.map((product) => {
                  const stockInfo = getStockInfo(product.stock);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-slate-600">{product.brands?.name || 'No Brand'}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {product.stock} {product.unit}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full font-semibold ${stockInfo.color}`}>
                          {stockInfo.icon}
                          {stockInfo.text}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingStock.hasOwnProperty(product.id) ? (
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              value={editingStock[product.id]}
                              onChange={(e) => handleStockChange(product.id, e.target.value)}
                              className="w-24 h-8 text-center"
                              min="0"
                            />
                            <Button size="icon" className="h-8 w-8" onClick={() => handleUpdateStock(product.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStockChange(product.id, product.stock)}
                          >
                            <Edit className="h-3 w-3 mr-2" />
                            Update Stock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan="5" className="text-center h-24">No products found.</TableCell>
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

export default InventoryManagement;