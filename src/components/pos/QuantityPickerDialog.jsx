import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function QuantityPickerDialog({ open, onOpenChange, product, onConfirm }) {
  const [qty, setQty] = useState('1');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
        setQty('1');
        setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [open]);

  const handleSubmit = () => {
    const val = parseFloat(qty);
    if (val > 0) {
      onConfirm(val);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[300px] bg-blue-50 border-blue-100 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Enter Quantity</DialogTitle>
          <DialogDescription className="text-slate-600">
            {product?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex items-center justify-center gap-2">
             <Input 
                ref={inputRef}
                type="number" 
                step="0.001" 
                min="0.001" 
                value={qty} 
                onChange={e => setQty(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="text-center text-lg w-32 h-12 bg-white text-slate-900 border-blue-200 focus:border-blue-400 focus:ring-blue-400 shadow-sm"
             />
             <span className="text-sm font-medium text-slate-600">{product?.unit || 'Units'}</span>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="bg-white border-blue-200 text-slate-700 hover:bg-blue-100 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95 transition-all"
            >
              Confirm
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}