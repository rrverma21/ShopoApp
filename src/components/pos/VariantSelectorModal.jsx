import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatPrice } from '@/lib/utils';
import { Package, AlertCircle } from 'lucide-react';

const VariantSelectorModal = ({ open, onClose, product, onConfirm }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState('1');

  // Reset state when modal opens with a new product
  useEffect(() => {
    if (open) {
      setSelectedVariant(null);
      setQuantity('1');
    }
  }, [open, product]);

  const handleConfirm = () => {
    if (!selectedVariant) return;
    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) return;
    
    onConfirm(selectedVariant, qtyNum);
    onClose();
  };

  const variants = product?.variants || [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle>Select Variant for {product?.name}</DialogTitle>
          <DialogDescription>
            Choose a specific variant to add to the purchase bill and enter the quantity.
          </DialogDescription>
        </DialogHeader>

        {variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50 text-red-500" />
                <p>No variants configured for this product.</p>
            </div>
        ) : (
            <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[40vh] overflow-y-auto p-1">
                    {variants.map((variant) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        const price = variant.cost_price || variant.price || product.cost_price || product.selling_price;
                        
                        // Format attributes
                        const attributesDisplay = variant.attributes 
                            ? Object.entries(variant.attributes)
                                .filter(([k,v]) => v && k !== 'Option')
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')
                            : '';

                        return (
                            <div
                                key={variant.id}
                                onClick={() => setSelectedVariant(variant)}
                                className={cn(
                                    "relative flex flex-col p-3 text-left border rounded-xl cursor-pointer transition-all duration-200 outline-none",
                                    isSelected 
                                        ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-blue-300 dark:hover:border-blue-700"
                                )}
                            >
                                <div className="mb-2">
                                    <span className="font-semibold text-sm block truncate text-slate-900 dark:text-slate-100" title={variant.name}>
                                        {variant.name}
                                    </span>
                                    {attributesDisplay && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                                            {attributesDisplay}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-auto flex items-end justify-between">
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{formatPrice(price)}</span>
                                    <div className="text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        <Package className="w-3 h-3" />
                                        {variant.stock || 0}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex-1">
                        <Label htmlFor="variant-qty" className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity to Add</Label>
                        <p className="text-xs text-slate-500">Enter the number of units received</p>
                    </div>
                    <div className="w-32">
                        <Input
                            id="variant-qty"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="text-lg font-semibold text-center bg-white dark:bg-slate-950"
                        />
                    </div>
                </div>
            </div>
        )}

        <DialogFooter className="sm:justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedVariant || parseInt(quantity, 10) <= 0 || isNaN(parseInt(quantity, 10))}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VariantSelectorModal;