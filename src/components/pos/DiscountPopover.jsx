import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from '@/lib/utils';
import { Percent, IndianRupee, Trash2 } from 'lucide-react';

export default function DiscountPopover({ item, updateItemDiscount, children }) {
  const [open, setOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState(item.discount || '');
  const [discountType, setDiscountType] = useState(item.discountType || 'amount');
  const [error, setError] = useState('');

  // Reset local state when popover opens or item changes
  useEffect(() => {
    if (open) {
        setDiscountValue(item.discount || '');
        setDiscountType(item.discountType || 'amount');
        setError('');
    }
  }, [item.discount, item.discountType, open]);

  const handleApply = () => {
    const val = parseFloat(discountValue);
    const price = item.selling_price || 0;

    if (isNaN(val) || val < 0) {
      setError('Invalid value');
      return;
    }

    if (discountType === 'percentage' && val > 100) {
      setError('Max 100%');
      return;
    }

    if (discountType === 'amount' && val > price) {
      setError(`Max ${formatPrice(price)}`);
      return;
    }

    updateItemDiscount(item.cartItemId, val, discountType);
    setOpen(false);
  };

  const handleRemove = () => {
    updateItemDiscount(item.cartItemId, 0, 'amount');
    setDiscountValue('');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // Calculate preview
  const previewPrice = (() => {
      const val = parseFloat(discountValue) || 0;
      const price = item.selling_price || 0;
      if (discountType === 'percentage') {
          return Math.max(0, price - (price * val / 100));
      } else {
          return Math.max(0, price - val);
      }
  })();

  const previewDiscountAmount = (item.selling_price || 0) - previewPrice;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-slate-900 border-slate-700 text-slate-100 shadow-xl overflow-hidden rounded-lg pos-discount-popover">
        <div className="bg-slate-800 p-4 border-b border-slate-700">
            <h4 className="font-bold text-base flex items-center justify-between mb-3 text-slate-100">
                <span>Product Discount</span>
                {item.discount > 0 && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleRemove}
                        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors"
                        title="Remove Discount"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </h4>
            <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-400">
                    <span>Product Price:</span>
                    <span>{formatPrice(item.selling_price)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                    <span>Discount Amount:</span>
                    <span className="text-emerald-400">-{formatPrice(previewDiscountAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-100 pt-2 border-t border-slate-700 mt-2">
                    <span>New Price:</span>
                    <span className="text-blue-400">{formatPrice(previewPrice)}</span>
                </div>
            </div>
        </div>

        <div className="p-4 space-y-4">
          <Tabs value={discountType} onValueChange={(val) => {
              setDiscountType(val);
              setDiscountValue(''); // Clear value on switch to avoid confusion
              setError('');
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-slate-950 border border-slate-800 p-1 rounded-md">
              <TabsTrigger value="percentage" className="text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 rounded transition-all">
                  % Percentage
              </TabsTrigger>
              <TabsTrigger value="amount" className="text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 rounded transition-all">
                  ₹ Amount
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="space-y-2">
            <Label htmlFor="discount-input" className="text-xs font-medium text-slate-300">
                {discountType === 'percentage' ? 'Enter Percentage (%)' : 'Enter Amount (₹)'}
            </Label>
            <div className="relative">
                <Input 
                  id="discount-input" 
                  type="number" 
                  min="0"
                  max={discountType === 'percentage' ? 100 : item.selling_price}
                  step={discountType === 'percentage' ? "0.1" : "1"}
                  value={discountValue} 
                  onChange={(e) => {
                    setDiscountValue(e.target.value);
                    setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  className={`h-11 pl-10 bg-slate-950 text-slate-100 text-base ${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-700 focus-visible:ring-blue-500'}`} 
                  placeholder="0" 
                  autoFocus
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {discountType === 'percentage' ? <Percent className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                </div>
            </div>
            
            {error ? (
                <p className="text-[11px] text-red-400 font-medium animate-pulse flex items-center gap-1 mt-1">
                    • {error}
                </p>
            ) : (
                <p className="text-[12px] text-slate-400 flex justify-between mt-1">
                    <span>Total Savings:</span>
                    <span className="text-emerald-400 font-medium">{formatPrice(previewDiscountAmount)}</span>
                </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
             <Button variant="outline" onClick={() => setOpen(false)} className="h-10 text-sm bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100">Cancel</Button>
             <Button onClick={handleApply} className="h-10 text-sm bg-blue-600 hover:bg-blue-700 text-white border-0">Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}