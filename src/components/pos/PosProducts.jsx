import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Plus, Upload, FileDown, Loader2, Search, Edit, Trash2, Archive, Copy, RefreshCw, ArrowLeftRight, Barcode, ArrowUpDown, ArrowUp, ArrowDown, Tag, Percent, X, Eye, EyeOff, Image as ImageIcon, ImageOff, ShoppingCart, Camera, MoreVertical, SlidersHorizontal, ChevronUp, ChevronDown, Scissors, Printer, FolderOpen, Package, Coins, LineChart, Target, Calculator, AlertCircle, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from "date-fns";
import { cn, formatPrice } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import StockUpdateDialog from "./StockUpdateDialog";
import { usePosData } from "@/contexts/PosDataContext";
import BarcodeScanner from './BarcodeScanner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InlineProductForm from "./InlineProductForm";
import QuickAddPosProductModal from "./QuickAddPosProductModal";
import BarcodeLabelPrintModal from "./BarcodeLabelPrintModal";
import LowStockProductsBubble from "./LowStockProductsBubble";
import ProductCategoryManagement from "./category/ProductCategoryManagement";
import BulkActionToolbar from "./BulkActionToolbar";
import BulkCategoryUpdateDialog from "./BulkCategoryUpdateDialog";
import BulkHSNCodeDialog from "./BulkHSNCodeDialog";

/* --------------------------
   Small helper components
   --------------------------*/
