import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, X, Percent, IndianRupee } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

const ManualDiscountPopover = ({ item, onApply, onRemove }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState(item.manualDiscountType || 'percentage');
    const [value, setValue] = useState(item.manualDiscountValue || '');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setType(item.manualDiscountType || 'percentage');
            setValue(item.manualDiscountValue || '');
            setError('');
        }
    }, [isOpen, item.manualDiscountType, item.manualDiscountValue]);

    const handleApply = () => {
        const val = parseFloat(value);
        if (isNaN(val) || value === '') {
            setError('Please enter a valid number');
            return;
        }
        if (type === 'percentage' && (val < 0 || val > 100)) {
            setError('Percentage cannot exceed 100%');
            return;
        }
        if (type === 'amount' && val > item.offerPrice) {
            setError(`Discount cannot exceed ${formatPrice(item.offerPrice)}`);
            return;
        }
        setError('');
        onApply(item.cartItemId, type, val);
        setIsOpen(false);
    };

    const handleRemove = () => {
        onRemove(item.cartItemId);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                        "h-6 w-6 rounded-full shrink-0 transition-colors ml-1",
                        item.manualDiscountAmount > 0 
                            ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" 
                            : "text-slate-400 hover:text-orange-400 hover:bg-slate-800"
                    )}
                    title="Manual Discount"
                >
                    <Tag className="h-3 w-3" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 bg-slate-900 border-slate-700 text-slate-100 shadow-xl overflow-hidden rounded-lg pos-discount-popover" side="top" align="center">
                <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center justify-between text-slate-100">
                    <h4 className="font-bold text-sm">Apply Discount</h4>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-full transition-colors" 
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                <div className="p-4 space-y-4">
                    <Tabs value={type} onValueChange={(val) => {
                        setType(val);
                        setValue('');
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
                        <Label className="text-xs font-medium text-slate-300">Discount Value</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                placeholder={type === 'percentage' ? "0-100" : `Max ${formatPrice(item.offerPrice)}`}
                                className={cn(
                                    "h-10 pl-9 bg-slate-950 text-slate-100 border-slate-700 placeholder:text-slate-500 focus-visible:ring-orange-500 pos-discount-input", 
                                    error && "border-red-500 focus-visible:ring-red-500"
                                )}
                                value={value}
                                onChange={(e) => {
                                    setValue(e.target.value);
                                    setError('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                                autoFocus
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                {type === 'percentage' ? <Percent className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                            </div>
                        </div>
                        {error ? (
                            <p className="text-[10px] text-red-400 font-medium animate-pulse flex items-center gap-1 mt-1">
                                • {error}
                            </p>
                        ) : item.offerPrice > 0 ? (
                            <p className="text-[10px] text-slate-400 mt-1">
                                Max applicable on: <span className="text-slate-300">{formatPrice(item.offerPrice)}</span>
                            </p>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {item.manualDiscountAmount > 0 ? (
                            <Button 
                                variant="outline" 
                                className="h-9 text-xs bg-slate-800 border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors" 
                                onClick={handleRemove}
                            >
                                Remove
                            </Button>
                        ) : (
                            <Button 
                                variant="outline" 
                                className="h-9 text-xs bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100 pos-discount-cancel transition-colors" 
                                onClick={() => setIsOpen(false)}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button 
                            className="h-9 text-xs bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-900/20 border-0 transition-colors" 
                            onClick={handleApply}
                        >
                            {item.manualDiscountAmount > 0 ? 'Update' : 'Apply'}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ManualDiscountPopover;