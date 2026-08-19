import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Search, X, Barcode as BarcodeIcon, Printer, Loader2, AlertTriangle, Settings2, Eye, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatPrice, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import BarcodeSVG from './BarcodeSVG';

export const LABEL_SIZES = [
  { id: '100x150', label: '100x150mm (4x6")', width: 100, height: 150 },
  { id: '80x50', label: '80x50mm', width: 80, height: 50 },
  { id: '75x50', label: '75x50mm', width: 75, height: 50 },
  { id: '58x40', label: '58x40mm', width: 58, height: 40 },
  { id: '50x25', label: '50x25mm', width: 50, height: 25 },
  { id: '40x30', label: '40x30mm', width: 40, height: 30 },
  { id: '38x25', label: '38x25mm', width: 38, height: 25 },
  { id: '30x20', label: '30x20mm', width: 30, height: 20 },
  { id: 'custom', label: 'Custom Size...', width: 0, height: 0 },
];

export default function BarcodeLabelPrintModal({ open, onOpenChange, initialProducts = [], allProducts = [] }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const posUserId = user?.posOwnerId || user?.id;
  
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  
  // Settings & Toggles
  const [sizePresetId, setSizePresetId] = useState('100x150');
  const [customWidth, setCustomWidth] = useState(50);
  const [customHeight, setCustomHeight] = useState(30);
  const [symbology, setSymbology] = useState('CODE128');

  // Load toggles from localStorage or default to true
  const [showName, setShowName] = useState(() => {
    const saved = localStorage.getItem('print_showName');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showPrice, setShowPrice] = useState(() => {
    const saved = localStorage.getItem('print_showPrice');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showSKU, setShowSKU] = useState(() => {
    const saved = localStorage.getItem('print_showSKU');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Auto-generation State
  const [missingBarcodes, setMissingBarcodes] = useState([]);
  const [showMissingAlert, setShowMissingAlert] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Bills State
  const [recentBills, setRecentBills] = useState([]);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [billsError, setBillsError] = useState(null);
  const [expandedBills, setExpandedBills] = useState(new Set());

  useEffect(() => {
    if (open) {
      setSelectedItems(initialProducts.map(p => ({ ...p, printQty: 1 })));
      setSearchTerm('');
      setMissingBarcodes([]);
      setShowMissingAlert(false);
      setActiveTab('products');
    }
  }, [open, initialProducts]);

  useEffect(() => {
    localStorage.setItem('print_showName', JSON.stringify(showName));
    localStorage.setItem('print_showPrice', JSON.stringify(showPrice));
    localStorage.setItem('print_showSKU', JSON.stringify(showSKU));
  }, [showName, showPrice, showSKU]);

  const fetchRecentBills = async () => {
    if (!posUserId) return;
    setIsLoadingBills(true);
    setBillsError(null);
    try {
        const { data, error } = await supabase
            .from('purchase_bills')
            .select(`
                id, bill_no, bill_date, total_amount, created_at,
                suppliers(name),
                purchase_bill_items(
                    id, product_id, quantity, rate,
                    point_of_sale_products(id, name, sku, barcode, selling_price)
                )
            `)
            .eq('user_id', posUserId)
            .order('bill_date', { ascending: false })
            .limit(20);
            
        if (error) throw error;
        setRecentBills(data || []);
    } catch (err) {
        console.error("Error fetching bills:", err);
        setBillsError(err.message || 'Failed to load recent bills.');
    } finally {
        setIsLoadingBills(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === 'bills' && recentBills.length === 0 && !isLoadingBills && !billsError) {
        fetchRecentBills();
    }
  }, [open, activeTab]);

  const handleAddProduct = (product) => {
    if (selectedItems.find(item => item.id === product.id)) return;
    setSelectedItems([...selectedItems, { ...product, printQty: 1 }]);
    setSearchTerm('');
  };

  const handleRemoveProduct = (id) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const handleQuantityChange = (id, val) => {
    const qty = parseInt(val, 10);
    setSelectedItems(selectedItems.map(item => 
      item.id === id ? { ...item, printQty: isNaN(qty) ? '' : Math.max(1, Math.min(999, qty)) } : item
    ));
  };

  const toggleBill = (id) => {
      setExpandedBills(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleBillItemToggle = (billItem, isChecked) => {
      const product = billItem.point_of_sale_products;
      if (!product) return;
      
      if (isChecked) {
          if (!selectedItems.find(i => i.id === product.id)) {
              setSelectedItems([...selectedItems, { ...product, printQty: billItem.quantity }]);
          }
      } else {
          handleRemoveProduct(product.id);
      }
  };

  const handleBillItemQtyChange = (billItem, val) => {
      const product = billItem.point_of_sale_products;
      if (!product) return;
      
      const qty = parseInt(val, 10);
      const validQty = isNaN(qty) ? '' : Math.max(1, Math.min(999, qty));

      if (selectedItems.find(i => i.id === product.id)) {
          handleQuantityChange(product.id, validQty);
      } else {
          // If typed a quantity but wasn't selected, auto-select it
          if (validQty > 0) {
              setSelectedItems([...selectedItems, { ...product, printQty: validQty }]);
          }
      }
  };

  const currentSize = useMemo(() => {
    if (sizePresetId === 'custom') {
      return { width: Number(customWidth) || 50, height: Number(customHeight) || 30 };
    }
    const preset = LABEL_SIZES.find(s => s.id === sizePresetId);
    return { width: preset?.width || 100, height: preset?.height || 150 };
  }, [sizePresetId, customWidth, customHeight]);

  const previewScale = useMemo(() => {
    const { width } = currentSize;
    if (width >= 80) return { name: '14pt', sku: '10pt', price: '16pt', bcHeight: 50, bcWidth: 2 };
    if (width >= 50) return { name: '10pt', sku: '8pt', price: '12pt', bcHeight: 30, bcWidth: 1.5 };
    if (width >= 35) return { name: '8pt', sku: '6pt', price: '10pt', bcHeight: 20, bcWidth: 1.2 };
    return { name: '7pt', sku: '5pt', price: '9pt', bcHeight: 15, bcWidth: 1 };
  }, [currentSize]);

  const handleInitiatePrint = () => {
    if (selectedItems.length === 0) {
      return toast({ title: "No products selected", description: "Please select at least one product.", variant: "destructive" });
    }

    const invalidQty = selectedItems.some(item => !item.printQty || item.printQty < 1);
    if (invalidQty) {
      return toast({ title: "Invalid Quantity", description: "Please ensure all quantities are at least 1.", variant: "destructive" });
    }

    if (sizePresetId === 'custom') {
        if (!customWidth || customWidth < 20 || customWidth > 200 || !customHeight || customHeight < 20 || customHeight > 200) {
            return toast({ title: "Invalid Dimensions", description: "Custom dimensions must be between 20mm and 200mm.", variant: "destructive" });
        }
    }

    // Check for missing barcodes
    const missing = selectedItems.filter(p => !p.barcode || p.barcode.trim() === '');
    if (missing.length > 0) {
        setMissingBarcodes(missing);
        setShowMissingAlert(true);
    } else {
        proceedToPrint(selectedItems);
    }
  };

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
        let updatedList = [...selectedItems];
        
        for (let item of missingBarcodes) {
            let isUnique = false;
            let attempts = 0;
            let newBarcode = '';
            
            while (!isUnique && attempts < 5) {
                // Generate 12 digit random numeric string (EAN/Code128 compatible)
                newBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString(); 
                
                // Explicit uniqueness check against all POS products
                const { data: existing } = await supabase
                    .from('point_of_sale_products')
                    .select('id')
                    .eq('barcode', newBarcode)
                    .maybeSingle(); 
                
                if (!existing) {
                    isUnique = true;
                    const { error } = await supabase
                        .from('point_of_sale_products')
                        .update({ 
                            barcode: newBarcode, 
                            updated_at: new Date().toISOString() 
                        })
                        .eq('id', item.id);
                        
                    if (error) throw error;
                    
                    // Update local state
                    const idx = updatedList.findIndex(i => i.id === item.id);
                    if (idx >= 0) {
                        updatedList[idx].barcode = newBarcode;
                        updatedList[idx].isAutoGenerated = true;
                    }
                } else {
                    attempts++;
                }
            }
            
            if (!isUnique) {
                throw new Error(`Failed to generate a unique barcode for ${item.name} after 5 attempts.`);
            }
        }
        
        setSelectedItems(updatedList);
        toast({ title: "Success", description: "Missing barcodes automatically generated and saved." });
        setShowMissingAlert(false);
        proceedToPrint(updatedList);
        
    } catch (err) {
        console.error("Barcode generation error:", err);
        toast({ title: "Generation Failed", description: err.message || "Failed to generate some barcodes. Please try again.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  const proceedToPrint = (finalItems) => {
    let sizePreset = LABEL_SIZES.find(s => s.id === sizePresetId);
    if (sizePresetId === 'custom') {
        sizePreset = { id: 'custom', label: `Custom (${customWidth}x${customHeight}mm)`, width: Number(customWidth), height: Number(customHeight) };
    }
    
    onOpenChange(false);
    navigate('/print-labels', { 
      state: { 
        items: finalItems, 
        sizePreset, 
        symbology,
        toggles: { showName, showPrice, showSKU }
      } 
    });
  };

  const filteredOptions = allProducts.filter(p => 
    !selectedItems.find(s => s.id === p.id) && 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())))
  ).slice(0, 15);

  const previewItem = selectedItems.length > 0 ? selectedItems[0] : {
      name: 'Sample Product Name',
      sku: 'SKU-123456',
      selling_price: 999.00,
      barcode: '123456789012'
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 bg-white">
          <DialogTitle className="flex items-center gap-2 text-xl"><BarcodeIcon className="w-5 h-5 text-indigo-600" /> Print Barcode Labels</DialogTitle>
          <DialogDescription>Select products from your inventory or recent bills to print thermal labels.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x border-slate-100">
            
            {/* Left Column: Selection and Settings */}
            <div className="flex-1 flex flex-col p-5 gap-5 overflow-y-auto custom-scrollbar">
                
                {/* Product Source Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mb-2 bg-slate-100/80 p-1 rounded-lg">
                        <TabsTrigger value="products" className="data-[state=active]:shadow-sm rounded-md">Search Products</TabsTrigger>
                        <TabsTrigger value="bills" className="data-[state=active]:shadow-sm rounded-md">Recent Bills</TabsTrigger>
                    </TabsList>
                    
                    {/* Tab Content: Search Products */}
                    <TabsContent value="products" className="mt-2 outline-none">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Search by name, SKU, or barcode..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-lg shadow-sm"
                            />
                            
                            {searchTerm && (
                                <div className="absolute z-20 top-full mt-1 left-0 w-full bg-white rounded-lg border border-slate-200 shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                    {filteredOptions.length > 0 ? filteredOptions.map(p => (
                                        <div key={p.id} onClick={() => handleAddProduct(p)} className="p-3 hover:bg-indigo-50/50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 transition-colors">
                                            <div>
                                                <div className="font-medium text-sm text-slate-800">{p.name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">SKU: {p.sku || 'N/A'} • {p.barcode || 'Missing Barcode'}</div>
                                            </div>
                                            <div className="font-medium text-sm text-slate-700">{formatPrice(p.selling_price)}</div>
                                        </div>
                                    )) : (
                                        <div className="p-4 text-center text-sm text-slate-500">No matching products found.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Tab Content: Recent Bills */}
                    <TabsContent value="bills" className="mt-2 outline-none">
                        <div className="h-[200px] border border-slate-200 rounded-lg overflow-y-auto bg-slate-50/30 custom-scrollbar p-2 relative">
                            {isLoadingBills ? (
                                <div className="space-y-2 p-2">
                                    <Skeleton className="h-16 w-full rounded-md" />
                                    <Skeleton className="h-16 w-full rounded-md" />
                                    <Skeleton className="h-16 w-full rounded-md" />
                                </div>
                            ) : billsError ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-white/50 backdrop-blur-sm">
                                    <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                                    <p className="text-sm text-slate-600 mb-4">{billsError}</p>
                                    <Button variant="outline" size="sm" onClick={fetchRecentBills}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
                                </div>
                            ) : recentBills.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-slate-500">
                                    <p className="text-sm">No recent purchase bills found.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentBills.map(bill => {
                                        const isExpanded = expandedBills.has(bill.id);
                                        return (
                                            <div key={bill.id} className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden transition-all duration-200">
                                                <div 
                                                    className="p-3 bg-white hover:bg-slate-50 flex justify-between items-center cursor-pointer transition-colors"
                                                    onClick={() => toggleBill(bill.id)}
                                                >
                                                    <div>
                                                        <div className="font-semibold text-sm text-slate-800">Bill #{bill.bill_no}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">{formatDate(bill.bill_date || bill.created_at)} • {bill.suppliers?.name || 'Unknown Supplier'}</div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right hidden sm:block">
                                                            <div className="font-medium text-sm text-slate-700">{formatPrice(bill.total_amount)}</div>
                                                            <div className="text-xs text-slate-500">{bill.purchase_bill_items?.length || 0} items</div>
                                                        </div>
                                                        <div className="bg-slate-100 p-1.5 rounded-md text-slate-500">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Expandable Line Items */}
                                                {isExpanded && (
                                                    <div className="border-t border-slate-100 bg-slate-50/50 p-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                                        {bill.purchase_bill_items?.length > 0 ? bill.purchase_bill_items.map(bi => {
                                                            const prod = bi.point_of_sale_products;
                                                            if (!prod) return null;
                                                            
                                                            const isSelected = !!selectedItems.find(i => i.id === prod.id);
                                                            const currentQty = selectedItems.find(i => i.id === prod.id)?.printQty || bi.quantity;
                                                            
                                                            return (
                                                                <div key={bi.id} className="p-2.5 bg-white border border-slate-100 rounded-md flex items-center justify-between gap-3 hover:shadow-sm transition-shadow">
                                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                        <Checkbox 
                                                                            checked={isSelected} 
                                                                            onCheckedChange={(c) => handleBillItemToggle(bi, c)} 
                                                                            className="mt-1 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" 
                                                                        />
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="font-medium text-sm truncate text-slate-800">{prod.name}</div>
                                                                            <div className="text-xs text-slate-500 truncate mt-0.5">
                                                                                SKU: {prod.sku || 'N/A'} • 
                                                                                <span className={!prod.barcode ? "text-amber-600 ml-1 font-medium" : "ml-1"}>
                                                                                    {prod.barcode || 'Missing Barcode'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="text-xs font-medium text-slate-600 hidden sm:block">{formatPrice(prod.selling_price)}</div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <label className="text-xs text-slate-500">Qty:</label>
                                                                            <Input 
                                                                                type="number" 
                                                                                min="1" max="999"
                                                                                value={currentQty}
                                                                                onChange={(e) => handleBillItemQtyChange(bi, e.target.value)}
                                                                                className="w-14 h-8 text-center text-sm p-1 border-slate-200"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }) : (
                                                            <div className="text-xs text-center text-slate-500 py-4">No items in this bill.</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Selected Items List */}
                <div className="flex flex-col flex-1 min-h-[160px]">
                    <label className="text-sm font-semibold flex justify-between items-center mb-2">
                        <span className="text-slate-800">Selected for Printing</span>
                        {selectedItems.length > 0 && (
                            <span className="text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                                {selectedItems.length} Product{selectedItems.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </label>
                    <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 flex flex-col shadow-sm">
                        {selectedItems.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm flex-col gap-3 p-6 opacity-80">
                                <BarcodeIcon className="w-10 h-10 opacity-20" />
                                <span>No products selected</span>
                            </div>
                        ) : (
                            <ScrollArea className="flex-1 h-[140px] bg-white">
                                <div className="divide-y divide-slate-100">
                                    {selectedItems.map((item) => (
                                        <div key={item.id} className="p-3 bg-white flex items-center justify-between gap-4 group hover:bg-slate-50/50 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate text-slate-800">{item.name}</div>
                                                <div className="text-xs text-slate-500 truncate mt-0.5">
                                                    SKU: {item.sku || 'N/A'} • 
                                                    <span className={!item.barcode ? "text-amber-600 font-medium ml-1" : "ml-1"}>
                                                        {item.barcode ? `Barcode: ${item.barcode}` : '⚠️ Missing Barcode'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-slate-500 font-medium">Qty:</label>
                                                    <Input 
                                                        type="number" 
                                                        min="1" 
                                                        max="999" 
                                                        value={item.printQty} 
                                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                        className="w-16 h-8 text-center text-sm font-medium border-slate-200 focus-visible:ring-indigo-500"
                                                    />
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleRemoveProduct(item.id)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>

                {/* Configuration Options */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-sm">
                    <label className="text-sm font-semibold flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
                        <Settings2 className="w-4 h-4 text-indigo-600" /> Label Settings
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Label Size</label>
                            <Select value={sizePresetId} onValueChange={setSizePresetId}>
                                <SelectTrigger className="bg-white border-slate-200 focus:ring-indigo-500 shadow-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {LABEL_SIZES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Barcode Format</label>
                            <Select value={symbology} onValueChange={setSymbology}>
                                <SelectTrigger className="bg-white border-slate-200 focus:ring-indigo-500 shadow-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CODE128">Code 128 (Universal)</SelectItem>
                                    <SelectItem value="EAN13">EAN-13 (Numeric 12-13 digits)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {sizePresetId === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Width (mm)</label>
                                <Input type="number" min="20" max="200" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} className="bg-white h-9 border-slate-200 shadow-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Height (mm)</label>
                                <Input type="number" min="20" max="200" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} className="bg-white h-9 border-slate-200 shadow-sm" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">Print Elements (Real-time Preview)</label>
                        <div className="flex flex-wrap gap-x-6 gap-y-3 p-3 bg-slate-50 rounded-md border border-slate-200 shadow-inner">
                            <div className="flex items-center space-x-2.5">
                                <Switch id="toggle-name" checked={showName} onCheckedChange={setShowName} className="data-[state=checked]:bg-indigo-600" />
                                <Label htmlFor="toggle-name" className="cursor-pointer text-sm font-medium text-slate-700">Product Name</Label>
                            </div>
                            <div className="flex items-center space-x-2.5">
                                <Switch id="toggle-price" checked={showPrice} onCheckedChange={setShowPrice} className="data-[state=checked]:bg-indigo-600" />
                                <Label htmlFor="toggle-price" className="cursor-pointer text-sm font-medium text-slate-700">Price</Label>
                            </div>
                            <div className="flex items-center space-x-2.5">
                                <Switch id="toggle-sku" checked={showSKU} onCheckedChange={setShowSKU} className="data-[state=checked]:bg-indigo-600" />
                                <Label htmlFor="toggle-sku" className="cursor-pointer text-sm font-medium text-slate-700">SKU</Label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Live Preview */}
            <div className="lg:w-[360px] bg-slate-50/80 flex flex-col p-6 border-t lg:border-t-0 border-slate-100">
                <label className="text-sm font-semibold flex items-center gap-2 mb-4 text-slate-800">
                    <Eye className="w-4 h-4 text-indigo-600" /> Live Preview
                </label>
                
                <div className="flex-1 flex items-center justify-center bg-slate-200/60 rounded-xl border border-slate-200 p-6 relative overflow-hidden shadow-inner">
                    <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    
                    <div 
                        className="bg-white flex flex-col justify-center items-center overflow-hidden box-border shadow-md transition-all duration-300 relative z-10 rounded-[2px]"
                        style={{
                            width: `${currentSize.width}mm`,
                            height: `${currentSize.height}mm`,
                            maxWidth: '100%',
                            maxHeight: '100%'
                        }}
                    >
                        <div className="text-center w-full px-2 flex flex-col items-center justify-center h-full">
                            {showName && (
                                <div className="font-bold text-black leading-tight w-full" style={{ fontSize: previewScale.name, maxHeight: '2.4em', overflow: 'hidden' }}>
                                    {previewItem.name}
                                </div>
                            )}
                            
                            {showSKU && previewItem.sku && (
                                <div className="text-black leading-tight mt-0.5" style={{ fontSize: previewScale.sku }}>SKU: {previewItem.sku}</div>
                            )}
                            
                            {showPrice && (
                                <div className="font-bold text-black leading-tight my-1" style={{ fontSize: previewScale.price }}>
                                    {formatPrice(previewItem.selling_price)}
                                </div>
                            )}
                            
                            <div className="flex justify-center w-full mt-1">
                                <BarcodeSVG 
                                    value={previewItem.barcode || '123456789012'} 
                                    format={symbology} 
                                    height={previewScale.bcHeight} 
                                    width={previewScale.bcWidth}
                                    displayValue={true} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 text-center text-xs text-slate-500 bg-white py-2 rounded-md border border-slate-100 shadow-sm">
                    Showing first selected product.<br/>Actual print size: <span className="font-medium text-slate-700">{currentSize.width}mm x {currentSize.height}mm</span>
                </div>
            </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 sm:justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
          <div className="text-sm font-medium text-slate-600 mb-4 sm:mb-0 hidden sm:block">
              Total Labels to Print: <span className="text-indigo-600 text-base font-bold bg-indigo-50 px-2 py-0.5 rounded">{selectedItems.reduce((acc, item) => acc + (parseInt(item.printQty)||0), 0)}</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
              <DialogClose asChild><Button variant="outline" className="flex-1 sm:flex-none border-slate-300">Cancel</Button></DialogClose>
              <Button onClick={handleInitiatePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-none shadow-md hover:shadow-lg transition-all" disabled={selectedItems.length === 0}>
                <Printer className="w-4 h-4 mr-2" /> Preview & Print
              </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Missing Barcodes Alert Dialog */}
    <AlertDialog open={showMissingAlert} onOpenChange={setShowMissingAlert}>
        <AlertDialogContent className="max-w-md bg-white">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-amber-600 text-xl">
                    <AlertTriangle className="w-6 h-6" /> Missing Barcodes Detected
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3 pt-2 text-slate-600">
                    <p><strong>{missingBarcodes.length}</strong> selected product(s) do not have a barcode assigned.</p>
                    <p>The system must automatically generate unique, scannable barcodes and save them to your database before printing.</p>
                    <div className="max-h-[120px] overflow-y-auto mt-2 bg-slate-50 p-3 rounded-md text-xs border border-slate-200 space-y-1 custom-scrollbar">
                        {missingBarcodes.map(mb => (
                            <div key={mb.id} className="truncate font-medium text-slate-700">• {mb.name} <span className="font-normal text-slate-400">(SKU: {mb.sku || 'N/A'})</span></div>
                        ))}
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 border-t border-slate-100 pt-4">
                <AlertDialogCancel disabled={isGenerating} className="border-slate-300">Cancel Print</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); handleAutoGenerate(); }} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating & Saving...</> : 'Auto-Generate & Continue'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}