import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Loader2, Package, PackageOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

const POSProductsModal = ({ isOpen, onClose, retailerId, addToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && retailerId) {
      fetchProducts();
    }
  }, [isOpen, retailerId]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    // 10 Second Timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const { data, error: fetchError } = await supabase
        .from('point_of_sale_products')
        .select('*')
        .eq('user_id', retailerId)
        .gt('stock_level', 0)
        .abortSignal(controller.signal);

      if (fetchError) throw fetchError;
      
      setProducts(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching POS products:', err);
      const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
      const errorMessage = isTimeout ? 'Request timed out after 10 seconds.' : err.message || 'Failed to load products.';
      
      setError(errorMessage);
      setProducts([]);
      
      toast({
        title: isTimeout ? "Request Timeout" : "Fetch Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!debouncedSearchQuery) return products;
    const lowerQuery = debouncedSearchQuery.toLowerCase();
    return products.filter(product => 
      product.name?.toLowerCase().includes(lowerQuery) || 
      product.sku?.toLowerCase().includes(lowerQuery) ||
      product.barcode?.toLowerCase().includes(lowerQuery)
    );
  }, [products, debouncedSearchQuery]);

  const handleAddToCart = (product) => {
    if (!product.selling_price && product.selling_price !== 0) {
        toast({
            title: "Price Error",
            description: "This product does not have a valid price.",
            variant: "destructive"
        });
        return;
    }

    addToCart(product, 1);
    toast({
        title: "Added to Cart",
        description: `${product.name} added to your order.`,
        className: "bg-green-50 border-green-200 text-green-900",
        duration: 2000,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full sm:h-auto sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-sm sm:rounded-xl shadow-2xl border-0">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
          <div className="flex items-center justify-between mb-3 sm:mb-0">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" /> 
              <span className="hidden sm:inline">POS Inventory</span>
              <span className="sm:hidden">Inventory</span>
            </DialogTitle>
             <button 
                onClick={() => onClose(false)}
                className="rounded-full p-2 sm:p-1 hover:bg-white/20 transition-colors active:scale-95"
                aria-label="Close"
             >
                <X className="h-6 w-6 sm:h-5 sm:w-5 text-white" />
             </button>
          </div>
          <div className="relative w-full">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-4 sm:w-4 text-blue-100" />
             <Input 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-100/70 focus-visible:bg-white/20 focus-visible:ring-white/30 h-11 sm:h-10 text-base sm:text-sm"
             />
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-slate-50 relative">
            {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-2" />
                    <p className="text-base sm:text-sm text-slate-500 font-medium">Loading inventory...</p>
                </div>
            ) : error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <AlertCircle className="h-14 w-14 sm:h-12 sm:w-12 mb-3 text-red-400 opacity-80" />
                    <p className="text-lg sm:text-xl font-medium text-slate-800">Failed to load products</p>
                    <p className="text-base sm:text-sm mt-1 text-slate-500 mb-4">{error}</p>
                    <Button onClick={fetchProducts} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    {searchQuery ? (
                        <>
                            <Search className="h-14 w-14 sm:h-12 sm:w-12 mb-3 opacity-20" />
                            <p className="text-lg sm:text-xl font-medium text-slate-600">No results for "{searchQuery}"</p>
                            <p className="text-base sm:text-sm mt-1">Try searching for a different item name or barcode.</p>
                        </>
                    ) : (
                        <>
                            <PackageOpen className="h-14 w-14 sm:h-12 sm:w-12 mb-3 opacity-20" />
                            <p className="text-lg sm:text-xl font-medium text-slate-600">No available stock</p>
                            <p className="text-base sm:text-sm mt-1">All products are currently out of stock or hidden.</p>
                        </>
                    )}
                </div>
            ) : (
                <ScrollArea className="h-full">
                    {/* Responsive Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 p-3 md:p-4 pb-20 md:pb-4">
                        {filteredProducts.map((product, idx) => (
                            <div 
                                key={product.id || idx}
                                className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full w-full max-w-full hover:shadow-md transition-shadow duration-200"
                            >
                                <div className="flex flex-row md:flex-col h-full">
                                    {/* Image Section */}
                                    <div className="w-24 h-24 md:w-full md:h-40 flex-shrink-0 bg-slate-50 border-r md:border-r-0 md:border-b border-slate-100 relative">
                                        {product.image_url ? (
                                            <img 
                                                className="h-full w-full object-cover" 
                                                src={product.image_url} 
                                                alt={product.name} 
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <Package className="h-8 w-8 text-slate-300" />
                                            </div>
                                        )}
                                        {/* Stock Badge - Absolute positioned on desktop, inline on mobile if needed */}
                                        <div className="absolute top-1 left-1">
                                            <Badge 
                                                variant="secondary" 
                                                className="px-1.5 py-0 h-5 text-[10px] font-medium shadow-sm bg-white/90 backdrop-blur-sm"
                                            >
                                                {product.stock_level} left
                                            </Badge>
                                        </div>
                                    </div>
                                    
                                    {/* Content Section */}
                                    <div className="flex-1 p-2 md:p-3 flex flex-col justify-between min-w-0">
                                        <div className="flex-grow">
                                            <h3 className="font-semibold text-slate-900 text-sm md:text-base line-clamp-2 break-words mb-1" title={product.name}>
                                                {product.name}
                                            </h3>
                                            <p className="text-sm md:text-base font-bold text-slate-700">
                                                {formatPrice(product.selling_price)}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-2 flex-shrink-0 pt-2 md:pt-3">
                                            <Button
                                                size="sm"
                                                className={cn(
                                                    "w-full h-9 shadow-sm transition-all duration-200 text-sm md:text-base font-medium flex items-center justify-center gap-2",
                                                    "bg-green-600 text-white hover:bg-green-700 hover:shadow active:scale-95"
                                                )}
                                                onClick={() => handleAddToCart(product)}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default POSProductsModal;