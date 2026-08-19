import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, PackageX, Search } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const LowStockProductsBubble = ({ className }) => {
  const { user } = useAuth();
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchLowStock = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch products that are not archived and have a low stock threshold set
        const { data, error: dbError } = await supabase
          .from('point_of_sale_products')
          .select('id, name, sku, category, stock_level, low_stock_threshold, image_url')
          .eq('user_id', user.id)
          .or('archived.eq.false,archived.is.null') // Handle both false and null as not archived
          .not('low_stock_threshold', 'is', null);

        if (dbError) throw dbError;
        
        // Filter in memory since Supabase RPC/View isn't available for column-to-column comparison
        const filteredAndSorted = (data || [])
          .filter(p => p.stock_level <= p.low_stock_threshold)
          .sort((a, b) => a.stock_level - b.stock_level);

        setLowStockProducts(filteredAndSorted);
      } catch (err) {
        console.error('Error fetching low stock:', err);
        setError('Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLowStock();
  }, [user]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card 
          role="button"
          tabIndex={0}
          className={cn(
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-red-200 dark:border-red-900/50 shadow-sm hover:shadow-md hover:bg-red-50/50 dark:hover:bg-slate-800 transition-all rounded-full cursor-pointer",
            "py-1.5 px-3 md:py-2 md:px-4 inline-flex w-auto",
            className
          )}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className={cn(
              "bg-gradient-to-br from-red-500 to-rose-600 rounded-full shadow-sm shadow-red-500/20 flex items-center justify-center",
              "p-1.5 md:p-2"
            )}>
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-white" />
            </div>
            
            <div className="flex flex-col items-start justify-center">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1">
                Low Stock
              </p>
              
              {isLoading ? (
                <Skeleton className="h-4 w-8 md:h-5 md:w-12 bg-slate-200 dark:bg-slate-700" />
              ) : error ? (
                <span className="text-red-500 text-xs font-medium leading-none">{error}</span>
              ) : (
                <p className={cn(
                  "font-bold leading-none text-red-600 dark:text-red-400",
                  "text-sm md:text-base"
                )}>
                  {lowStockProducts.length} <span className="text-xs font-normal text-slate-500">items</span>
                </p>
              )}
            </div>
          </div>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Low Stock Products
          </DialogTitle>
          <DialogDescription>
            You have {lowStockProducts.length} active products that are at or below their minimum stock threshold.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Loading low stock products...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center">
              <PackageX className="h-12 w-12 mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-900">All Good!</p>
              <p className="text-sm">No active products are currently low on stock.</p>
            </div>
          ) : (
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="rounded-md border"
            >
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Alert At</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((product) => (
                    <motion.tr variants={item} key={product.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded-md object-cover border" />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center border">
                              <PackageX className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                          <span>{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">{product.sku || '-'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {product.category || 'Uncategorized'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-slate-500">{product.low_stock_threshold}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                          product.stock_level <= 0 ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
                        )}>
                          {product.stock_level}
                        </span>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LowStockProductsBubble;