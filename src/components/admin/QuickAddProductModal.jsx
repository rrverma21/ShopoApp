import React, { useState, useEffect, useRef } from 'react';
import { Camera, Loader2, CheckCircle, Barcode, Plus, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { toCamelCase, cn } from '@/lib/utils';
import BarcodeScanner from '@/components/pos/BarcodeScanner';

const QuickAddProductModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    productName: '',
    barcode: '',
    category: '',
    mrp: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const nameInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const { data } = await supabase
            .from('product_master')
            .select('category')
            .not('category', 'is', null);
          
          if (data) {
            const unique = [...new Set(data.map(item => item.category))].filter(Boolean).sort();
            setCategories(unique);
          }
        } catch (error) {
          console.error("Error fetching categories:", error);
        }
      };
      
      fetchCategories();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({ productName: '', barcode: '', category: '', mrp: '' });
    setErrors({});
    setIsCustomCategory(false);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.productName.trim()) newErrors.productName = "Product Name is required";
    if (!formData.barcode.trim()) newErrors.barcode = "Barcode is required";
    if (!formData.category.trim()) newErrors.category = "Category is required";
    if (!formData.mrp) newErrors.mrp = "MRP is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
        toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      const { data: existing, error: checkError } = await supabase
        .from('product_master')
        .select('id')
        .eq('barcode', formData.barcode);

      if (checkError) {
          console.error("Error checking barcode:", checkError);
          throw checkError;
      }

      if (existing && existing.length > 0) {
        setErrors(prev => ({ ...prev, barcode: "Barcode already exists" }));
        toast({ title: "Duplicate Barcode", description: "This barcode is already in use.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('product_master')
        .insert([{
          product_name: formData.productName,
          barcode: formData.barcode,
          category: formData.category,
          mrp: parseFloat(formData.mrp)
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Product <strong>{formData.productName}</strong> added!</span>
          </div>
        ),
      });

      onSuccess?.();
      resetForm();

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (code) => {
    setFormData(prev => ({ ...prev, barcode: code }));
    setShowScanner(false);
    toast({ title: "Scanned", description: `Barcode: ${code}` });
    return true;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-md rounded-2xl border-white/40 shadow-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Plus className="h-5 w-5" />
              </div>
              Quick Add Product
            </DialogTitle>
            <DialogDescription className="text-slate-500">
               Enter details below. The form will reset automatically for continuous entry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="q-productName" className={cn("text-slate-700", errors.productName && "text-red-500")}>
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="q-productName"
                ref={nameInputRef}
                placeholder="e.g. Water Bottle 1L"
                value={formData.productName}
                onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                onBlur={(e) => setFormData(prev => ({ ...prev, productName: toCamelCase(e.target.value) }))}
                className={cn(
                  "h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all",
                  errors.productName && "border-red-500 focus:ring-red-500/20 bg-red-50"
                )}
              />
              {errors.productName && <p className="text-xs text-red-500">{errors.productName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-barcode" className={cn("text-slate-700", errors.barcode && "text-red-500")}>
                Barcode <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    id="q-barcode"
                    placeholder="Scan or enter barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className={cn(
                      "pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono",
                      errors.barcode && "border-red-500 focus:ring-red-500/20 bg-red-50"
                    )}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 shadow-sm"
                  onClick={() => setShowScanner(true)}
                  title="Scan Barcode"
                >
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
              {errors.barcode && <p className="text-xs text-red-500">{errors.barcode}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="q-category" className={cn("text-slate-700", errors.category && "text-red-500")}>
                  Category <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(!isCustomCategory);
                    setFormData(prev => ({ ...prev, category: '' }));
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  {isCustomCategory ? (
                    <>
                      <List className="h-3 w-3" /> Select Existing
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" /> Create New
                    </>
                  )}
                </button>
              </div>
              
              {isCustomCategory || categories.length === 0 ? (
                <Input
                  id="q-category"
                  placeholder="Enter new category name"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className={cn(
                    "h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all",
                    errors.category && "border-red-500 focus:ring-red-500/20 bg-red-50"
                  )}
                />
              ) : (
                <Select 
                  value={formData.category || undefined} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className={cn(
                    "h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 transition-all",
                    errors.category && "border-red-500 ring-red-500/20 bg-red-50"
                  )}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {categories
                      .filter(cat => cat && typeof cat === 'string' && cat.trim() !== '')
                      .map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-mrp" className={cn("text-slate-700", errors.mrp && "text-red-500")}>
                MRP <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500 font-medium">₹</span>
                <Input
                  id="q-mrp"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.mrp}
                  onChange={(e) => setFormData(prev => ({ ...prev, mrp: e.target.value }))}
                  className={cn(
                    "pl-8 h-11 rounded-xl bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all",
                    errors.mrp && "border-red-500 focus:ring-red-500/20 bg-red-50"
                  )}
                />
              </div>
              {errors.mrp && <p className="text-xs text-red-500">{errors.mrp}</p>}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 h-12 rounded-xl border-slate-200 text-gray-700 hover:bg-slate-50 hover:text-gray-900"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : "Add Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {showScanner && (
        <BarcodeScanner 
          onProductScanned={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
};

export default QuickAddProductModal;