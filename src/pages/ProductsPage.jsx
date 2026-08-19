import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Search, Info, FileImage as ImageIcon, SlidersHorizontal, X as XIcon, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Label } from '@/components/ui/label';
import ImageZoom from '@/components/ImageZoom';
import ProductFilters from '@/components/products/ProductFilters';
import { formatPrice, getPriceForQuantity } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from '@/hooks/useDebounce';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [loading, setLoading] = useState(true);
  const { addToCart, cartItems, clearCart } = useCart();
  const [showMixSellerDialog, setShowMixSellerDialog] = useState(false);
  const [productToAdd, setProductToAdd] = useState(null);
  const [filters, setFilters] = useState({ categories: [], brands: [] });
  const [allCategories, setAllCategories] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [isMobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Initialize Categories and Brands
  useEffect(() => {
      const initData = async () => {
          const [catRes, brandRes] = await Promise.all([
              supabase.from('categories').select('*'),
              supabase.from('brands').select('*')
          ]);
          if(catRes.data) setAllCategories(catRes.data);
          if(brandRes.data) setAllBrands(brandRes.data);
      };
      initData();
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
        const categoryIds = allCategories.filter(c => filters.categories.includes(c.name)).map(c => c.id);
        const brandIds = allBrands.filter(b => filters.brands.includes(b.name)).map(b => b.id);

        const { data, error } = await supabase.rpc('search_products', {
            p_search_term: debouncedSearchTerm || null,
            p_category_ids: categoryIds.length > 0 ? categoryIds : null,
            p_brand_ids: brandIds.length > 0 ? brandIds : null,
        });

        if (error) throw error;
        setProducts(data || []);
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  }, [debouncedSearchTerm, filters, allCategories, allBrands]);

  useEffect(() => {
      fetchProducts();
  }, [fetchProducts]);

  const handleAddToCart = (product) => {
      if (cartItems.length > 0 && cartItems[0].seller_id !== product.seller_id) {
          setProductToAdd(product);
          setShowMixSellerDialog(true);
          return;
      }
      
      const priceInfo = getPriceForQuantity(product, product.min_order_quantity || 1);
      addToCart({ ...product, price: priceInfo?.price || 0 }, product.min_order_quantity || 1);
      toast({ 
          title: "Added to Request List", 
          description: `${product.name} added. Checkout to send request.` 
      });
  };

  const confirmClearAndAdd = () => {
      if(productToAdd) {
          clearCart();
          const priceInfo = getPriceForQuantity(productToAdd, productToAdd.min_order_quantity || 1);
          addToCart({ ...productToAdd, price: priceInfo?.price || 0 }, productToAdd.min_order_quantity || 1);
          toast({ title: "List Cleared & Added", description: "Started new request list." });
          setShowMixSellerDialog(false);
          setProductToAdd(null);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Marketplace - ShopoApp</title>
        <meta name="description" content="Browse products from wholesalers. Request orders easily." />
      </Helmet>

      {/* Disclaimer Banner */}
      <div className="bg-blue-600 text-white p-3 text-center text-sm font-medium sticky top-16 z-30 shadow-md">
          <ShieldCheck className="inline w-4 h-4 mr-2 mb-0.5" />
          B2B Marketplace: Products are sold by wholesalers. Payments are Cash on Delivery (COD). No online payment required.
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
           {/* Filters Sidebar */}
           <ProductFilters 
               categories={allCategories} 
               brands={allBrands} 
               activeFilters={filters}
               onFilterChange={setFilters}
               isMobileFiltersOpen={isMobileFiltersOpen}
               onMobileToggle={setMobileFiltersOpen}
           />

           <main className="flex-1">
               {/* Search Bar */}
               <div className="mb-6 flex gap-2">
                   <div className="relative flex-1">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                       <Input 
                           placeholder="Search products..." 
                           className="pl-10 h-12 text-lg" 
                           value={searchTerm}
                           onChange={e => setSearchTerm(e.target.value)}
                       />
                   </div>
                   <Button variant="outline" className="lg:hidden h-12 w-12 p-0" onClick={() => setMobileFiltersOpen(true)}>
                       <SlidersHorizontal className="w-5 h-5" />
                   </Button>
               </div>

               {loading ? (
                   <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
               ) : products.length === 0 ? (
                   <div className="text-center py-20 text-slate-500">No products found.</div>
               ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                       {products.map(product => {
                           const priceInfo = getPriceForQuantity(product, product.min_order_quantity || 1);
                           return (
                               <motion.div key={product.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                   <Card className="h-full hover:shadow-lg transition-all border-slate-200">
                                       <div className="aspect-square bg-slate-100 relative overflow-hidden group">
                                           {product.image_url ? (
                                               <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                           ) : (
                                               <div className="flex items-center justify-center h-full text-slate-300"><ImageIcon className="w-12 h-12" /></div>
                                           )}
                                           <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-slate-700">
                                               MOQ: {product.min_order_quantity} {product.unit}
                                           </div>
                                       </div>
                                       <CardContent className="p-4">
                                           <div className="mb-2">
                                               <h3 className="font-bold text-slate-900 line-clamp-1" title={product.name}>{product.name}</h3>
                                               <p className="text-xs text-slate-500">{product.seller_business_name}</p>
                                           </div>
                                           <div className="flex justify-between items-center mb-4">
                                               <div className="text-blue-600 font-bold text-lg">
                                                   {priceInfo ? formatPrice(priceInfo.price) : 'N/A'} 
                                                   <span className="text-xs text-slate-400 font-normal"> / {product.unit}</span>
                                               </div>
                                           </div>
                                           <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={() => handleAddToCart(product)}>
                                               Request Order
                                           </Button>
                                       </CardContent>
                                   </Card>
                               </motion.div>
                           );
                       })}
                   </div>
               )}
           </main>
        </div>
      </div>

      <AlertDialog open={showMixSellerDialog} onOpenChange={setShowMixSellerDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Start New Request List?</AlertDialogTitle>
                <AlertDialogDescription>
                    Your current list contains items from another wholesaler. You can only request from one wholesaler at a time.
                    Clear current list to add this item?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProductToAdd(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmClearAndAdd}>Clear & Add</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductsPage;