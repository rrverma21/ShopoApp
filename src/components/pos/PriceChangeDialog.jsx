import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PriceChangeDialog({ product, open, onOpenChange, onConfirm }) {
    const [price, setPrice] = useState(product?.selling_price || 0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setPrice(product?.selling_price || 0);
            setTimeout(() => inputRef.current?.select(), 100);
        }
    }, [open, product]);

    const handleConfirm = () => {
        const newPrice = parseFloat(price);
        if (!isNaN(newPrice) && newPrice >= 0) {
            onConfirm(newPrice);
            onOpenChange(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 shadow-2xl sm:rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-slate-50 text-lg font-semibold">Change Price for {product?.name}</DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">
                        This product allows price changes at checkout. Enter the new selling price (Inclusive of Tax).
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    <Label htmlFor="new-price" className="text-slate-200 font-medium">New Selling Price (Inc. Tax)</Label>
                    <Input
                        id="new-price"
                        ref={inputRef}
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        className="text-lg bg-slate-950 text-slate-100 border-slate-700 placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                    />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)} 
                        className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        className="bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-900/20"
                    >
                        Confirm Price
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}