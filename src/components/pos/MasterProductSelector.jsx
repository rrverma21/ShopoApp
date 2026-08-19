import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Package, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { usePlanLimits } from "@/hooks/usePlanLimits";

const MasterProductSelector = ({ open, onOpenChange, onProductsAdded, posUserId }) => {
  const { user } = useAuth(); // Fallback if posUserId not passed explicitly
  const effectiveUserId = posUserId || user?.id; // Use passed ID or fallback
  
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [importing, setImporting] = useState(false);
  
  // Use the plan limits hook
  const { maxProducts, currentProducts } = usePlanLimits();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setSelectedProducts(new Set());
      setProducts([]);
    }
  }, [open]);

  // Fetch/Search master products
  useEffect(() => {
    if (!open) return;

    const fetchMasterProducts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('product_master')
          .select('*')
          .limit(50); // Fetch top 50 by default or matches

        if (searchTerm && searchTerm.trim().length > 0) {
          query = query.ilike('name', `%${searchTerm.trim()}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error searching master products:', error);
        // Silent error or toast if critical
      } finally {
        setLoading(false);
      }
    };

    // Debounce logic: immediate for empty, delayed for search
    if (!searchTerm) {
        fetchMasterProducts();
    } else {
        const timeoutId = setTimeout(fetchMasterProducts, 300);
        return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, open]);

  const toggleSelect = (product) => {
    const newSelected = new Set(selectedProducts);
    const existing = Array.from(selectedProducts).find(p => p.id === product.id);
    
    if (existing) {
      newSelected.delete(existing);
    } else {
      newSelected.add(product);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length && products.length > 0) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products));
    }
  };

  const handleImport = async () => {
    if (selectedProducts.size === 0) return;

    // Check plan limits
    const remainingSlots = maxProducts - currentProducts;
    
    // If limits are loaded (maxProducts > 0) and we're exceeding them
    if (maxProducts > 0 && (currentProducts + selectedProducts.size > maxProducts)) {
      toast({
        title: "Plan Limit Reached",
        description: `You selected ${selectedProducts.size} products, but your plan only allows adding ${Math.max(0, remainingSlots)} more. Please upgrade or select fewer items.`,
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    try {
      const productsToImport = Array.from(selectedProducts).map(p => ({
        user_id: effectiveUserId, // Use the store owner ID
        name: p.name,
        sku: p.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        category: p.category || 'Uncategorized',
        selling_price: p.mrp || 0,
        cost_price: p.purchase_price || 0,
        tax_rate: p.gst_rate || 0,
        stock_level: 0,
        unit: p.unit || 'pcs',
        description: p.description,
        image_url: p.image_url,
        hsn_code: p.hsn_sac
      }));

      const { error } = await supabase
        .from('point_of_sale_products')
        .insert(productsToImport);

      if (error) throw error;

      toast({
        title: "Products Imported",
        description: `Successfully added ${productsToImport.length} products to your inventory.`
      });

      onProductsAdded();
      onOpenChange(false);
      setSelectedProducts(new Set());
      setSearchTerm("");
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Import from Master Catalog</DialogTitle>
          <DialogDescription>
            Search and add products from our global catalog to your inventory.
            <div className="mt-2 text-xs font-medium text-slate-500 bg-slate-100 p-2 rounded inline-block">
               Plan Usage: {currentProducts} / {maxProducts} products used
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by product name (e.g. 'amul', 'colgate')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative bg-slate-50/50">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : products.length > 0 ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedProducts.size === products.length && products.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">Select All ({products.length})</span>
                </div>
                <span className="text-xs text-slate-500">{selectedProducts.size} selected</span>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {products.map((product) => {
                    const isSelected = Array.from(selectedProducts).some(p => p.id === product.id);
                    return (
                      <div
                        key={product.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer group ${
                          isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'
                        }`}
                        onClick={() => toggleSelect(product)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(product)}
                          className="mt-1"
                        />
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-10 h-10 rounded-md object-cover bg-white border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 border">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-sm text-slate-900 truncate pr-2 group-hover:text-blue-600 transition-colors">
                                {product.name}
                            </h4>
                            {product.mrp && (
                              <Badge variant="secondary" className="font-normal text-xs whitespace-nowrap">
                                ₹{product.mrp}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="truncate">{product.category || 'General'}</span>
                            {product.brand && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="truncate">{product.brand}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
              {searchTerm ? (
                  <>
                    <Package className="w-12 h-12 mb-2 opacity-20" />
                    <p>No products found for "{searchTerm}"</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </>
              ) : (
                  <>
                    <Search className="w-12 h-12 mb-2 opacity-20" />
                    <p>No products available in master catalog</p>
                  </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={importing || selectedProducts.size === 0}
            className="gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Import {selectedProducts.size} Products
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MasterProductSelector;