import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Send, Save, Loader2, Phone, Clock, FileText, AlertCircle, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useProductListDrafts } from '@/hooks/useProductListDrafts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

const createEmptyRow = () => ({
    id: Date.now().toString() + Math.random().toString(),
    productSearch: '',
    selectedProduct: null,
    productsList: [],
    isDropdownOpen: false,
    isLoading: false,
    quantity: '',
    mrp: ''
});

const ProductListModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { drafts, fetchDrafts, saveDraft, deleteDraft, isLoading: isDraftLoading } = useProductListDrafts();
    
    const [activeTab, setActiveTab] = useState('compose');
    const [currentDraftId, setCurrentDraftId] = useState(null);
    const [submitAttempted, setSubmitAttempted] = useState(false);

    // Supplier State
    const [supplierSearch, setSupplierSearch] = useState('');
    const debouncedSupplierSearch = useDebounce(supplierSearch, 300);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isSupplierOpen, setIsSupplierOpen] = useState(false);
    const [isSupplierLoading, setIsSupplierLoading] = useState(false);
    const supplierRef = useRef(null);

    // Products State
    const [rows, setRows] = useState([createEmptyRow()]);
    const productRefs = useRef({});
    const searchTimeout = useRef({});
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset Form
    const resetForm = useCallback(() => {
        setSelectedSupplier(null);
        setSupplierSearch('');
        setRows([createEmptyRow()]);
        setCurrentDraftId(null);
        setSubmitAttempted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchDrafts();
        } else {
            setActiveTab('compose');
        }
    }, [isOpen, fetchDrafts]);

    // Handle Click Outside for Dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (supplierRef.current && !supplierRef.current.contains(event.target)) {
                setIsSupplierOpen(false);
            }
            Object.keys(productRefs.current).forEach(id => {
                if (productRefs.current[id] && !productRefs.current[id].contains(event.target)) {
                    setRows(prev => prev.map(r => r.id === id && r.isDropdownOpen ? { ...r, isDropdownOpen: false } : r));
                }
            });
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Suppliers
    const fetchSuppliers = useCallback(async () => {
        if (!user) return;
        setIsSupplierLoading(true);
        try {
            let query = supabase
                .from('suppliers')
                .select('id, name, phone, email')
                .eq('seller_id', user.id)
                .order('name', { ascending: true })
                .limit(50);
            
            if (debouncedSupplierSearch) {
                query = query.ilike('name', `%${debouncedSupplierSearch}%`);
            }
            const { data, error } = await query;
            if (error) throw error;
            setSuppliers(data || []);
        } catch (err) {
            console.error('Error fetching suppliers:', err);
        } finally {
            setIsSupplierLoading(false);
        }
    }, [user, debouncedSupplierSearch]);

    useEffect(() => {
        if (isSupplierOpen) {
            fetchSuppliers();
        }
    }, [fetchSuppliers, isSupplierOpen]);

    // Product Search
    const fetchProductsForRow = async (search, rowId) => {
        if (!user) return;
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, isLoading: true } : r));
        try {
            let query = supabase
                .from('point_of_sale_products')
                .select(`id, name, sku, selling_price, stock_level`)
                .eq('user_id', user.id)
                .eq('archived', false)
                .limit(20);
                
            if (search) {
                query = query.ilike('name', `%${search}%`);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            
            setRows(prev => prev.map(r => r.id === rowId ? { ...r, productsList: data || [], isLoading: false } : r));
        } catch (err) {
            console.error('Error fetching products:', err);
            setRows(prev => prev.map(r => r.id === rowId ? { ...r, isLoading: false } : r));
        }
    };

    const handleProductSearchChange = (val, rowId) => {
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, productSearch: val, selectedProduct: null, isDropdownOpen: true } : r));
        
        if (searchTimeout.current[rowId]) clearTimeout(searchTimeout.current[rowId]);
        searchTimeout.current[rowId] = setTimeout(() => {
            fetchProductsForRow(val, rowId);
        }, 300);
    };

    const handleProductSelect = (rowId, product) => {
        setRows(prev => prev.map(r => {
            if (r.id === rowId) {
                return {
                    ...r,
                    selectedProduct: product,
                    productSearch: product.name,
                    mrp: product.selling_price ? product.selling_price.toString() : '',
                    quantity: r.quantity || '1',
                    isDropdownOpen: false
                };
            }
            return r;
        }));
    };

    const handleCustomProductSelect = (rowId, searchVal) => {
        setRows(prev => prev.map(r => {
            if (r.id === rowId) {
                return {
                    ...r,
                    selectedProduct: { id: 'custom', name: searchVal },
                    productSearch: searchVal,
                    quantity: r.quantity || '1',
                    isDropdownOpen: false
                };
            }
            return r;
        }));
    };

    // Row Operations
    const addRow = () => setRows([...rows, createEmptyRow()]);
    const removeRow = (id) => {
        if (rows.length > 1) {
            setRows(rows.filter(r => r.id !== id));
        } else {
            setRows([createEmptyRow()]);
        }
    };
    const updateRowField = (id, field, value) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    // Totals
    const validRows = rows.filter(r => r.selectedProduct && parseFloat(r.quantity) > 0);
    const totalItems = validRows.reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
    const totalValue = validRows.reduce((sum, r) => sum + ((parseFloat(r.mrp) || 0) * (parseInt(r.quantity) || 0)), 0);

    // Validation
    const validateForm = () => {
        let hasError = false;
        let errorMessage = null;

        if (!selectedSupplier) {
            hasError = true;
            errorMessage = "Please select a supplier.";
        } else if (validRows.length === 0) {
            hasError = true;
            errorMessage = "Please add at least one valid product with quantity > 0.";
        } else {
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                if (r.selectedProduct || r.productSearch.trim() !== '') {
                    if (!r.selectedProduct) {
                         hasError = true;
                         errorMessage = `Row ${i+1}: Please select a product from dropdown or click 'Add custom'.`;
                         break;
                    }
                    if (!r.quantity || parseFloat(r.quantity) <= 0) {
                        hasError = true;
                        errorMessage = `Row ${i+1}: Quantity must be greater than 0.`;
                        break;
                    }
                    if (!r.mrp || parseFloat(r.mrp) <= 0) {
                        hasError = true;
                        errorMessage = `Row ${i+1}: MRP must be greater than 0.`;
                        break;
                    }
                }
            }
        }

        return { hasError, errorMessage };
    };

    // Save Draft
    const handleSaveDraft = async () => {
        setSubmitAttempted(true);
        if (!selectedSupplier && validRows.length === 0) {
            toast({ title: "Empty List", description: "Add a supplier or products before saving.", variant: "destructive" });
            return;
        }
        
        const draftData = {
            supplier_id: selectedSupplier?.id,
            supplier_info: selectedSupplier ? { name: selectedSupplier.name, phone: selectedSupplier.phone } : null,
            product_list: rows.map(r => ({
                product_id: r.selectedProduct?.id,
                product_name: r.productSearch,
                quantity: r.quantity,
                mrp: r.mrp
            })),
            status: 'draft'
        };

        const result = await saveDraft(draftData, currentDraftId);
        if (result) {
            setCurrentDraftId(result.id);
            toast({ title: "Draft Saved", description: "Your product list has been saved." });
        }
    };

    const loadDraft = (draft) => {
        setCurrentDraftId(draft.id);
        if (draft.supplier_info) {
            setSelectedSupplier({
                id: draft.supplier_id,
                name: draft.supplier_info.name,
                phone: draft.supplier_info.phone
            });
            setSupplierSearch(draft.supplier_info.name);
        } else {
            setSelectedSupplier(null);
            setSupplierSearch('');
        }

        if (draft.product_list && draft.product_list.length > 0) {
            const restoredRows = draft.product_list.map(item => ({
                id: Date.now().toString() + Math.random().toString(),
                productSearch: item.product_name || '',
                selectedProduct: item.product_id ? { id: item.product_id, name: item.product_name } : { id: 'custom', name: item.product_name },
                productsList: [],
                isDropdownOpen: false,
                isLoading: false,
                quantity: item.quantity || '',
                mrp: item.mrp || ''
            }));
            setRows(restoredRows);
        } else {
            setRows([createEmptyRow()]);
        }
        setActiveTab('compose');
        setSubmitAttempted(false);
    };

    // Send WhatsApp
    const handleSendWhatsApp = async () => {
        setSubmitAttempted(true);
        const { hasError, errorMessage } = validateForm();
        if (hasError) {
            toast({ title: "Validation Error", description: errorMessage, variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        try {
            let message = `Hello ${selectedSupplier.name},\n\nPlease find the required product list below:\n\n`;
            
            validRows.forEach((r, idx) => {
                message += `${idx + 1}. *${r.selectedProduct.name}*\n`;
                message += `   Qty: ${r.quantity} | MRP: ₹${parseFloat(r.mrp).toFixed(2)}\n`;
            });

            message += `\n*Summary:*\n`;
            message += `Total Items: ${totalItems}\n`;
            message += `Estimated Value: ₹${totalValue.toFixed(2)}\n\n`;
            message += `Please confirm availability.\nThank you.`;

            const encodedMessage = encodeURIComponent(message);
            let whatsappUrl = '';

            if (selectedSupplier.phone) {
                let cleanPhone = selectedSupplier.phone.replace(/\D/g, '');
                if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
                whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
            } else {
                whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
            }

             const draftData = {
                supplier_id: selectedSupplier.id,
                supplier_info: { name: selectedSupplier.name, phone: selectedSupplier.phone },
                product_list: rows.map(r => ({
                    product_id: r.selectedProduct?.id,
                    product_name: r.productSearch,
                    quantity: r.quantity,
                    mrp: r.mrp
                })),
                status: 'sent'
            };
            await saveDraft(draftData, currentDraftId);

            window.open(whatsappUrl, '_blank');
            toast({ title: "Opening WhatsApp", description: "Preparing your message..." });
            onClose();
            setTimeout(resetForm, 500);

        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to generate WhatsApp link.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-full h-[100dvh] sm:h-[90vh] sm:max-h-[900px] max-w-full sm:max-w-4xl flex flex-col p-0 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden rounded-none sm:rounded-xl">
                
                {/* Sticky Header */}
                <DialogHeader className="sticky top-0 z-30 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/95 backdrop-blur-sm shrink-0 shadow-sm pt-[max(env(safe-area-inset-top),0.75rem)]">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                        <div className="flex justify-between items-center pr-8 sm:pr-0">
                            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                                <span className="truncate">Send Product List</span>
                            </DialogTitle>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-full sm:w-auto mt-1 sm:mt-0">
                            <button 
                                onClick={() => setActiveTab('compose')}
                                className={cn("flex-1 sm:flex-none px-4 py-2 sm:py-1.5 text-sm sm:text-base font-medium rounded-md transition-colors", activeTab === 'compose' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
                            >
                                Compose
                            </button>
                            <button 
                                onClick={() => setActiveTab('drafts')}
                                className={cn("flex-1 sm:flex-none px-4 py-2 sm:py-1.5 text-sm sm:text-base font-medium rounded-md transition-colors", activeTab === 'drafts' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
                            >
                                Drafts & Sent
                            </button>
                        </div>
                    </div>
                    {/* Hidden on mobile, visible on desktop as description */}
                    <DialogDescription className="hidden sm:block mt-1.5">
                        {activeTab === 'compose' ? "Create a list of products to send to your supplier via WhatsApp." : "View your previously saved or sent product lists."}
                    </DialogDescription>
                </DialogHeader>

                {activeTab === 'compose' && (
                    <>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 sm:space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/50 pb-20">
                            {/* Supplier Selection */}
                            <div className="space-y-2 relative" ref={supplierRef}>
                                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Supplier <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <Input 
                                        value={supplierSearch}
                                        onChange={(e) => {
                                            setSupplierSearch(e.target.value);
                                            setIsSupplierOpen(true);
                                            if (selectedSupplier && e.target.value !== selectedSupplier.name) {
                                                setSelectedSupplier(null);
                                            }
                                        }}
                                        onFocus={() => setIsSupplierOpen(true)}
                                        placeholder="Search and select supplier..."
                                        className={cn("pl-10 pr-10 h-12 sm:h-11 text-base sm:text-sm bg-white dark:bg-slate-900 shadow-sm", submitAttempted && !selectedSupplier && "border-red-500")}
                                        autoComplete="off"
                                    />
                                    {supplierSearch && (
                                        <button 
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 touch-target"
                                            onClick={() => {
                                                setSupplierSearch('');
                                                setSelectedSupplier(null);
                                                setIsSupplierOpen(true);
                                            }}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                                
                                {/* Custom Dropdown for Supplier */}
                                {isSupplierOpen && (
                                    <div className="absolute z-[100] top-full left-0 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
                                        <div className="max-h-[40vh] sm:max-h-60 overflow-y-auto custom-scrollbar">
                                            {isSupplierLoading ? (
                                                <div className="p-4 flex justify-center items-center text-sm text-slate-500"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...</div>
                                            ) : suppliers.length === 0 ? (
                                                <div className="p-4 text-center text-sm text-slate-500">No suppliers found.</div>
                                            ) : (
                                                suppliers.map(s => (
                                                    <div 
                                                        key={s.id}
                                                        className="p-3 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex flex-col border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                                                        onClick={() => {
                                                            setSelectedSupplier(s);
                                                            setSupplierSearch(s.name);
                                                            setIsSupplierOpen(false);
                                                        }}
                                                    >
                                                        <span className="font-medium text-base sm:text-sm text-slate-900 dark:text-slate-100">{s.name}</span>
                                                        {s.phone && <span className="text-sm sm:text-xs text-slate-500 flex items-center mt-1"><Phone className="w-3.5 h-3.5 mr-1"/>{s.phone}</span>}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {submitAttempted && !selectedSupplier && (
                                    <p className="text-sm sm:text-xs text-red-500 flex items-center mt-1"><AlertCircle className="w-4 h-4 sm:w-3 sm:h-3 mr-1" /> Supplier is required.</p>
                                )}
                            </div>

                            {/* Products Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Products <span className="text-red-500">*</span></Label>
                                
                                {/* Desktop Table Header */}
                                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-b-0 border-slate-200 dark:border-slate-800 rounded-t-xl text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                                    <div className="col-span-5">Product Name <span className="text-red-500">*</span></div>
                                    <div className="col-span-3 text-center">Quantity <span className="text-red-500">*</span></div>
                                    <div className="col-span-3 text-right">MRP (₹) <span className="text-red-500">*</span></div>
                                    <div className="col-span-1 text-center">Action</div>
                                </div>

                                {/* Rows Container */}
                                <div className="flex flex-col gap-4 sm:gap-0 sm:border sm:border-slate-200 sm:dark:border-slate-800 sm:rounded-b-xl overflow-visible">
                                    {rows.map((row, index) => (
                                        <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-4 sm:p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 sm:border-0 sm:border-b last:border-b-0 rounded-xl sm:rounded-none shadow-sm sm:shadow-none relative">
                                            
                                            {/* Mobile Card Header */}
                                            <div className="flex sm:hidden justify-between items-center mb-1">
                                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Item {index + 1}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => removeRow(row.id)} 
                                                    className="h-10 w-10 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 rounded-full"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </div>

                                            {/* Product Input */}
                                            <div className="col-span-1 sm:col-span-5 relative" ref={el => productRefs.current[row.id] = el}>
                                                <Input 
                                                    placeholder="Search or type product..." 
                                                    value={row.productSearch}
                                                    onChange={(e) => handleProductSearchChange(e.target.value, row.id)}
                                                    onFocus={() => {
                                                        updateRowField(row.id, 'isDropdownOpen', true);
                                                        if(row.productsList.length === 0) fetchProductsForRow(row.productSearch, row.id);
                                                    }}
                                                    className={cn("bg-slate-50 dark:bg-slate-900 sm:bg-white h-12 sm:h-10 text-base sm:text-sm shadow-sm sm:shadow-none", 
                                                        submitAttempted && !row.selectedProduct && row.productSearch.trim() === '' && "border-red-500"
                                                    )}
                                                    autoComplete="off"
                                                />
                                                
                                                {/* Custom Dropdown for Products */}
                                                {row.isDropdownOpen && (
                                                    <div className="absolute z-[100] top-full left-0 mt-1 w-full sm:w-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
                                                        <div className="max-h-[40vh] sm:max-h-60 overflow-y-auto custom-scrollbar">
                                                            {row.isLoading ? (
                                                                 <div className="p-4 flex justify-center text-sm text-slate-500"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...</div>
                                                            ) : (
                                                                <>
                                                                    {row.productsList.length === 0 && row.productSearch.trim() === '' && (
                                                                        <div className="p-4 text-center text-sm text-slate-500">Type to search inventory...</div>
                                                                    )}
                                                                    
                                                                    {row.productsList.map(p => (
                                                                        <div 
                                                                            key={p.id}
                                                                            className="p-3 sm:p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex flex-col border-b border-slate-50 dark:border-slate-800/50"
                                                                            onClick={() => handleProductSelect(row.id, p)}
                                                                        >
                                                                            <span className="font-medium text-base sm:text-sm text-slate-900 dark:text-slate-100">{p.name}</span>
                                                                            <div className="flex justify-between mt-1 text-sm sm:text-xs text-slate-500">
                                                                                <span>MRP: ₹{p.selling_price || 0}</span>
                                                                                <span>SKU: {p.sku || '-'}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}

                                                                    {row.productSearch.trim() !== '' && !row.productsList.some(p => p.name.toLowerCase() === row.productSearch.toLowerCase()) && (
                                                                        <div 
                                                                            className="p-3 sm:p-2 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer flex items-center text-base sm:text-sm text-blue-600 font-medium"
                                                                            onClick={() => handleCustomProductSelect(row.id, row.productSearch)}
                                                                        >
                                                                            <Plus className="w-5 h-5 mr-2" /> Add "{row.productSearch}"
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {submitAttempted && !row.selectedProduct && (
                                                    <p className="text-xs sm:text-[10px] text-red-500 mt-1">Product required.</p>
                                                )}
                                            </div>

                                            {/* Grid for Qty and MRP on mobile */}
                                            <div className="grid grid-cols-2 gap-3 sm:gap-0 sm:contents">
                                                {/* Quantity Input */}
                                                <div className="col-span-1 sm:col-span-3">
                                                    <div className="flex flex-col sm:block">
                                                        <Label className="sm:hidden text-xs text-slate-500 mb-1 ml-1">Quantity</Label>
                                                        <Input 
                                                            type="number" 
                                                            inputMode="numeric"
                                                            min="1" 
                                                            value={row.quantity} 
                                                            onChange={(e) => updateRowField(row.id, 'quantity', e.target.value)} 
                                                            placeholder="Qty" 
                                                            className={cn("text-center bg-slate-50 dark:bg-slate-900 sm:bg-white h-12 sm:h-10 text-base sm:text-sm shadow-sm sm:shadow-none", 
                                                                submitAttempted && (!row.quantity || parseFloat(row.quantity) <= 0) && "border-red-500"
                                                            )} 
                                                        />
                                                    </div>
                                                </div>

                                                {/* MRP Input */}
                                                <div className="col-span-1 sm:col-span-3">
                                                    <div className="flex flex-col sm:block h-full">
                                                        <Label className="sm:hidden text-xs text-slate-500 mb-1 ml-1">MRP</Label>
                                                        <div className="relative flex items-center h-12 sm:h-10">
                                                            <span className="absolute left-3 text-slate-500 text-base sm:text-sm">₹</span>
                                                            <Input 
                                                                type="number" 
                                                                inputMode="decimal"
                                                                min="0" 
                                                                step="0.01" 
                                                                value={row.mrp} 
                                                                onChange={(e) => updateRowField(row.id, 'mrp', e.target.value)} 
                                                                placeholder="0.00" 
                                                                className={cn("pl-7 text-right bg-slate-50 dark:bg-slate-900 sm:bg-white h-full text-base sm:text-sm shadow-sm sm:shadow-none",
                                                                    submitAttempted && (!row.mrp || parseFloat(row.mrp) <= 0) && "border-red-500"
                                                                )} 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Desktop Action Button */}
                                            <div className="hidden sm:flex col-span-1 justify-center items-center">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => removeRow(row.id)} 
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                    aria-label="Remove row"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Add Row Button Area */}
                                    <div className="p-0 sm:p-3 sm:bg-slate-50/50 sm:dark:bg-slate-900/30 sm:border-t border-slate-100 dark:border-slate-800 rounded-b-xl">
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            onClick={addRow} 
                                            className="text-blue-600 border-blue-200 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 w-full sm:w-auto h-12 sm:h-9 text-base sm:text-sm font-medium bg-white sm:bg-transparent shadow-sm sm:shadow-none"
                                        >
                                            <Plus className="w-5 h-5 sm:w-4 sm:h-4 mr-2" /> Add Another Product
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Summary Footer */}
                        <DialogFooter className="sticky bottom-0 z-30 px-4 py-4 sm:px-6 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex-col sm:flex-row justify-between items-center gap-4 sm:gap-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] pb-[max(env(safe-area-inset-bottom),1rem)] sm:pb-4">
                            <div className="flex justify-between w-full sm:w-auto sm:gap-6 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                    <span className="text-xs sm:text-sm text-slate-500">Total Items</span> 
                                    <span className="font-bold text-lg sm:text-base text-slate-900 dark:text-white">{totalItems}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-right sm:text-left">
                                    <span className="text-xs sm:text-sm text-slate-500">Est. Value</span>
                                    <span className="font-bold text-lg sm:text-base text-slate-900 dark:text-white text-green-600 dark:text-green-400">₹{totalValue.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isProcessing} className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm font-medium bg-white dark:bg-slate-950">
                                    <Save className="w-5 h-5 sm:w-4 sm:h-4 mr-2 text-slate-500" /> Save Draft
                                </Button>
                                <Button type="button" onClick={handleSendWhatsApp} disabled={isProcessing} className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm font-semibold bg-[#25D366] hover:bg-[#20bd5a] text-white border-none shadow-md">
                                    {isProcessing ? <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2 animate-spin" /> : <Send className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />}
                                    Send via WhatsApp
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}

                {activeTab === 'drafts' && (
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/80 custom-scrollbar safe-pb">
                        {isDraftLoading ? (
                            <div className="flex justify-center items-center h-full min-h-[300px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                        ) : drafts.length === 0 ? (
                            <div className="text-center py-16 px-4 text-slate-500">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-10 h-10 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">No Drafts Found</h3>
                                <p className="text-sm">You haven't saved or sent any product lists yet.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                                {drafts.map(draft => (
                                    <div key={draft.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="pr-2">
                                                <h4 className="font-semibold text-base text-slate-900 dark:text-white line-clamp-1">{draft.supplier_info?.name || 'Unknown Supplier'}</h4>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                    <Clock className="w-3.5 h-3.5" /> {format(new Date(draft.updated_at), 'MMM dd, yyyy HH:mm')}
                                                </p>
                                            </div>
                                            <span className={cn("text-[10px] px-2.5 py-1 rounded-full uppercase font-bold tracking-wider shrink-0", 
                                                draft.status === 'sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            )}>
                                                {draft.status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg line-clamp-2 flex-1">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">Items: </span>
                                            {draft.product_list?.map(p => p.product_name).join(', ') || 'None'}
                                        </div>
                                        <div className="flex gap-2 mt-auto">
                                            <Button size="sm" variant="outline" className="flex-1 bg-white dark:bg-slate-950 h-10 sm:h-9" onClick={() => loadDraft(draft)}>
                                                Open / Edit
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 h-10 sm:h-9 w-12 sm:w-10 flex-shrink-0" onClick={() => deleteDraft(draft.id)}>
                                                <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ProductListModal;