import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from '@/lib/utils';
import { Percent, IndianRupee, Trash2, Ticket } from 'lucide-react';

export default function GlobalDiscountPopover({ globalDiscount, updateGlobalDiscount, subtotal, children }) {
  const [open, setOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState(globalDiscount?.value || '');
  const [discountType, setDiscountType] = useState(globalDiscount?.type || 'amount');
  const [error, setError] = useState('');

  // Reset local state when popover opens or global state changes
  useEffect(() => {
    if (open) {
        setDiscountValue(globalDiscount?.value || '');
        setDiscountType(globalDiscount?.type || 'amount');
        setError('');
    }
  }, [globalDiscount, open]);

  const handleApply = () => {
    const val = parseFloat(discountValue);

    if (isNaN(val) || val < 0) {
      setError('Invalid value');
      return;
    }

    if (discountType === 'percentage' && val > 100) {
      setError('Max 100%');
      return;
    }

    if (discountType === 'amount' && val > subtotal) {
      setError(`Max ${formatPrice(subtotal)}`);
      return;
    }

    updateGlobalDiscount(val, discountType);
    setOpen(false);
  };

  const handleRemove = () => {
    updateGlobalDiscount(0, 'amount');
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
  const previewDiscountAmount = (() => {
      const val = parseFloat(discountValue) || 0;
      if (discountType === 'percentage') {
          return (subtotal * val) / 100;
      } else {
          return Math.min(val, subtotal);
      }
  })();

  const previewTotal = Math.max(0, subtotal - previewDiscountAmount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
            <Button variant="outline" className="flex items-center gap-2 border-dashed border-orange-500/50 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 bg-slate-800">
                <Ticket className="w-4 h-4" />
                {globalDiscount.value > 0 ? (
                    <span>{globalDiscount.type === 'amount' ? formatPrice(globalDiscount.value) : `${globalDiscount.value}%`} Off</span>
                ) : (
                    <span>Add Global Discount</span>
                )}
            </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 bg-slate-900 border-slate-700 text-slate-100 shadow-xl overflow-hidden rounded-lg pos-discount-popover">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 text-white">
            <h4 className="font-bold text-sm flex items-center justify-between">
                <span>Cart Discount</span>
                {globalDiscount.value > 0 && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleRemove}
                        className="h-6 w-6 text-white hover:bg-white/20 rounded-full"
                        title="Remove Discount"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                )}
            </h4>
            <div className="text-xs text-orange-100 mt-1 flex justify-between">
                <span>Subtotal: {formatPrice(subtotal)}</span>
                <span className="font-semibold text-white">New Total: {formatPrice(previewTotal)}</span>
            </div>
        </div>

        <div className="p-4 space-y-4">
          <Tabs value={discountType} onValueChange={(val) => {
              setDiscountType(val);
              setDiscountValue('');
              setError('');
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9 bg-slate-800 border border-slate-700 pos-discount-tabs">
              <TabsTrigger value="percentage" className="text-xs text-slate-400 data-[state=active]:bg-orange-900/50 data-[state=active]:text-orange-400 transition-colors">
                  <Percent className="w-3 h-3 mr-1" /> Percentage
              </TabsTrigger>
              <TabsTrigger value="amount" className="text-xs text-slate-400 data-[state=active]:bg-green-900/50 data-[state=active]:text-green-400 transition-colors">
                  <IndianRupee className="w-3 h-3 mr-1" /> Amount
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="space-y-2">
            <Label htmlFor="global-discount-input" className="text-xs font-medium text-slate-300">
                {discountType === 'percentage' ? 'Enter Percentage (%)' : 'Enter Amount (₹)'}
            </Label>
            <div className="relative">
                <Input 
                  id="global-discount-input" 
                  type="number" 
                  min="0"
                  max={discountType === 'percentage' ? 100 : subtotal}
                  step={discountType === 'percentage' ? "0.1" : "1"}
                  value={discountValue} 
                  onChange={(e) => {
                    setDiscountValue(e.target.value);
                    setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  className={`h-10 pl-9 bg-slate-950 text-slate-100 pos-discount-input ${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-700 focus-visible:ring-orange-500'}`} 
                  placeholder="0" 
                  autoFocus
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {discountType === 'percentage' ? <Percent className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                </div>
            </div>
            
            {error ? (
                <p className="text-[10px] text-red-400 font-medium animate-pulse flex items-center gap-1">
                    • {error}
                </p>
            ) : (
                <p className="text-[10px] text-slate-400 flex justify-between">
                    <span>Total Savings:</span>
                    <span className="text-emerald-400 font-medium">{formatPrice(previewDiscountAmount)}</span>
                </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
             <Button variant="outline" onClick={() => setOpen(false)} className="h-9 text-xs bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100 pos-discount-cancel">Cancel</Button>
             <Button onClick={handleApply} className="h-9 text-xs bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-900/20 border-0">Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}