const Loader = ({ label = "Loading…" }) => (
  <div className="p-8 flex flex-col items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <div className="mt-2 text-sm text-slate-500">{label}</div>
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("PosProducts ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-600 font-semibold mb-4">Something went wrong.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const QuantityPickerDialog = ({ open, onOpenChange, product, onConfirm }) => {
  const [qty, setQty] = useState('1');
  useEffect(() => { if (open) setQty('1'); }, [open]);
  const handleSubmit = (e) => { e.preventDefault(); const val = parseFloat(qty); if (val > 0) { onConfirm(val); onOpenChange(false); } };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader><DialogTitle>Enter Quantity</DialogTitle><DialogDescription>{product?.name} ({formatPrice(product?.selling_price)})</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4 justify-center"><Input type="number" step="0.001" min="0.001" value={qty} onChange={e => setQty(e.target.value)} autoFocus onFocus={(e) => e.target.select()} className="text-center text-lg w-24 h-12" /><div className="text-sm font-medium">{product?.unit || 'Units'}</div></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Add to Cart</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const BulkDiscountDialog = ({ open, onOpenChange, mode, selectedCount, categories, onConfirm, isApplying }) => {
  const [config, setConfig] = useState({ type: 'percentage', value: '', isActive: true, selectedCategory: '' });
  useEffect(() => { if(open) setConfig({ type: 'percentage', value: '', isActive: true, selectedCategory: '' }); }, [open]);
  const handleSubmit = () => { onConfirm({ ...config, value: parseFloat(config.value) || 0 }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === 'category' ? 'Apply Category Discount' : `Apply Bulk Discount (${selectedCount} items)`}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
           {mode === 'category' && (<div className="space-y-2"><label className="text-sm font-medium">Select Category</label><Select value={config.selectedCategory} onValueChange={(v) => setConfig(s => ({...s, selectedCategory: v}))}><SelectTrigger><SelectValue placeholder="Choose category..." /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>)}
           <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-medium">Discount Type</label><Select value={config.type} onValueChange={(v) => setConfig(s => ({...s, type: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount (₹)</SelectItem></SelectContent></Select></div><div className="space-y-2"><label className="text-sm font-medium">Value</label><Input type="number" value={config.value} onChange={(e) => setConfig(s => ({...s, value: e.target.value}))} placeholder={config.type === 'percentage' ? 'e.g. 10' : 'e.g. 100'} /></div></div>
           <div className="flex items-center space-x-2"><Checkbox id="isActive" checked={config.isActive} onCheckedChange={(c) => setConfig(s => ({...s, isActive: c}))} /><label htmlFor="isActive" className="text-sm font-medium">Activate Offer Immediately</label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={isApplying || (mode === 'category' && !config.selectedCategory)}>{isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Discount'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ExcelUploadDialog = ({ open, onOpenChange }) => <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogTitle>Import</DialogTitle><p>Use Template to import products.</p></DialogContent></Dialog>;
const BulkImageUploadDialog = ({ open, onOpenChange }) => <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogTitle>Bulk Images</DialogTitle><p>Upload Excel with Image URLs.</p></DialogContent></Dialog>;

export const detectFieldNames = (sampleProduct) => {
  if (!sampleProduct) return { stock: 'stock_level', cost: 'cost_price', sale: 'selling_price' };
  
  return {
    stock: 'stock_level' in sampleProduct ? 'stock_level' : ('stock' in sampleProduct ? 'stock' : 'stock_level'),
    cost: 'cost_price' in sampleProduct ? 'cost_price' : ('cost' in sampleProduct ? 'cost' : 'cost_price'),
    sale: 'selling_price' in sampleProduct ? 'selling_price' : ('price' in sampleProduct ? 'price' : 'selling_price')
  };
};

const PosProducts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { hasPermission } = usePosData();
  const { maxProducts, currentProducts, canAddProduct, refreshLimits } = usePlanLimits();
  const posUserId = user?.posOwnerId || user?.id;

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [existingSkus, setExistingSkus] = useState([]);
  const [existingBarcodes, setExistingBarcodes] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBulkImageOpen, setIsBulkImageOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [discountMode, setDiscountMode] = useState('selection'); 
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quantityDialog, setQuantityDialog] = useState({ open: false, product: null });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [copyingId, setCopyingId] = useState(null);
  const [isSearchScannerOpen, setIsSearchScannerOpen] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({ isOpen: false, title: '', description: '', onConfirm: () => {} });
  const [isCategoryManagementOpen, setIsCategoryManagementOpen] = useState(false);
  
  // Bulk Actions State
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [bulkHSNDialogOpen, setBulkHSNDialogOpen] = useState(false);
  const [isApplyingHSN, setIsApplyingHSN] = useState(false);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState(new Set());

  // State for loading spinners on individual product visibility toggles
  const [togglingVisibility, setTogglingVisibility] = useState({});
  const [isArchiving, setIsArchiving] = useState({});

  const showConfirmation = (title, description, onConfirm) => { setConfirmationDialog({ isOpen: true, title, description, onConfirm }); };

  const fetchProducts = useCallback(async () => {
    if (!posUserId) return;
    setIsLoading(true);
    try {
      refreshLimits();
      let from = 0;
      const limit = 1000;
      let all = [];
      let hasMore = true;
      while (hasMore) {
        const { data, error, count } = await supabase.from("point_of_sale_products").select("*", { count: "exact" }).eq("user_id", posUserId).order("name").range(from, from + limit - 1);
        if (error) throw error;
        if (data?.length) all = [...data, ...all]; 
        from += limit;
        if (!data || data.length < limit || (count && all.length >= count)) hasMore = false;
      }
      setProducts(all);
      setExistingSkus(all.map(p => p.sku).filter(Boolean));
      setExistingBarcodes(all.map(p => p.barcode).filter(Boolean));
    } catch (err) {
      console.error(err);
      toast({ title: "Error loading products", description: err.message || String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [posUserId, toast, refreshLimits]); 

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), [products]);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return products.filter(p => {
         if (activeTab === 'archived') return p.archived;
         if (p.archived) return false; 
         if (activeTab === 'online') return p.is_visible_online;
         if (p.is_service) {
             if (activeTab === 'low_stock' || activeTab === 'expired') return false;
             if (activeTab === 'services') return true;
         } else {
             if (activeTab === 'services') return false; 
             if (activeTab === 'low_stock') return p.stock_level <= (p.low_stock_threshold || 0);
             if (activeTab === 'expired') {
                 if (!p.expiry_date) return false;
                 const today = new Date(); today.setHours(0,0,0,0);
                 const exp = new Date(p.expiry_date);
                 return differenceInDays(exp, today) <= 30;
             }
         }
         return true;
      }).filter(p => {
        if (!t) return true;
        return (p.name?.toLowerCase().includes(t) || String(p.sku || "").toLowerCase().includes(t) || String(p.barcode || "").toLowerCase().includes(t) || String(p.category || "").toLowerCase().includes(t));
      });
  }, [products, query, activeTab]);

  const handleSort = (key) => { setSortConfig((current) => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' })); };

  const sortedFilteredProducts = useMemo(() => {
    const sorted = [...filtered];
    if (!sortConfig.key) return sorted;
    sorted.sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'tax_amount') {
        aValue = ((a.selling_price || 0) * (a.tax_rate || 0)) / 100;
        bValue = ((b.selling_price || 0) * (b.tax_rate || 0)) / 100;
      } else {
        aValue = a[sortConfig.key] ?? '';
        bValue = b[sortConfig.key] ?? '';
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        if (typeof aValue !== typeof bValue) { aValue = String(aValue); bValue = String(bValue); }
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filtered, sortConfig]);

  const fieldMapping = useMemo(() => detectFieldNames(products[0]), [products]);

  const totalPages = Math.max(1, Math.ceil(sortedFilteredProducts.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageItems = useMemo(() => sortedFilteredProducts.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE), [sortedFilteredProducts, page]);
  const SortIcon = ({ columnKey }) => { if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-slate-300" />; return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-3 w-3 text-primary" /> : <ArrowDown className="ml-2 h-3 w-3 text-primary" />; };

  const toggleSelect = (id) => { setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const toggleSelectPage = () => { setSelectedIds(prev => { const next = new Set(prev); const allOnPage = pageItems.map(p => p.id); const allSelected = allOnPage.every(id => next.has(id)); if (allSelected) allOnPage.forEach(id => next.delete(id)); else allOnPage.forEach(id => next.add(id)); return next; }); };

  const handleClearSelection = () => { setSelectedIds(new Set()); };
  
  const handleOpenBulkCategoryDialog = () => {
      setBulkCategoryDialogOpen(true);
  };

  const handleBulkCategoryUpdate = async (categoryId) => {
    toast({
      title: "Updating categories...",
      description: "Please wait.",
    });

    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('point_of_sale_products')
        .update({ category: categoryId })
        .in('id', ids);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated category for ${ids.length} products.`,
        variant: "default",
      });
      
      handleClearSelection();
      setBulkCategoryDialogOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Failed to update categories",
        variant: "destructive"
      });
    }
  };

  const handleBulkHSNUpdate = async ({ hsnCode, gstRate }) => {
    setIsApplyingHSN(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('point_of_sale_products')
        .update({ 
          hsn_code: hsnCode,
          tax_rate: gstRate 
        })
        .in('id', ids);

      if (error) throw error;

      toast({
        title: "Success",
        description: `HSN code and GST % updated for ${ids.length} products.`,
        variant: "default",
      });
      
      // Provide visual feedback for updated rows
      setRecentlyUpdatedIds(new Set(ids));
      setTimeout(() => setRecentlyUpdatedIds(new Set()), 3000);
      
      handleClearSelection();
      setBulkHSNDialogOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Failed to update HSN codes and GST",
        variant: "destructive"
      });
    } finally {
      setIsApplyingHSN(false);
    }
  };

  const openCreate = () => { setEditingProduct(null); setIsFormOpen(true); };
  const openEdit = (p) => { setEditingProduct(p); setIsFormOpen(true); };
  const openCopy = (p) => { const { id, created_at, updated_at, ...rest } = p; setEditingProduct({ ...rest, name: `${p.name} (Copy)` }); setIsFormOpen(true); };
  const handleDelete = (id) => { showConfirmation("Delete product?", "This cannot be undone.", async () => { const { error } = await supabase.from("point_of_sale_products").delete().eq("id", id); if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" }); else { toast({ title: "Deleted" }); fetchProducts(); } }); };
  
  const handleBulkVisibility = (visible = true) => { toast({ title: "🚧 Feature in progress" }) };
  const handleBulkArchive = (archive = true) => { toast({ title: "🚧 Feature in progress" }) };
  const handleBulkDelete = () => { toast({ title: "🚧 Feature in progress" }) };
  const handleOpenBulkDiscount = () => { setDiscountMode('selection'); setIsDiscountDialogOpen(true); };
  const handleOpenCategoryDiscount = () => { setDiscountMode('category'); setIsDiscountDialogOpen(true); };
  const handleConfirmDiscount = async ({ type, value, isActive, selectedCategory }) => { toast({ title: "🚧 Feature in progress" }) };
  const handleDuplicate = async (p) => { toast({ title: "🚧 Feature in progress" }) };
  const onFormSuccess = () => { fetchProducts(); };
  const getExpiryStatus = (dateStr) => { return null; };
  
  const handleVisibilityToggle = async (id, currentVisibility) => {
    setTogglingVisibility(prev => ({ ...prev, [id]: true }));
    const newVisibility = !currentVisibility;

    try {
      const { error } = await supabase
        .from('point_of_sale_products')
        .update({ is_visible_online: newVisibility })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Optimistically update local state
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === id ? { ...p, is_visible_online: newVisibility } : p
        )
      );

      toast({
        title: "Visibility Updated",
        description: `Product is now ${newVisibility ? 'visible' : 'hidden'} on your online store.`,
        className: "bg-green-50 border-green-200"
      });
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update product visibility.",
        variant: "destructive"
      });
    } finally {
      setTogglingVisibility(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleArchive = async (id, archive = true) => {
    setIsArchiving(prev => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase
        .from('point_of_sale_products')
        .update({ archived: archive })
        .eq('id', id);

      if (error) throw error;

      // Optimistically update local state
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === id ? { ...p, archived: archive } : p
        )
      );

      toast({
        title: archive ? "Product Archived" : "Product Restored",
        description: `Product has been ${archive ? 'archived' : 'restored'} successfully.`,
        className: "bg-green-50 border-green-200"
      });
    } catch (error) {
      console.error("Error toggling archive status:", error);
      toast({
        title: "Archive Failed",
        description: error.message || "Failed to update product status.",
        variant: "destructive"
      });
    } finally {
      setIsArchiving(prev => ({ ...prev, [id]: false }));
    }
  };

  const exportExcel = () => { toast({ title: "🚧 Export in progress" }) };
  const confirmQuantity = (qty) => { if (quantityDialog.product) { addToCart(quantityDialog.product, qty); toast({ title: "Added to cart", description: `${quantityDialog.product.name} (${qty}) added.` }); } };

  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedIds.has(p.id));
  }, [products, selectedIds]);

  // Aggregate stats for summary cards
  const stats = useMemo(() => {
    const totalStock = filtered.reduce((acc, p) => acc + (p.is_service ? 0 : (p.stock_level || 0)), 0);
    const totalCost = filtered.reduce((acc, p) => acc + (p.is_service ? 0 : ((p.cost_price || 0) * (p.stock_level || 0))), 0);
    const totalValue = filtered.reduce((acc, p) => acc + (p.is_service ? 0 : ((p.selling_price || 0) * (p.stock_level || 0))), 0);
    const totalEstProfit = totalValue - totalCost;
    const avgMargin = totalValue > 0 ? (totalEstProfit / totalValue) * 100 : 0;
    
    // Tax summary: total potential tax on current stock
    const totalTaxValue = filtered.reduce((acc, p) => {
        if (p.is_service) return acc;
        const taxRate = p.tax_rate || 0;
        const itemTax = ((p.selling_price || 0) * taxRate) / 100;
        return acc + (itemTax * (p.stock_level || 0));
    }, 0);

    return { totalStock, totalCost, totalValue, totalEstProfit, avgMargin, totalTaxValue };
  }, [filtered]);

  const lowStockCount = useMemo(() => products.filter(p => !p.is_service && p.stock_level <= (p.low_stock_threshold || 0)).length, [products]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24 relative min-h-screen bg-slate-50 text-slate-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full sm:w-auto">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Products</h1>
            
            <div 
                onClick={() => { setActiveTab('low_stock'); setPage(1); }}
                className="group flex items-center justify-between bg-red-500 rounded-xl p-2 cursor-pointer hover:bg-red-600 transition-all duration-200 shadow-md w-full sm:w-auto sm:min-w-[260px]"
                role="button"
                tabIndex={0}
                title="View Low Stock Items"
            >
              <div className="flex items-center gap-3 pl-1">
                <div className="bg-red-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-red-400/50 group-hover:scale-105 transition-transform duration-300">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-sm tracking-wide">LOW STOCK</span>
              </div>
              <div className="flex items-center bg-white px-3 py-1.5 rounded-lg shadow-sm">
                <span className="font-extrabold text-red-600 text-sm">
                  {lowStockCount} <span className="text-xs font-bold text-red-500/80 uppercase tracking-wider ml-0.5">items</span>
                </span>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsQuickAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold w-full sm:w-auto h-12 shrink-0">
              <Plus className="w-5 h-5" /> Quick Add Product
          </Button>
      </div>

      <div className="flex flex-col gap-3 mb-4 md:hidden">
         <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search products..." className="pl-10 pr-12 h-12 text-base shadow-sm border-slate-200 bg-white" />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer active:scale-95 transition-transform" 
                  onClick={() => setIsSearchScannerOpen(true)}
                  disabled={isSearchScannerOpen}
                  title="Scan Barcode"
                >
                  {isSearchScannerOpen ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Barcode className="h-5 w-5" />}
                </Button>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-12 w-12 shrink-0 border-slate-200 shadow-sm bg-white"><MoreVertical className="h-5 w-5 text-slate-600" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white text-slate-900 border-slate-200">
                    <DropdownMenuItem onSelect={() => setIsCategoryManagementOpen(true)}><FolderOpen className="mr-2 h-4 w-4" /> Manage Categories</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsPrintModalOpen(true)}><Printer className="mr-2 h-4 w-4" /> Print Labels</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsUploadOpen(true)}><Upload className="mr-2 h-4 w-4" /> Import Excel</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsBulkImageOpen(true)}><ImageIcon className="mr-2 h-4 w-4" /> Bulk Images</DropdownMenuItem>
                    <DropdownMenuItem onSelect={exportExcel}><FileDown className="mr-2 h-4 w-4" /> Export Excel</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleOpenCategoryDiscount}><Tag className="mr-2 h-4 w-4" /> Offers</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
         </div>
         <Button variant="outline" onClick={() => setShowMobileFilters(!showMobileFilters)} className="flex items-center justify-between w-full h-10 border-dashed border-slate-300 text-slate-600 bg-white hover:bg-slate-50"><span className="flex items-center"><SlidersHorizontal className="w-4 h-4 mr-2" /> Filters & Views</span>{showMobileFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button>
      </div>

      <div className="hidden md:flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap items-center justify-start w-full"> 
          <Button variant="outline" onClick={() => setIsPrintModalOpen(true)} className="flex-1 sm:flex-none border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
            <Printer className="mr-2 h-4 w-4" /> Print Labels
          </Button>
          <Button variant="outline" onClick={() => setIsUploadOpen(true)} className="flex-1 sm:flex-none border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={() => setIsBulkImageOpen(true)} title="Bulk Image Links" className="flex-1 sm:flex-none border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
            <ImageIcon className="mr-2 h-4 w-4" /> Images
          </Button>
          <Button onClick={exportExcel} variant="outline" className="flex-1 sm:flex-none border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
            <FileDown className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button onClick={handleOpenCategoryDiscount} variant="outline" className="border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 flex-1 sm:flex-none">
            <Tag className="mr-2 h-4 w-4" /> Offers
          </Button>
          <Button 
            onClick={() => setIsCategoryManagementOpen(true)} 
            variant="outline" 
            className="border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 flex-1 sm:flex-none"
            title="Organize products into categories"
          >
            <FolderOpen className="mr-2 h-4 w-4" /> Manage Categories
          </Button>
          <Button onClick={openCreate} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product / Service
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }} className={cn("w-full mb-4", showMobileFilters ? "block" : "hidden md:block")}>
         <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 mb-4 hide-scrollbar">
                 <TabsList className="w-auto inline-flex h-10 bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
                    <TabsTrigger value="all" className="flex-shrink-0 px-4 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md transition-all">All Items</TabsTrigger>
                    <TabsTrigger value="services" className="flex-shrink-0 px-4 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md transition-all">Services</TabsTrigger>
                    <TabsTrigger value="online" className="flex-shrink-0 px-4 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md transition-all">Online Store</TabsTrigger>
                    <TabsTrigger value="low_stock" className="flex-shrink-0 px-4 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md transition-all">Low Stock</TabsTrigger>
                    <TabsTrigger value="expired" className="flex-shrink-0 px-4 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md transition-all">Expiring</TabsTrigger>
                    <TabsTrigger value="archived" className="flex-shrink-0 px-4 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md transition-all">Archived</TabsTrigger>
                 </TabsList>
             </div>
         </div>
      </Tabs>
      
      <div className="relative w-full md:w-1/2 lg:w-1/3 mb-6 hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={isLoading ? "Loading..." : `Search ${products.length} products...`} className="pl-10 pr-10 w-full bg-white border-slate-200 shadow-sm" disabled={isLoading} />
        {isLoading ? (<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />) : (
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer active:scale-95 transition-transform" 
            onClick={() => setIsSearchScannerOpen(true)} 
            disabled={isSearchScannerOpen}
            title="Scan Barcode"
          >
            {isSearchScannerOpen ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Barcode className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Inline Stat Cards mimicking ProductSummaryCards with requested colors */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{filtered.length}</div>
                <div className="text-xs text-slate-500 font-medium">Products Count</div>
            </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                    <Archive className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{stats.totalStock}</div>
                <div className="text-xs text-slate-500 font-medium">Total Stock</div>
            </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                    <Coins className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-xl font-bold text-slate-900 truncate w-full">{formatPrice(stats.totalCost)}</div>
                <div className="text-xs text-slate-500 font-medium">Inventory Cost</div>
            </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <LineChart className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-slate-900 truncate w-full">{formatPrice(stats.totalValue)}</div>
                <div className="text-xs text-slate-500 font-medium">Sale Value</div>
            </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <Target className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-xl font-bold text-slate-900 truncate w-full">{formatPrice(stats.totalEstProfit)}</div>
                <div className="text-xs text-slate-500 font-medium">Est. Profit</div>
            </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                    <Calculator className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-xl font-bold text-slate-900 truncate w-full">{formatPrice(stats.totalTaxValue)}</div>
                <div className="text-xs text-slate-500 font-medium">Tax Summary</div>
            </CardContent>
        </Card>
      </div>

      <BulkActionToolbar 
        selectedCount={selectedIds.size}
        onChangeCategory={handleOpenBulkCategoryDialog}
        onSetHSN={() => setBulkHSNDialogOpen(true)}
        onClearSelection={handleClearSelection}
        onPrintLabels={() => setIsPrintModalOpen(true)}
        onBulkShow={() => handleBulkVisibility(true)}
        onBulkHide={() => handleBulkVisibility(false)}
        onBulkArchive={() => handleBulkArchive(true)}
        onBulkRestore={() => handleBulkArchive(false)}
        onBulkOffer={handleOpenBulkDiscount}
        onBulkDelete={handleBulkDelete}
        isArchiveView={activeTab === 'archived'}
      />

      <Card className="overflow-hidden border-0 shadow-none sm:border border-slate-200 sm:shadow-sm bg-transparent sm:bg-white rounded-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8"><Loader label="Loading products..." /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No items found</h3>
                <p className="text-sm text-slate-500">No products or services match your current filters.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto max-h-[600px] relative">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-sm border-b border-slate-200">
                    <TableRow className="hover:bg-slate-50">
                      <TableHead className="w-12"><Checkbox checked={pageItems.every((p) => selectedIds.has(p.id)) && pageItems.length > 0} onCheckedChange={toggleSelectPage} aria-label="select page" className="border-slate-300" /></TableHead>
                      <TableHead className="text-center w-16 font-semibold text-slate-700">Image</TableHead>
                      <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors font-semibold text-slate-700" onClick={() => handleSort('name')}><div className="flex items-center">Name <SortIcon columnKey="name" /></div></TableHead>
                      <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors font-semibold text-slate-700" onClick={() => handleSort('sku')}><div className="flex items-center">SKU <SortIcon columnKey="sku" /></div></TableHead>
                      <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors font-semibold text-slate-700" onClick={() => handleSort('category')}><div className="flex items-center">Category <SortIcon columnKey="category" /></div></TableHead>
                      <TableHead className="w-24 font-semibold text-slate-700">HSN</TableHead>
                      <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors font-semibold text-slate-700" onClick={() => handleSort('cost_price')}><div className="flex items-center">Cost <SortIcon columnKey="cost_price" /></div></TableHead>
                      <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors font-semibold text-slate-700" onClick={() => handleSort('selling_price')}><div className="flex items-center">Price <SortIcon columnKey="selling_price" /></div></TableHead>
                      <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors font-semibold text-slate-700" onClick={() => handleSort('tax_amount')}><div className="flex items-center">Tax <SortIcon columnKey="tax_amount" /></div></TableHead>
                      <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors font-semibold text-slate-700" onClick={() => handleSort('stock_level')}><div className="flex items-center">Stock <SortIcon columnKey="stock_level" /></div></TableHead>
                      <TableHead className="text-center w-24 font-semibold text-slate-700">Expiry</TableHead>
                      <TableHead className="text-center w-24 font-semibold text-slate-700">Online</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {pageItems.map(p => {
                      const expiryStatus = getExpiryStatus(p.expiry_date);
                      const taxValue = ((p.selling_price || 0) * (p.tax_rate || 0)) / 100;
                      const displayImage = p.image_url || (p.images && p.images.length > 0 ? p.images[0] : null);
                      const isSelected = selectedIds.has(p.id);
                      
                      return (
                      <TableRow key={p.id} className={cn("hover:bg-slate-50/80 transition-colors duration-200 border-b border-slate-100", p.archived && "bg-slate-50 text-slate-400", isSelected && "selected-row bg-blue-50/50 hover:bg-blue-50/80", recentlyUpdatedIds.has(p.id) && "bg-green-50 hover:bg-green-50")}>
                        <TableCell><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(p.id)} className="border-slate-300" /></TableCell>
                        <TableCell className="text-center">
                            {displayImage ? (
                                <img src={displayImage} alt={p.name} className="h-8 w-8 object-cover rounded shadow-sm mx-auto bg-white border border-slate-200" />
                            ) : (
                                <div className="h-8 w-8 bg-slate-50 rounded border border-slate-200 flex items-center justify-center mx-auto text-slate-300">
                                    <ImageOff className="h-4 w-4" title="No Image" />
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">{p.is_service && <Scissors className="w-3.5 h-3.5 text-secondary" title="Service" />}{p.name}</div>
                            {p.is_offer_active && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium inline-block mt-1">Offer Active</span>}
                            {p.bulk_pricing_tiers && p.bulk_pricing_tiers.length > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium inline-block ml-1 mt-1">Bulk Price</span>}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{p.sku}</TableCell>
                        <TableCell className="text-slate-600 text-sm">
                           {p.category ? (
                             <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium border border-slate-200">{p.category}</span>
                           ) : (
                             <span className="text-slate-400 text-xs italic">Uncategorized</span>
                           )}
                        </TableCell>
                        <TableCell className={cn("font-mono text-xs transition-colors duration-500", recentlyUpdatedIds.has(p.id) ? "text-green-600 font-bold" : "text-slate-500")}>{p.hsn_code || '-'}</TableCell>
                        <TableCell className="text-slate-700 font-medium">{formatPrice(p.cost_price)}</TableCell>
                        <TableCell className="text-slate-900 font-semibold">{formatPrice(p.selling_price)}</TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="text-slate-700">{formatPrice(taxValue)}</span>
                                <span className={cn("text-[10px] font-medium transition-colors duration-500", recentlyUpdatedIds.has(p.id) ? "text-green-600 font-bold" : "text-slate-400")}>({p.tax_rate || 0}%)</span>
                            </div>
                        </TableCell>
                        <TableCell className={cn(!p.is_service && p.low_stock_threshold && p.stock_level <= p.low_stock_threshold ? "text-accent font-bold" : "text-slate-700 font-medium")}>{p.is_service ? <span className="text-slate-400 italic text-xs">N/A</span> : <span>{p.stock_level} <span className="text-xs text-slate-400">{p.unit || 'pcs'}</span></span>}</TableCell>
                        <TableCell className="text-center">{!p.is_service && p.expiry_date ? (<div className="flex flex-col items-center"><span className="text-xs text-slate-500">{format(new Date(p.expiry_date), 'dd/MM/yy')}</span>{expiryStatus && (<span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", expiryStatus.className)}>{expiryStatus.label}</span>)}</div>) : (<span className="text-slate-400 text-xs">-</span>)}</TableCell>
                         <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              disabled={togglingVisibility[p.id]}
                              className={cn(
                                "h-8 w-8 rounded-full transition-all duration-200", 
                                p.is_visible_online !== false 
                                  ? "text-primary bg-primary/10 hover:bg-primary/20" 
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                                togglingVisibility[p.id] && "opacity-70 cursor-not-allowed"
                              )} 
                              onClick={() => handleVisibilityToggle(p.id, p.is_visible_online !== false)} 
                              title={p.is_visible_online !== false ? "Visible Online (Click to hide)" : "Hidden Online (Click to show)"}
                            >
                              {togglingVisibility[p.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : p.is_visible_online !== false ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                         </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 items-center">
                            {!p.is_service && hasPermission('products') && (<Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-600 hover:text-primary hover:bg-primary/10" title="Update stock" onClick={() => { setStockProduct(p); setIsStockDialogOpen(true); }}><ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Stock</Button>)}
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-600 hover:text-primary hover:bg-primary/10" title="Copy" onClick={() => openCopy(p)}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-slate-600 hover:text-primary hover:bg-primary/10" title="Edit" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                            {p.archived ? (
                                <Button variant="ghost" size="sm" disabled={isArchiving[p.id]} className="h-8 px-2 text-xs text-success hover:bg-success/10" title="Unarchive" onClick={() => handleArchive(p.id, false)}>
                                    {isArchiving[p.id] ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Archive className="h-3.5 w-3.5 mr-1" />} Restore
                                </Button>
                            ) : (
                                <Button variant="ghost" size="sm" disabled={isArchiving[p.id]} className="h-8 px-2 text-xs text-slate-600 hover:bg-slate-100" title="Archive" onClick={() => handleArchive(p.id, true)}>
                                    {isArchiving[p.id] ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Archive className="h-3.5 w-3.5 mr-1" />} Archive
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" title="Delete" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 pb-20">
                {pageItems.map(p => {
                  const expiryStatus = getExpiryStatus(p.expiry_date);
                  const taxValue = ((p.selling_price || 0) * (p.tax_rate || 0)) / 100;
                  const displayImage = p.image_url || (p.images && p.images.length > 0 ? p.images[0] : null);
                  const isSelected = selectedIds.has(p.id);
                  
                  return (
                  <Card key={p.id} className={cn("overflow-hidden border shadow-sm rounded-lg border-slate-200 bg-white hover:shadow-md transition-all duration-500", p.archived && "bg-slate-50", isSelected && "selected-row bg-blue-50/50 ring-2 ring-primary/50", recentlyUpdatedIds.has(p.id) && "ring-2 ring-green-500 bg-green-50/50")}>
                    <div className="py-3 px-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex gap-3 flex-1 min-w-0">
                            {displayImage ? (
                                <img src={displayImage} alt={p.name} className="h-12 w-12 object-cover rounded shadow-sm border border-slate-200 bg-white flex-shrink-0" />
                            ) : (
                                <div className="h-12 w-12 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-slate-300 flex-shrink-0">
                                    <ImageOff className="h-5 w-5" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                    {p.is_service && <Scissors className="w-3.5 h-3.5 text-secondary flex-shrink-0" />}
                                    <h3 className={cn("font-bold text-sm leading-tight break-words text-slate-900", p.archived && "text-slate-400")}>{p.name}</h3>
                                    {p.is_offer_active && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full font-medium leading-none py-0.5">Offer</span>}
                                    {expiryStatus && (<span className={cn("text-[10px] px-1.5 rounded-full font-medium leading-none py-0.5 border", expiryStatus.className)}>{expiryStatus.label}</span>)}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600 py-1">
                                    <span className="whitespace-nowrap">Price: <span className="font-bold text-slate-900">{formatPrice(p.selling_price)}</span></span>
                                    <span className="text-slate-300">•</span>
                                    <span className={cn("whitespace-nowrap font-medium", !p.is_service && p.low_stock_threshold && p.stock_level <= p.low_stock_threshold ? "text-accent font-bold" : "")}>Stock: {p.is_service ? "N/A" : p.stock_level}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{p.category || 'No Category'}</span>
                                    {p.sku && (<span className="text-[10px] text-slate-500 truncate max-w-[100px]">SKU: {p.sku}</span>)}
                                    {p.hsn_code && (<span className={cn("text-[10px] truncate max-w-[100px] transition-colors duration-500", recentlyUpdatedIds.has(p.id) ? "text-green-600 font-bold" : "text-slate-500")}>HSN: {p.hsn_code}</span>)}
                                </div>
                            </div>
                        </div>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(p.id)} className="h-5 w-5 mt-1 border-slate-300 rounded flex-shrink-0" />
                      </div>
                    </div>
                    <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center gap-2">
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={togglingVisibility[p.id]}
                            className={cn(
                              "h-8 w-8 rounded-full transition-all duration-200", 
                              p.is_visible_online !== false 
                                ? "text-primary bg-primary/10 hover:bg-primary/20" 
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                              togglingVisibility[p.id] && "opacity-70 cursor-not-allowed"
                            )} 
                            onClick={() => handleVisibilityToggle(p.id, p.is_visible_online !== false)}
                            title={p.is_visible_online !== false ? "Visible Online (Click to hide)" : "Hidden Online (Click to show)"}
                          >
                            {togglingVisibility[p.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : p.is_visible_online !== false ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          {!p.is_service && hasPermission('products') && (
                            <Button variant="ghost" size="icon" onClick={() => { setStockProduct(p); setIsStockDialogOpen(true); }} className="h-8 w-8 text-primary rounded-full hover:bg-primary/10">
                              <ArrowLeftRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title="Duplicate Product" onClick={() => handleDuplicate(p)} disabled={copyingId === p.id} className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full">{copyingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}</Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="h-8 px-3 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 bg-white">Edit</Button>
                            {p.archived ? (
                                <Button variant="ghost" size="icon" disabled={isArchiving[p.id]} title="Restore" onClick={() => handleArchive(p.id, false)} className="h-8 w-8 text-success hover:bg-success/10 rounded-full">
                                   {isArchiving[p.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" disabled={isArchiving[p.id]} title="Archive" onClick={() => handleArchive(p.id, true)} className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full">
                                   {isArchiving[p.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </div>
                  </Card>
                )})}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-2 p-3 border-t border-slate-200 bg-white sticky bottom-16 md:static rounded-b-lg md:rounded-none">
                <div className="text-sm text-slate-500 font-medium">Page {page} of {totalPages}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-9 px-4 border-slate-200 text-slate-600">Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-9 px-4 border-slate-200 text-slate-600">Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingProduct(null); }}>
        <DialogTrigger />
        <DialogContent className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-none sm:max-w-2xl overflow-y-auto p-0 sm:p-6 rounded-none sm:rounded-xl bg-white border-slate-200 shadow-xl custom-scrollbar">
          <div className="p-4 sm:p-0 sticky top-0 bg-white z-10 border-b border-slate-100 sm:border-0 flex justify-between items-center sm:block">
              <DialogHeader className="text-left"><DialogTitle className="text-xl font-bold text-slate-900">{editingProduct?.id ? "Edit product" : (editingProduct ? "Copy product" : "Add product")}</DialogTitle></DialogHeader>
              <DialogClose asChild className="sm:hidden"><Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"><X className="h-6 w-6" /></Button></DialogClose>
          </div>
          <div className="p-4 sm:p-0">
              <InlineProductForm initial={editingProduct} onSuccess={onFormSuccess} onClose={() => setIsFormOpen(false)} user={user} posUserId={posUserId} toast={toast} existingSkus={existingSkus} existingBarcodes={existingBarcodes} canAddProduct={canAddProduct} maxProducts={currentProducts} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Management Modal */}
      <Dialog open={isCategoryManagementOpen} onOpenChange={setIsCategoryManagementOpen}>
        <DialogContent className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-none sm:max-w-5xl overflow-y-auto p-0 sm:p-6 rounded-none sm:rounded-xl bg-white border-slate-200 shadow-xl">
          <div className="p-4 sm:p-0 sticky top-0 bg-white z-10 border-b border-slate-100 sm:border-0 flex justify-between items-center sm:block">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <FolderOpen className="h-5 w-5 text-indigo-600" />
                Product Categories Management
              </DialogTitle>
            </DialogHeader>
            <DialogClose asChild className="sm:hidden">
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                <X className="h-6 w-6" />
              </Button>
            </DialogClose>
          </div>
          <div className="p-4 sm:p-0">
            <ProductCategoryManagement />
          </div>
        </DialogContent>
      </Dialog>

      <BulkCategoryUpdateDialog
        open={bulkCategoryDialogOpen}
        onOpenChange={setBulkCategoryDialogOpen}
        selectedProducts={selectedProducts}
        categories={categories}
        onUpdate={handleBulkCategoryUpdate}
      />
      
      <BulkHSNCodeDialog
        open={bulkHSNDialogOpen}
        onOpenChange={setBulkHSNDialogOpen}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkHSNUpdate}
        isApplying={isApplyingHSN}
      />

      <QuickAddPosProductModal open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen} onProductAdded={fetchProducts} posUserId={posUserId} />
      <ExcelUploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
      <BulkImageUploadDialog open={isBulkImageOpen} onOpenChange={setIsBulkImageOpen} />
      <StockUpdateDialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen} product={stockProduct || {}} onSuccess={() => { fetchProducts(); }} toast={toast} />
      <BulkDiscountDialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen} mode={discountMode} selectedCount={selectedIds.size} categories={categories} onConfirm={handleConfirmDiscount} isApplying={isApplyingDiscount} />
      <QuantityPickerDialog open={quantityDialog.open} onOpenChange={(open) => setQuantityDialog(s => ({ ...s, open }))} product={quantityDialog.product} onConfirm={confirmQuantity} />
      <AlertDialog open={confirmationDialog.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmationDialog({ ...confirmationDialog, isOpen: false })}><AlertDialogContent className="w-[90vw] max-w-md rounded-xl bg-white border-slate-200"><AlertDialogHeader><AlertDialogTitle className="text-slate-900 font-bold">{confirmationDialog.title}</AlertDialogTitle><AlertDialogDescription className="text-slate-600">{confirmationDialog.description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="flex-row gap-2 justify-end"><AlertDialogCancel className="mt-0 border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setConfirmationDialog({ ...confirmationDialog, isOpen: false })}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-primary hover:bg-primary/90 text-white" onClick={() => { confirmationDialog.onConfirm(); setConfirmationDialog({ ...confirmationDialog, isOpen: false }); }}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      
      {/* Barcode Label Print Modal */}
      <BarcodeLabelPrintModal 
         open={isPrintModalOpen} 
         onOpenChange={setIsPrintModalOpen} 
         allProducts={products}
         initialProducts={products.filter(p => selectedIds.has(p.id))}
      />

      {isSearchScannerOpen && (
        <BarcodeScanner 
          isOpen={isSearchScannerOpen}
          onScanSuccess={(code) => { 
            setQuery(code); 
            setIsSearchScannerOpen(false); 
            const exists = products.some(p => String(p.barcode) === String(code)); 
            if (exists) { 
              toast({ title: "Product Found", description: `Scanned: ${code}` }); 
            } else { 
              toast({ title: "Product Not Found", description: `No product matches barcode: ${code}`, variant: "destructive" }); 
            } 
          }} 
          onClose={() => setIsSearchScannerOpen(false)} 
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-30 md:hidden pb-safe shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
          <Button onClick={openCreate} className="w-full h-12 text-base shadow-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"><PlusCircle className="mr-2 h-5 w-5" /> Add Product / Service</Button>
      </div>
    </div>
  );
};

export default function PosProductsPage() { return (<ErrorBoundary><Suspense fallback={<Loader label="Loading products..." />}><PosProducts /></Suspense></ErrorBoundary>); }