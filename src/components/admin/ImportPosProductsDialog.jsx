import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Search, Loader2, X, AlertCircle, Image as ImageIcon, CheckCircle, PackageSearch } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';
import { cn, formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const ImportPosProductsDialog = ({ open, onOpenChange, onProductsImported, posUserId }) => {
    const { user } = useAuth();
    const targetUserId = posUserId || user?.id;
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    const [existingBarcodes, setExistingBarcodes] = useState(new Set());
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);

    const inputRef = useRef(null);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setSearchTerm('');
            setResults([]);
            setSelectedProducts(new Set());
            setExistingBarcodes(new Set());
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    // Perform Search
    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearchTerm.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                // FIXED: Changed 'name' to 'product_name' to match the database column in product_master
                // Also searching by barcode and category
                const { data, error } = await supabase
                    .from('product_master')
                    .select('*')
                    .or(`product_name.ilike.%${debouncedSearchTerm}%,barcode.ilike.%${debouncedSearchTerm}%,category.ilike.%${debouncedSearchTerm}%`)
                    .limit(50);

                if (error) {
                    throw error;
                }

                setResults(data || []);
                
                // Check duplicates for these results if we found any
                if (data && data.length > 0) {
                    await checkDuplicates(data);
                }
            } catch (error) {
                console.error("Search error:", error);
                toast({
                    title: "Search Failed",
                    description: error.message || "Could not fetch products. Please check your connection and try again.",
                    variant: "destructive"
                });
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [debouncedSearchTerm]);

    // Check duplicates in POS table
    const checkDuplicates = async (productsToCheck) => {
        if (!targetUserId) return;
        setCheckingDuplicates(true);
        
        const barcodesToCheck = productsToCheck
            .map(p => p.barcode)
            .filter(Boolean);

        if (barcodesToCheck.length === 0) {
            setCheckingDuplicates(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('point_of_sale_products')
                .select('barcode')
                .eq('user_id', targetUserId)
                .in('barcode', barcodesToCheck);

            if (error) throw error;

            const existing = new Set(data.map(p => p.barcode));
            setExistingBarcodes(prev => {
                const next = new Set(prev);
                existing.forEach(b => next.add(b));
                return next;
            });
        } catch (error) {
            console.error("Duplicate check failed:", error);
            // Non-blocking error, just log it
        } finally {
            setCheckingDuplicates(false);
        }
    };

    const handleSelectProduct = (product) => {
        if (existingBarcodes.has(product.barcode)) return; // Prevent selecting existing

        setSelectedProducts(prev => {
            const next = new Set(prev);
            if (next.has(product.id)) {
                next.delete(product.id);
            } else {
                next.add(product.id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        const selectable = results.filter(p => !existingBarcodes.has(p.barcode));
        const allSelected = selectable.every(p => selectedProducts.has(p.id));

        setSelectedProducts(prev => {
            const next = new Set(prev);
            if (allSelected) {
                selectable.forEach(p => next.delete(p.id));
            } else {
                selectable.forEach(p => next.add(p.id));
            }
            return next;
        });
    };

    const handleImport = async () => {
        if (selectedProducts.size === 0) return;
        if (!targetUserId) {
            toast({ title: "Error", description: "User ID missing. Cannot import.", variant: "destructive" });
            return;
        }

        setImporting(true);
        try {
            const productsToImport = results.filter(p => selectedProducts.has(p.id));
            
            const payload = productsToImport.map(p => ({
                user_id: targetUserId,
                // Mapping product_master fields to point_of_sale_products fields
                name: p.product_name, // Map product_name to name
                barcode: p.barcode,
                sku: p.barcode || `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`, // Fallback SKU
                category: p.category || 'Uncategorized',
                selling_price: p.selling_price || p.mrp || 0,
                cost_price: p.purchase_price || 0,
                tax_rate: p.gst_rate || 0,
                mrp: p.mrp || 0,
                image_url: p.image_url,
                unit: p.unit || 'pcs',
                stock_level: 0, // Default stock
                low_stock_threshold: 5,
                is_visible_online: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            // Double check validation before insert
            const duplicates = payload.filter(p => p.barcode && existingBarcodes.has(p.barcode));
            if (duplicates.length > 0) {
                throw new Error(`${duplicates.length} products already exist in your inventory.`);
            }

            const { error } = await supabase
                .from('point_of_sale_products')
                .insert(payload);

            if (error) throw error;

            toast({
                title: "Import Successful",
                description: (
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Successfully imported <strong>{payload.length}</strong> products!</span>
                    </div>
                ),
            });

            onProductsImported?.();
            onOpenChange(false);

        } catch (error) {
            console.error("Import failed:", error);
            toast({
                title: "Import Failed",
                description: error.message || "Something went wrong during import.",
                variant: "destructive"
            });
        } finally {
            setImporting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        } else if (e.key === 'Escape') {
            if (searchTerm) {
                setSearchTerm('');
                e.preventDefault();
            }
        }
    };

    const isAllSelectableSelected = useMemo(() => {
        const selectable = results.filter(p => !existingBarcodes.has(p.barcode));
        return selectable.length > 0 && selectable.every(p => selectedProducts.has(p.id));
    }, [results, existingBarcodes, selectedProducts]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl">
                <DialogHeader className="px-6 py-4 border-b bg-white dark:bg-slate-950 shrink-0">
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <PackageSearch className="h-6 w-6 text-blue-600" />
                        Import from Master Catalog
                    </DialogTitle>
                    <DialogDescription>
                        Search and select products from the global catalog to add to your inventory.
                    </DialogDescription>
                </DialogHeader>

                {/* Search Bar */}
                <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b space-y-4 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                            ref={inputRef}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search by product name, barcode, or category..."
                            className="pl-10 pr-10 h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-slate-100 rounded-full text-slate-500"
                                onClick={() => setSearchTerm('')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                                </span>
                            ) : results.length > 0 ? (
                                <span>Found <strong>{results.length}</strong> matches</span>
                            ) : searchTerm ? (
                                <span>No results found</span>
                            ) : (
                                <span>Start typing to search...</span>
                            )}
                        </div>
                        {results.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Checkbox 
                                    id="select-all" 
                                    checked={isAllSelectableSelected}
                                    onCheckedChange={handleSelectAll}
                                />
                                <label htmlFor="select-all" className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                                    Select All Valid
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <ScrollArea className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
                                    <Skeleton className="h-12 w-12 rounded-lg" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-2">
                            {/* Desktop Table View */}
                            <div className="hidden md:block rounded-xl border bg-white overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="w-12 text-center">Select</TableHead>
                                            <TableHead className="w-16">Image</TableHead>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Barcode</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">MRP</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((product) => {
                                            const isExisting = existingBarcodes.has(product.barcode);
                                            const isSelected = selectedProducts.has(product.id);
                                            
                                            return (
                                                <TableRow 
                                                    key={product.id} 
                                                    className={cn(
                                                        "cursor-pointer transition-colors",
                                                        isExisting ? "bg-slate-50 opacity-60 cursor-not-allowed" : "hover:bg-blue-50/50",
                                                        isSelected && "bg-blue-50 border-blue-100"
                                                    )}
                                                    onClick={() => !isExisting && handleSelectProduct(product)}
                                                >
                                                    <TableCell className="text-center">
                                                        <Checkbox 
                                                            checked={isSelected}
                                                            disabled={isExisting}
                                                            className={cn(isExisting && "opacity-50")}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {product.image_url ? (
                                                            <img 
                                                                src={product.image_url} 
                                                                alt={product.product_name} 
                                                                className="h-10 w-10 object-cover rounded-md border"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center text-slate-400">
                                                                <ImageIcon className="h-5 w-5" />
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{product.product_name}</span>
                                                            {isExisting && (
                                                                <span className="text-[10px] text-amber-600 flex items-center gap-1 font-semibold mt-0.5">
                                                                    <AlertCircle className="h-3 w-3" /> Already in POS
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-500">
                                                        {product.barcode || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                            {product.category || 'General'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-slate-700">
                                                        {formatPrice(product.selling_price || product.mrp)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile List View */}
                            <div className="md:hidden space-y-3">
                                {results.map((product) => {
                                    const isExisting = existingBarcodes.has(product.barcode);
                                    const isSelected = selectedProducts.has(product.id);

                                    return (
                                        <div 
                                            key={product.id}
                                            onClick={() => !isExisting && handleSelectProduct(product)}
                                            className={cn(
                                                "flex items-start gap-3 p-3 rounded-xl border bg-white shadow-sm transition-all active:scale-[0.98]",
                                                isExisting ? "bg-slate-50 border-slate-100 opacity-75" : "active:border-blue-300",
                                                isSelected && "ring-2 ring-blue-500 ring-offset-1 border-blue-500"
                                            )}
                                        >
                                            <Checkbox 
                                                checked={isSelected}
                                                disabled={isExisting}
                                                className="mt-1"
                                            />
                                            
                                            {product.image_url ? (
                                                <img 
                                                    src={product.image_url} 
                                                    alt="" 
                                                    className="h-16 w-16 object-cover rounded-lg border bg-slate-50 shrink-0"
                                                />
                                            ) : (
                                                <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                                                    <ImageIcon className="h-6 w-6" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-slate-900 leading-tight mb-1">
                                                    {product.product_name}
                                                </h4>
                                                <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-1">
                                                    <span className="font-mono bg-slate-100 px-1 rounded">{product.barcode || 'No Barcode'}</span>
                                                    <span>•</span>
                                                    <span>{product.category}</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="font-bold text-slate-900">{formatPrice(product.selling_price || product.mrp)}</span>
                                                    {isExisting && (
                                                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-100">
                                                            Already Added
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : searchTerm ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                            <PackageSearch className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-lg font-medium">No matching products found</p>
                            <p className="text-sm">Try different keywords or barcode</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                            <Search className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-lg font-medium">Search Master Catalog</p>
                            <p className="text-sm">Find and import products instantly</p>
                        </div>
                    )}
                </ScrollArea>

                {/* Footer Actions */}
                <DialogFooter className="p-4 border-t bg-white dark:bg-slate-950 shrink-0 gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleImport} 
                        disabled={importing || selectedProducts.size === 0}
                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                    >
                        {importing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                Import {selectedProducts.size > 0 ? `(${selectedProducts.size})` : ''} Selected
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImportPosProductsDialog;