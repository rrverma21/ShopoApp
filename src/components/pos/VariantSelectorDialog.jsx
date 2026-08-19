import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn, formatPrice } from '@/lib/utils';
import { AlertCircle, Package, FileImage as ImageIcon } from 'lucide-react';

const VariantSelectorDialog = ({ open, onOpenChange, product, onConfirm }) => {
  const itemRefs = useRef([]);

  useEffect(() => {
    // Reset refs array when variants change
    itemRefs.current = itemRefs.current.slice(0, product?.variants?.length || 0);
  }, [product?.variants]);

  useEffect(() => {
    if (open && product?.variants?.length > 0) {
      // Focus the first available in-stock variant after a slight delay for modal animation
      const firstInStockIndex = product.variants.findIndex(v => (v.stock || 0) > 0);
      const targetIndex = firstInStockIndex >= 0 ? firstInStockIndex : 0;
      
      const timer = setTimeout(() => {
        const element = itemRefs.current[targetIndex];
        if (element) {
          element.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, product]);

  const handleSelect = (variant) => {
    if ((variant.stock || 0) <= 0) return;
    onConfirm(variant);
    onOpenChange(false);
  };

  const handleKeyDown = (e, index, variant) => {
    const variants = product?.variants || [];
    
    // Explicitly handle Enter key to ensure selection works reliably during navigation
    if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(variant);
        return;
    }

    let nextIndex = null;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = (index + 1) % variants.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = (index - 1 + variants.length) % variants.length;
    }

    if (nextIndex !== null) {
        itemRefs.current[nextIndex]?.focus();
    }
  };

  const variants = product?.variants || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Select Option for {product?.name}</DialogTitle>
          <DialogDescription className="text-slate-500">
             Navigate with arrow keys and press Enter to select, or tap an option.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-4 max-h-[60vh] overflow-y-auto">
          {variants.map((variant, index) => {
             const isOutOfStock = (variant.stock || 0) <= 0;
             const price = variant.price || product.selling_price;
             
             // Format attributes for display
             const attributesDisplay = variant.attributes 
                ? Object.entries(variant.attributes)
                    .filter(([k,v]) => v && k !== 'Option')
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')
                : '';

             return (
               <button
                 key={variant.id}
                 ref={el => itemRefs.current[index] = el}
                 onClick={() => handleSelect(variant)}
                 onKeyDown={(e) => handleKeyDown(e, index, variant)}
                 disabled={isOutOfStock}
                 className={cn(
                   "relative flex flex-col items-stretch text-left border rounded-lg overflow-hidden transition-all outline-none h-full",
                   "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-slate-50",
                   isOutOfStock 
                    ? "opacity-60 cursor-not-allowed bg-slate-50 border-slate-200 grayscale" 
                    : "cursor-pointer hover:border-blue-400 hover:shadow-md bg-white border-slate-200"
                 )}
               >
                 <div className="w-full aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                     {variant.images && variant.images.length > 0 ? (
                         <img src={variant.images[0]} alt={variant.name} className="w-full h-full object-cover" />
                     ) : product.image_url ? (
                         <img src={product.image_url} alt={product.name} className="w-full h-full object-cover opacity-50" />
                     ) : (
                         <ImageIcon className="w-8 h-8 text-slate-300" />
                     )}
                     
                     {variant.color && (
                         <div 
                            className="absolute bottom-2 right-2 w-5 h-5 rounded-full border border-white shadow-sm" 
                            style={{ backgroundColor: variant.color }} 
                            title={variant.color}
                         />
                     )}
                 </div>

                 <div className="p-3 flex flex-col flex-grow">
                     <div className="mb-1">
                         <span className="font-semibold text-sm text-slate-900 block truncate" title={variant.name}>
                             {variant.name}
                         </span>
                         {attributesDisplay && (
                             <span className="text-xs text-slate-500 block truncate opacity-80">
                                 {attributesDisplay}
                             </span>
                         )}
                     </div>
                     
                     <div className="mt-auto pt-2 flex items-end justify-between">
                        <div className="flex flex-col">
                             <span className="font-bold text-sm text-green-600">{formatPrice(price)}</span>
                        </div>
                        <div className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1", 
                            isOutOfStock ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
                        )}>
                            <Package className="w-3 h-3" />
                            {isOutOfStock ? '0' : `${variant.stock}`}
                        </div>
                     </div>
                 </div>
               </button>
             );
          })}
        </div>

        {product?.variants?.length === 0 && (
             <div className="flex flex-col items-center justify-center p-6 text-slate-500 bg-slate-50 rounded-lg">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>No variants configured correctly.</p>
             </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 border-slate-200">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VariantSelectorDialog;