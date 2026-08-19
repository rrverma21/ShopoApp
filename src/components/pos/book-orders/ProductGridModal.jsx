import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Check, FileImage as ImageIcon } from 'lucide-react';
import { formatCurrency, cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const ProductGridModal = ({ isOpen, onClose, products, onSelectProduct, selectedProductId }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lowerTerm = searchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lowerTerm) || (p.sku && p.sku.toLowerCase().includes(lowerTerm)));
  }, [products, searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <DialogHeader className="p-3 sm:p-4 pb-3 border-b shrink-0 bg-white dark:bg-slate-900 shadow-sm z-10">
          <DialogTitle className="text-lg font-bold">Select Product</DialogTitle>
          <DialogDescription className="text-xs">
            Choose a product to add to the order line item.
          </DialogDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              autoFocus
              placeholder="Search by product name or SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm bg-slate-100 dark:bg-slate-800 border-transparent focus-visible:border-primary"
            />
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-3 sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
              <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-full mb-3">
                <Search className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No products found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pb-6">
              {filteredProducts.map((product) => {
                const isSelected = selectedProductId === product.id;
                
                return (
                  <div
                    key={product.id}
                    onClick={() => onSelectProduct(product)}
                    className={cn(
                      "product-grid-card group flex flex-col h-full rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-primary/50 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isSelected && "ring-2 ring-primary border-primary"
                    )}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectProduct(product);
                      }
                    }}
                  >
                    <div className="relative w-full h-[130px] shrink-0 bg-slate-50 dark:bg-slate-900 group-hover:opacity-95 transition-opacity">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={cn(
                          "absolute inset-0 items-center justify-center bg-slate-100 dark:bg-slate-800",
                          product.image_url ? "hidden" : "flex"
                        )}
                      >
                        <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center transition-all duration-200 animate-in fade-in">
                          <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg scale-in-100 animate-in zoom-in-50">
                            <Check className="w-5 h-5 font-bold" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2 flex flex-col flex-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="mb-1">
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                          {product.name}
                        </h4>
                        {product.sku && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                            {product.sku}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-auto pt-1 space-y-1">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Price</span>
                          <p className="font-bold text-base text-primary tracking-tight leading-none">
                            {formatCurrency(product.wholesale_price || 0)}
                          </p>
                        </div>
                        
                        {product.stock_level !== undefined && (
                          <div className="flex items-center">
                            <span className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                              product.stock_level > 0 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            )}>
                              S: {product.stock_level}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProductGridModal;