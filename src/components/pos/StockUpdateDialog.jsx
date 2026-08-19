import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { supabase } from '@/lib/customSupabaseClient';
import StockHistory from './StockHistory';
import InventoryTrackingTab from './inventory/InventoryTrackingTab';
import { cn } from "@/lib/utils";

/**
 * StockUpdateDialog Component
 * 
 * Handles stock updates for products and their variants.
 * 
 * Accessibility & Keyboard Shortcuts:
 * - Auto-focus: The stock input field is automatically focused when the dialog opens.
 * - First Enter: Pressing Enter in the stock/reason input fields triggers the 'Review Update' transition.
 * - Second Enter: Pressing Enter in the confirmation view triggers 'Confirm Update' (via button focus).
 */
const StockUpdateDialog = ({ open, onOpenChange, product = {}, onSuccess, toast }) => {
    const [selectedVariantId, setSelectedVariantId] = useState("main");
    const [addedStock, setAddedStock] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    
    // Refs for focus management
    const stockInputRef = useRef(null);
    const confirmButtonRef = useRef(null);
    
    // Derived state
    const hasVariants = product.variants && product.variants.length > 0;
    
    // Reset state and handle initial focus when dialog opens
    useEffect(() => {
        if (open) {
            setAddedStock("");
            setReason("");
            setShowConfirmation(false);
            if (hasVariants) {
                setSelectedVariantId(product.variants[0].id);
            } else {
                setSelectedVariantId("main");
            }
            
            // Auto-focus input on open
            setTimeout(() => {
                if (stockInputRef.current) {
                    stockInputRef.current.focus();
                }
            }, 100);
        }
    }, [open, product, hasVariants]);

    // Handle focus transfer to confirmation button when switching views
    useEffect(() => {
        if (showConfirmation) {
            setTimeout(() => {
                if (confirmButtonRef.current) {
                    confirmButtonRef.current.focus();
                }
            }, 100);
        }
    }, [showConfirmation]);

    const getCurrentStock = () => {
        if (hasVariants) {
            const v = product.variants.find(v => v.id === selectedVariantId);
            return v ? (v.stock || 0) : 0;
        }
        return product.stock_level || 0;
    };

    const getVariantName = () => {
        if (hasVariants) {
            const v = product.variants.find(v => v.id === selectedVariantId);
            return v ? v.name : "";
        }
        return product.name;
    }

    const currentStock = getCurrentStock();
    const stockToAdd = parseInt(addedStock || "0", 10);
    const newTotalStock = Math.max(0, currentStock + stockToAdd);
    
    // Validation
    const isInputValid = addedStock !== "" && !isNaN(stockToAdd) && stockToAdd > 0;
    
    // First Enter: Handle Enter key in input fields to trigger review
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isInputValid) {
                setShowConfirmation(true);
            }
        }
    };

    const handleSubmit = async () => {
        if (!isInputValid) return;
        setIsSubmitting(true);

        try {
            const { data, error } = await supabase.rpc('add_product_stock', {
                p_product_id: product.id,
                p_variant_id: hasVariants ? selectedVariantId : null,
                p_quantity: stockToAdd,
                p_reason: reason || "Manual stock update"
            });

            if (error) throw error;

            toast({ 
                title: "Stock Updated", 
                description: `Successfully added ${stockToAdd} units. New total: ${newTotalStock}`
            });
            
            onSuccess?.();
            onOpenChange(false);
        } catch (err) {
            console.error(err);
            toast({ 
                title: "Update Failed", 
                description: err.message || "Could not update stock", 
                variant: "destructive" 
            });
        } finally {
            setIsSubmitting(false);
            setShowConfirmation(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transition-all duration-200 p-0 sm:p-6 bg-white">
                <div className="p-4 sm:p-0 border-b border-slate-100 sm:border-none shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Stock Management</DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Manage inventory for <span className="font-semibold text-slate-900">{product.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-0 min-h-0">
                    <Tabs defaultValue="update" className="w-full flex flex-col h-full overflow-hidden">
                        <TabsList className="grid w-full grid-cols-3 mb-4 shrink-0">
                            <TabsTrigger value="update">Update Stock</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                            <TabsTrigger value="tracking">Inventory Tracking</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-hidden">
                            <TabsContent value="update" className="h-full overflow-y-auto px-1 pb-4 space-y-4 m-0">
                                {showConfirmation ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4" onKeyDown={(e) => {
                                        // Second Enter fallback: if focus is somehow lost but user hits enter in this container
                                        if (e.key === 'Enter' && !isSubmitting) {
                                            e.preventDefault();
                                            handleSubmit();
                                        }
                                    }}>
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
                                                <AlertTriangle className="h-5 w-5" />
                                                Confirm Stock Update
                                            </div>
                                            <p className="text-sm text-amber-700 mb-4">
                                                You are about to add stock to <span className="font-bold">{getVariantName()}</span>.
                                            </p>
                                            <div className="flex items-center justify-between text-sm bg-white p-3 rounded border border-amber-100">
                                                <div className="text-center">
                                                    <div className="text-slate-500 text-xs">Current</div>
                                                    <div className="font-mono font-bold text-lg">{currentStock}</div>
                                                </div>
                                                <ArrowRight className="text-slate-400 h-4 w-4" />
                                                <div className="text-center">
                                                    <div className="text-slate-500 text-xs">Adding</div>
                                                    <div className="font-mono font-bold text-lg text-green-600">+{stockToAdd}</div>
                                                </div>
                                                <ArrowRight className="text-slate-400 h-4 w-4" />
                                                <div className="text-center">
                                                    <div className="text-slate-500 text-xs">New Total</div>
                                                    <div className="font-mono font-bold text-lg text-indigo-600">{newTotalStock}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end pt-2">
                                            <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={isSubmitting}>
                                                Back
                                            </Button>
                                            <Button 
                                                ref={confirmButtonRef}
                                                onClick={handleSubmit} 
                                                disabled={isSubmitting}
                                                className="bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all"
                                                title="Press Enter to confirm update"
                                            >
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Confirm Update (Enter)
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {hasVariants && (
                                            <div className="space-y-2">
                                                <Label>Select Variant</Label>
                                                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {product.variants.map(v => (
                                                            <SelectItem key={v.id} value={v.id}>
                                                                {v.name} (Current: {v.stock})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-xl text-center border border-slate-200">
                                                <div className="text-sm text-slate-500 font-medium mb-1">Current Stock</div>
                                                <div className="text-3xl font-bold font-mono text-slate-900">{currentStock}</div>
                                            </div>
                                            <div className="p-4 bg-blue-50/50 rounded-xl text-center border border-blue-100">
                                                <div className="text-sm text-blue-600 font-medium mb-1">New Total</div>
                                                <div className="text-3xl font-bold font-mono text-blue-700">{newTotalStock}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="stock-input" className="font-semibold">Additional Stock to Add</Label>
                                            <Input
                                                id="stock-input"
                                                ref={stockInputRef}
                                                type="number"
                                                min="1"
                                                placeholder="Enter new stock value and press Enter"
                                                value={addedStock}
                                                onChange={(e) => setAddedStock(e.target.value)}
                                                onKeyDown={handleInputKeyDown}
                                                aria-label="Stock quantity input field. Press Enter to review."
                                                title="Press Enter to review"
                                                className={cn(
                                                    "text-lg font-mono transition-all duration-200 h-12 bg-white",
                                                    "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm",
                                                    !isInputValid && addedStock !== "" ? "border-red-500 focus-visible:ring-red-500" : ""
                                                )}
                                            />
                                            {addedStock !== "" && !isInputValid && (
                                                <p className="text-xs text-red-500 font-medium">Please enter a positive number greater than 0.</p>
                                            )}
                                            <p className="text-xs text-slate-500">
                                                Enter the quantity of new items arriving. This will be added to the current stock.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="reason" className="font-semibold">Reason / Reference (Optional)</Label>
                                            <Input
                                                id="reason"
                                                placeholder="e.g., PO #1234 or Weekly Restock"
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                onKeyDown={handleInputKeyDown}
                                                title="Press Enter to review"
                                                className="bg-white shadow-sm"
                                            />
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <Button 
                                                onClick={() => setShowConfirmation(true)} 
                                                disabled={!isInputValid} 
                                                title="Review Stock Update"
                                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold h-11 px-6 transition-all"
                                            >
                                                Review Update
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="history" className="h-full m-0">
                                <div className="h-full max-h-[400px] overflow-y-auto px-1 pb-4 custom-scrollbar">
                                    <StockHistory productId={product.id} />
                                </div>
                            </TabsContent>

                            <TabsContent value="tracking" className="h-full m-0">
                                <InventoryTrackingTab productId={product.id} currentStock={currentStock} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StockUpdateDialog;