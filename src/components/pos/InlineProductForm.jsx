import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Calculator from '@/components/ui/calculator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, X, Barcode, Calculator as CalculatorIcon, Tag, Percent, Award, Layers, Globe, Upload, Loader2, Scale, BoxSelect, RefreshCw, Camera, Scissors, AlertCircle, Edit, Trash2, CheckCircle2, XCircle, Settings2 } from 'lucide-react';
import { cn, formatPrice, formatExpiryDate } from '@/lib/utils';
import BarcodeScanner from './BarcodeScanner';
import CategoryDropdown from './CategoryDropdown';
import { generateUniqueSku } from '@/lib/skuGenerator'; 

const GROCERY_UNITS = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "l", label: "Liter (l)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "pkt", label: "Packet (pkt)" },
  { value: "box", label: "Box" },
  { value: "dz", label: "Dozen (dz)" },
  { value: "m", label: "Meter (m)" },
];

const InlineProductForm = ({ initial = {}, onSuccess = () => {}, onClose = () => {}, user, toast, existingSkus = [], existingBarcodes = [], canAddProduct, maxProducts, currentProducts, posUserId }) => {
  const isEditing = !!initial?.id;
  const [isWholesaler, setIsWholesaler] = useState(false);

  const [skuStatus, setSkuStatus] = useState('idle'); 
  const [skuMessage, setSkuMessage] = useState('');

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    hsn_code: "",
    description: "",
    cost_price: 0,
    selling_price: 0,
    wholesale_price: '', 
    tax_rate: 0,
    stock_level: 0,
    low_stock_threshold: 0,
    category: "",
    category_id: null,
    unit: "pcs",
    image_url: "",
    images: [],
    search_keywords: [],
    expiry_date: "",
    archived: false,
    allow_price_change: false,
    allow_quantity_change: false,
    is_visible_online: false,
    is_offer_active: false,
    discount_type: 'percentage',
    discount_value: 0,
    offer_name: '',
    offer_start_date: '',
    offer_end_date: '',
    loyalty_points: 0,
    bulk_pricing_tiers: [], 
    promotion_tags: [],
    is_service: false,
    variants: [],
    ...initial,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!posUserId) return;
      try {
        const { data } = await supabase.from('pos_retailer_settings').select('shop_category').eq('user_id', posUserId).maybeSingle();
        if (data && (data?.shop_category === 'Wholesaler' || data?.shop_category === 'wholesale')) {
          setIsWholesaler(true);
        }
      } catch (err) {
        console.error("Error fetching retailer settings:", err);
      }
    };
    fetchSettings();
  }, [posUserId]);

  useEffect(() => {
    if (initial && Object.keys(initial).length > 0) {
      const formattedDates = {};
      if (initial?.offer_start_date) formattedDates.offer_start_date = new Date(initial.offer_start_date).toISOString().slice(0, 16);
      if (initial?.offer_end_date) formattedDates.offer_end_date = new Date(initial.offer_end_date).toISOString().slice(0, 16);
      
      setForm(f => ({ 
        ...f, 
        ...initial, 
        ...formattedDates, 
        category_id: initial?.category_id || null,
        description: initial?.description || "",
        unit: initial?.unit || "pcs",
        wholesale_price: initial?.wholesale_price || '',
        hsn_code: initial?.hsn_code || "",
        bulk_pricing_tiers: Array.isArray(initial?.bulk_pricing_tiers) ? initial.bulk_pricing_tiers : [],
        promotion_tags: Array.isArray(initial?.promotion_tags) ? initial.promotion_tags : [],
        search_keywords: Array.isArray(initial?.search_keywords) ? initial.search_keywords : [],
        is_visible_online: initial?.is_visible_online ?? true,
        allow_quantity_change: initial?.allow_quantity_change ?? false,
        allow_price_change: initial?.allow_price_change ?? false,
        images: Array.isArray(initial?.images) && initial.images.length > 0 
            ? initial.images 
            : (initial?.image_url ? [initial.image_url] : []),
        expiry_date: initial?.expiry_date || "",
        is_service: initial?.is_service || false,
        variants: Array.isArray(initial?.variants) ? initial.variants.map(v => ({...v, barcode: v?.barcode || '', batchNo: v?.batchNo || '', expiryDate: v?.expiryDate || ''})) : [],
      }));
      setSkuStatus('available');
      setSkuMessage('');
    }
  }, [initial]);
  
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState('main'); 
  const [newTier, setNewTier] = useState({ min_quantity: '', discount_percent: '' });
  const [uploading, setUploading] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  const [variantInput, setVariantInput] = useState({ name: '', price: '', stock: '', sku: '', barcode: '', batchNo: '', expiryDate: '' });
  const [editingVariant, setEditingVariant] = useState(null);
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);

  useEffect(() => {
    const checkSkuAvailability = async () => {
      const skuToCheck = form?.sku?.trim() || '';
      
      if (!skuToCheck) {
         setSkuStatus('error');
         setSkuMessage('SKU is required');
         return;
      }
      
      if (isEditing && skuToCheck === initial?.sku) {
         setSkuStatus('available');
         setSkuMessage('');
         return;
      }
      
      setSkuStatus('checking');
      setSkuMessage('Checking SKU availability...');
      
      try {
        const { data, error } = await supabase
          .from('point_of_sale_products')
          .select('id')
          .ilike('sku', skuToCheck)
          .eq('user_id', posUserId)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
           setSkuStatus('taken');
           setSkuMessage('This SKU already exists. Please use a different SKU.');
        } else {
           setSkuStatus('available');
           setSkuMessage('SKU is available');
        }
      } catch (err) {
        console.error("SKU Validation Error:", err);
        setSkuStatus('error');
        setSkuMessage('Error checking SKU. Please try again.');
      }
    };

    const timer = setTimeout(() => {
      checkSkuAvailability();
    }, 500);

    return () => clearTimeout(timer);
  }, [form?.sku, isEditing, initial?.sku, posUserId]);

  const generateSku = async () => {
    setSkuStatus('checking');
    setSkuMessage('Generating SKU...');
    const newSku = await generateUniqueSku(form?.name, posUserId);
    
    if (newSku) {
      setForm(prev => ({ ...prev, sku: newSku }));
      setSkuStatus('available');
      setSkuMessage('SKU is available');
    } else {
      setSkuStatus('error');
      setSkuMessage('Failed to generate unique SKU');
    }
  };

  const generateBarcode = () => {
    let barcode;
    let attempts = 0;
    do {
      const randomPart = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(randomPart[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const checksum = (10 - (sum % 10)) % 10;
      barcode = randomPart + checksum;
      attempts++;
      if (attempts > 200) return "0000000000000";
    } while ((existingBarcodes || []).includes(barcode));
    setForm((s) => ({ ...s, barcode }));
  };

  useEffect(() => {
    if (!isEditing && !form?.sku && form?.name && skuStatus === 'idle') {
      const t = setTimeout(() => {
          generateSku();
      }, 1000);
      return () => clearTimeout(t);
    } else if (!isEditing && !form?.sku && skuStatus === 'idle') {
      generateSku();
    }
  }, [isEditing, form?.name, skuStatus]);

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };
  
  const handleCheckboxChange = (name, checked) => {
    setForm((s) => ({ ...s, [name]: checked }));
  };

  const handleSelectChange = (name, value) => {
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleCalculatorApply = (val) => {
    setForm(prev => ({ ...prev, selling_price: val }));
    setIsCalculatorOpen(false);
  };

  const handleCategoryChange = (val) => {
    setForm(s => ({
      ...s,
      category_id: val
    }));
  };

  const validateBarcode = (barcode, variantId = null) => {
      if (!barcode) return { isValid: true };
      if (!/^[a-zA-Z0-9.-]{3,50}$/.test(barcode)) {
          return { isValid: false, message: "Invalid format (3-50 alphanumeric characters)" };
      }
      const duplicateInForm = (form?.variants || []).some(v => v?.barcode === barcode && v?.id !== variantId);
      if (duplicateInForm) {
          return { isValid: false, message: "Duplicate barcode in this product" };
      }
      const duplicateGlobal = (existingBarcodes || []).includes(barcode);
      if (duplicateGlobal && !isEditing) { 
           return { isValid: true, warning: "Barcode exists in another product" };
      }
      return { isValid: true };
  };

  const addVariant = () => {
      if (!variantInput?.name) return toast({ title: "Name Required", description: "Variant name (e.g., Red / Large) is required.", variant: "destructive" });
      const validation = validateBarcode(variantInput?.barcode);
      if (!validation.isValid) {
          return toast({ title: "Invalid Barcode", description: validation.message, variant: "destructive" });
      }
      if (validation.warning) {
          toast({ title: "Warning", description: validation.warning, variant: "warning" });
      }
      const newVariant = {
          id: crypto.randomUUID(),
          name: variantInput.name,
          price: Number(variantInput.price) || Number(form?.selling_price) || 0,
          stock: Number(variantInput.stock) || 0,
          sku: variantInput.sku || `${form?.sku || 'SKU'}-${variantInput.name.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          attributes: { Option: variantInput.name },
          barcode: variantInput.barcode || '',
          batchNo: variantInput.batchNo || '',
          expiryDate: variantInput.expiryDate || ''
      };
      setForm(prev => {
          const updatedVariants = [...(prev?.variants || []), newVariant];
          const totalStock = updatedVariants.reduce((sum, v) => sum + (v?.stock || 0), 0);
          return { ...prev, variants: updatedVariants, stock_level: totalStock };
      });
      setVariantInput({ name: '', price: '', stock: '', sku: '', barcode: '', batchNo: '', expiryDate: '' });
      toast({ title: "Variant Added", description: `${newVariant.name} added successfully.` });
  };

  const removeVariant = (id) => {
      setForm(prev => {
          const updatedVariants = (prev?.variants || []).filter(v => v?.id !== id);
          const totalStock = updatedVariants.reduce((sum, v) => sum + (v?.stock || 0), 0);
          return { ...prev, variants: updatedVariants, stock_level: totalStock };
      });
  };

  const openEditVariant = (variant) => {
      setEditingVariant({ ...(variant || {}) });
      setIsEditVariantOpen(true);
  };

  const saveEditedVariant = () => {
      if (!editingVariant) return;
      if (!editingVariant?.name) {
          return toast({ title: "Validation Error", description: "Variant name is required", variant: "destructive" });
      }
      const validation = validateBarcode(editingVariant?.barcode, editingVariant?.id);
      if (!validation.isValid) {
          return toast({ title: "Validation Error", description: validation.message, variant: "destructive" });
      }
      setForm(prev => {
          const updatedVariants = (prev?.variants || []).map(v => v?.id === editingVariant?.id ? editingVariant : v);
          const totalStock = updatedVariants.reduce((sum, v) => sum + (Number(v?.stock) || 0), 0);
          return { ...prev, variants: updatedVariants, stock_level: totalStock };
      });
      setIsEditVariantOpen(false);
      setEditingVariant(null);
      toast({ title: "Variant Updated", description: "Variant details saved." });
  };

  const handleScanClick = (target) => {
      setScannerTarget(target);
      setShowScanner(true);
  };

  const handleScanResult = (code) => {
      if (scannerTarget === 'main') {
          setForm(prev => ({ ...prev, barcode: code }));
      } else if (scannerTarget === 'variant_add') {
          setVariantInput(prev => ({ ...prev, barcode: code }));
      } else if (scannerTarget === 'variant_edit') {
          setEditingVariant(prev => ({ ...prev, barcode: code }));
      }
      setShowScanner(false);
      return true; 
  };

  const addBulkTier = () => {
    if (newTier?.min_quantity && newTier?.discount_percent) {
      setForm(prev => ({
        ...prev,
        bulk_pricing_tiers: [...(prev?.bulk_pricing_tiers || []), { 
          min_quantity: parseInt(newTier.min_quantity), 
          discount_percent: parseFloat(newTier.discount_percent) 
        }].sort((a, b) => (a?.min_quantity || 0) - (b?.min_quantity || 0))
      }));
      setNewTier({ min_quantity: '', discount_percent: '' });
    }
  };

  const removeBulkTier = (index) => {
    setForm(prev => ({
      ...prev,
      bulk_pricing_tiers: (prev?.bulk_pricing_tiers || []).filter((_, i) => i !== index)
    }));
  };

  const togglePromotionTag = (tag) => {
    setForm(prev => {
      const tags = prev?.promotion_tags || [];
      if (tags.includes(tag)) {
        return { ...prev, promotion_tags: tags.filter(t => t !== tag) };
      } else {
        return { ...prev, promotion_tags: [...tags, tag] };
      }
    });
  };

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = keywordInput?.trim() || '';
        if (val && !(form?.search_keywords || []).includes(val)) {
            setForm(s => ({ ...s, search_keywords: [...(s?.search_keywords || []), val] }));
        }
        setKeywordInput('');
    }
  };

  const removeKeyword = (k) => {
    setForm(s => ({ ...s, search_keywords: (s?.search_keywords || []).filter(x => x !== k) }));
  };

  const handleImageUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if ((form?.images?.length || 0) >= 4) {
        toast({ title: "Limit reached", description: "Maximum 4 images allowed per product.", variant: "destructive" });
        return;
      }
      setUploading(true);
      if (file.size > 5 * 1024 * 1024) throw new Error("File size must be less than 5MB");
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${posUserId}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      setForm(prev => {
        const currentImages = prev?.images || [];
        const newImages = [...currentImages, data.publicUrl];
        return { ...prev, images: newImages, image_url: newImages[0] };
      });
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: error.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const removeImage = (indexToRemove) => {
    setForm(prev => {
        const currentImages = prev?.images || [];
        const newImages = currentImages.filter((_, index) => index !== indexToRemove);
        return { ...prev, images: newImages, image_url: newImages.length > 0 ? newImages[0] : "" };
    });
  };

  const calculateDiscountedPrice = () => {
      if (!form?.selling_price || !form?.discount_value) return form?.selling_price || 0;
      const price = parseFloat(form.selling_price) || 0;
      const discount = parseFloat(form.discount_value) || 0;
      if (form?.discount_type === 'percentage') return price - (price * (discount / 100));
      return price - discount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.sku || form.sku.trim() === '') {
        const generated = await generateUniqueSku(form.name, posUserId);
        form.sku = generated;
    }

    if (skuStatus === 'checking' || skuStatus === 'taken' || skuStatus === 'error') {
      toast({ 
        title: "Invalid SKU", 
        description: skuMessage || "Please provide a valid, unique SKU before saving.", 
        variant: "destructive" 
      });
      return;
    }

    setSubmitting(true);
    
    if (!isEditing) {
        const isPosAllowed = canAddProduct && canAddProduct();
        if (canAddProduct && !isPosAllowed) {
            toast({
                title: "Limit Reached",
                description: `You have reached the maximum of ${maxProducts} products for your plan. Please upgrade to add more.`,
                variant: "destructive"
            });
            setSubmitting(false);
            return;
        }
    }

    if (isWholesaler && !form?.hsn_code) {
        toast({
            title: "HSN Code Required",
            description: "As a wholesaler, HSN Code is mandatory for all products.",
            variant: "destructive"
        });
        setSubmitting(false);
        return;
    }
    
    if (form?.is_offer_active) {
        if (form?.offer_start_date && form?.offer_end_date && new Date(form.offer_start_date) > new Date(form.offer_end_date)) {
            toast({ title: "Invalid Offer Dates", description: "Start date must be before end date", variant: "destructive" });
            setSubmitting(false);
            return;
        }
    }
    
    let finalStock = Number(form?.stock_level) || 0;
    if (Array.isArray(form?.variants) && form.variants.length > 0) {
        finalStock = form.variants.reduce((sum, v) => sum + (Number(v?.stock) || 0), 0);
    }

    const payload = {
      ...form,
      user_id: posUserId,
      cost_price: Number(form?.cost_price) || 0,
      selling_price: Number(form?.selling_price) || 0,
      wholesale_price: form?.wholesale_price ? Number(form.wholesale_price) : null,
      tax_rate: Number(form?.tax_rate) || 0,
      stock_level: form?.is_service ? 0 : finalStock,
      low_stock_threshold: form?.is_service ? 0 : (Number(form?.low_stock_threshold) || 0),
      discount_value: Number(form?.discount_value) || 0,
      loyalty_points: Number(form?.loyalty_points) || 0,
      offer_start_date: form?.offer_start_date || null,
      offer_end_date: form?.offer_end_date || null,
      offer_name: form?.offer_name || null,
      bulk_pricing_tiers: Array.isArray(form?.bulk_pricing_tiers) ? form.bulk_pricing_tiers : [],
      promotion_tags: Array.isArray(form?.promotion_tags) ? form.promotion_tags : [],
      search_keywords: Array.isArray(form?.search_keywords) ? form.search_keywords : [],
      is_visible_online: form?.is_visible_online ?? false,
      allow_quantity_change: form?.allow_quantity_change ?? false,
      allow_price_change: form?.allow_price_change ?? false,
      description: form?.description || '',
      images: form?.images || [],
      image_url: form?.images?.[0] || null, 
      expiry_date: form?.expiry_date || null,
      is_service: form?.is_service ?? false,
      variants: form?.variants || [],
      unit: form?.unit || 'pcs',
      barcode: (form?.is_service || !form?.barcode) ? null : form.barcode,
      category_id: form?.category_id || null, 
      hsn_code: form?.hsn_code || null,
    };

    try {
      if (isEditing && initial?.id) {
        const { error } = await supabase.from("point_of_sale_products").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase.from("point_of_sale_products").insert(payload);
        if (error) throw error;
        toast({ title: "Product created successfully" });
      }
      onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error("Submission Error:", err);
      if (err.code === '23505' && err.message?.includes('sku')) {
        setSkuStatus('taken');
        setSkuMessage('This SKU already exists. Please use a different SKU.');
        toast({ title: "Duplicate SKU", description: "This SKU already exists. Please use a different SKU or generate a new one.", variant: "destructive" });
      } else {
        toast({ title: "Save failed", description: err.message || String(err), variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4 sm:space-y-6">
      <BarcodeScanner 
        isOpen={showScanner}
        onScanSuccess={handleScanResult} 
        onClose={() => setShowScanner(false)} 
      />

      <Dialog open={isEditVariantOpen} onOpenChange={setIsEditVariantOpen}>
          <DialogContent className="sm:max-w-md w-[95vw]">
              <DialogHeader><DialogTitle>Edit Variant</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2 sm:py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="edit-name" className="sm:text-right">Name</Label>
                      <Input id="edit-name" value={editingVariant?.name || ''} onChange={(e) => setEditingVariant(prev => ({...prev, name: e.target.value}))} className="sm:col-span-3 h-11 sm:h-10" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="edit-barcode" className="sm:text-right">Barcode</Label>
                      <div className="sm:col-span-3 flex gap-2">
                        <Input id="edit-barcode" value={editingVariant?.barcode || ''} onChange={(e) => setEditingVariant(prev => ({...prev, barcode: e.target.value}))} className="h-11 sm:h-10" />
                        <Button type="button" size="icon" variant="outline" onClick={() => handleScanClick('variant_edit')} className="h-11 w-11 sm:h-10 sm:w-10 shrink-0 bg-blue-50 hover:bg-blue-100 border-blue-200" title="Scan Barcode"><Camera className="h-4 w-4 text-blue-600" /></Button>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="edit-price" className="sm:text-right">Price</Label>
                      <Input id="edit-price" type="number" value={editingVariant?.price || ''} onChange={(e) => setEditingVariant(prev => ({...prev, price: e.target.value}))} className="sm:col-span-3 h-11 sm:h-10" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="edit-stock" className="sm:text-right">Stock</Label>
                      <Input id="edit-stock" type="number" value={editingVariant?.stock || ''} onChange={(e) => setEditingVariant(prev => ({...prev, stock: e.target.value}))} className="sm:col-span-3 h-11 sm:h-10" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="edit-batch" className="sm:text-right">Batch No.</Label>
                      <Input id="edit-batch" placeholder="Optional" value={editingVariant?.batchNo || ''} onChange={(e) => setEditingVariant(prev => ({...prev, batchNo: e.target.value}))} className="sm:col-span-3 h-11 sm:h-10" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <Label htmlFor="edit-expiry" className="sm:text-right">Expiry Date</Label>
                      <Input id="edit-expiry" type="date" value={editingVariant?.expiryDate || ''} onChange={(e) => setEditingVariant(prev => ({...prev, expiryDate: e.target.value}))} className="sm:col-span-3 h-11 sm:h-10" />
                  </div>
              </div>
              <DialogFooter>
                  <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => setIsEditVariantOpen(false)}>Cancel</Button>
                  <Button type="button" className="h-11 sm:h-10" onClick={saveEditedVariant}>Save Changes</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Tabs defaultValue="basic" className="w-full">
         <TabsList className="w-full flex overflow-x-auto sm:grid sm:grid-cols-4 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg no-scrollbar">
            <TabsTrigger value="basic" className="flex-shrink-0 h-10 px-4 text-xs sm:text-sm">Basic Info</TabsTrigger>
            <TabsTrigger value="inventory" className="flex-shrink-0 h-10 px-4 text-xs sm:text-sm">Inventory</TabsTrigger>
            <TabsTrigger value="variants" className="flex-shrink-0 h-10 px-4 text-xs sm:text-sm">Variants</TabsTrigger>
            <TabsTrigger value="marketing" className="flex-shrink-0 h-10 px-4 text-xs sm:text-sm">Marketing</TabsTrigger>
         </TabsList>
         
         <TabsContent value="basic" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="sm:col-span-2 md:col-span-4 flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 mb-2 gap-2">
                    <h3 className="font-medium text-sm text-muted-foreground">Basic Details</h3>
                    <div className="flex items-center space-x-2">
                         <Switch id="is_service" checked={form?.is_service || false} onCheckedChange={(checked) => handleCheckboxChange('is_service', checked)} />
                         <Label htmlFor="is_service" className="flex items-center gap-2 cursor-pointer text-indigo-600 font-semibold"><Scissors className="w-4 h-4" /> Service Product</Label>
                    </div>
                </div>
                <div className="sm:col-span-2 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{form?.is_service ? 'Service Name' : 'Product Name'}</label>
                  <Input name="name" value={form?.name || ''} onChange={handleChange} required placeholder={form?.is_service ? "e.g. Haircut, Spa" : "Product Name"} className="h-11" />
                </div>
                <div className="sm:col-span-2 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <CategoryDropdown value={form?.category_id || ''} onValueChange={handleCategoryChange} placeholder="Select Category" />
                </div>
                
                <div className="sm:col-span-2 md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">SKU <span className="text-red-500">*</span></label>
                  </div>
                  <div className="flex gap-2 relative">
                    <div className="relative flex-1">
                      <Input 
                        name="sku" 
                        value={form?.sku || ''} 
                        onChange={handleChange} 
                        disabled={isEditing} 
                        placeholder="Enter unique SKU"
                        className={cn("h-11 pr-10 transition-colors", 
                          (skuStatus === 'taken' || skuStatus === 'error') && "border-red-500 focus-visible:ring-red-500",
                          skuStatus === 'available' && "border-green-500 focus-visible:ring-green-500"
                        )} 
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {skuStatus === 'checking' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                        {skuStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {(skuStatus === 'taken' || skuStatus === 'error') && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                    {!isEditing && (
                      <Button type="button" variant="outline" size="icon" onClick={generateSku} title="Auto-generate SKU" className="h-11 w-11 shrink-0">
                        <RefreshCw className={cn("w-4 h-4", skuStatus === 'checking' && "animate-spin")} />
                      </Button>
                    )}
                  </div>
                  {skuMessage && (
                    <p className={cn("text-xs mt-1 animate-in fade-in", 
                      (skuStatus === 'taken' || skuStatus === 'error') && "text-red-500",
                      skuStatus === 'available' && "text-green-600",
                      skuStatus === 'checking' && "text-blue-500"
                    )}>
                      {skuMessage}
                    </p>
                  )}
                </div>
                
                <div className={cn("sm:col-span-2 md:col-span-2", form?.is_service && "opacity-50")}>
                  <label className="block text-sm font-medium mb-1">Barcode (Main)</label>
                  <div className="flex gap-2">
                    <Input name="barcode" value={form?.barcode || ''} onChange={handleChange} disabled={form?.is_service} placeholder="Scan or enter barcode" className="h-11" />
                    <Button type="button" variant="outline" size="icon" onClick={() => handleScanClick('main')} title="Scan Barcode" disabled={form?.is_service} className="h-11 w-11 shrink-0 bg-blue-50 hover:bg-blue-100 border-blue-200">
                      <Camera className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" onClick={generateBarcode} title="Generate Barcode" disabled={form?.is_service} className="h-11 w-11 shrink-0 bg-purple-50 hover:bg-purple-100 border-purple-200">
                      <Barcode className="w-4 h-4 text-purple-600" />
                    </Button>
                  </div>
                </div>

                <div className="sm:col-span-2 md:col-span-2">
                    <label className="block text-sm font-medium mb-1">HSN Code {isWholesaler && <span className="text-red-500">*</span>}</label>
                    <Input
                        name="hsn_code"
                        value={form?.hsn_code || ''}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ''); 
                            setForm(s => ({ ...s, hsn_code: val }));
                        }}
                        placeholder="e.g. 1234"
                        className="h-11"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Harmonized System of Nomenclature code (Digits only)</p>
                </div>

                <div className="sm:col-span-2 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Cost {form?.is_service ? '(Approx)' : 'Price'}</label>
                  <Input name="cost_price" type="number" value={form?.cost_price || ''} onChange={handleChange} className="h-11" />
                </div>

                <div className="sm:col-span-2 md:col-span-4">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea name="description" value={form?.description || ''} onChange={handleChange} placeholder="Enter detailed description..." rows={3} className="resize-y" />
                </div>
                
                <div className="sm:col-span-2 md:col-span-4 space-y-2 border rounded-lg p-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium">Product Images ({(form?.images || []).length}/4)</label>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                        {(form?.images || []).map((url, index) => (
                            <div key={index} className="relative w-16 h-16 sm:w-20 sm:h-20 border rounded-lg overflow-hidden shrink-0 bg-slate-100 shadow-sm group">
                                <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-red-600 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Remove image"><X className="w-3 h-3" /></button>
                                {index === 0 && <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5">Main</div>}
                            </div>
                        ))}
                        {((form?.images || []).length) < 4 && (
                            <label className="relative w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors shrink-0">
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <><Upload className="w-5 h-5 text-slate-400 mb-1" /><span className="text-[9px] text-slate-500">Upload</span></>}
                                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                            </label>
                        )}
                    </div>
                </div>
            </div>
         </TabsContent>
         
         <TabsContent value="inventory" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="sm:col-span-2 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{form?.is_service ? 'Service Charge' : 'Selling Price'}</label>
                  <div className="flex gap-2">
                    <Input name="selling_price" type="number" value={form?.selling_price || ''} onChange={handleChange} required className="flex-1 h-11" />
                    <Popover open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" title="Open Calculator" className="shrink-0 h-11 w-11"><CalculatorIcon className="h-4 w-4 text-indigo-600" /></Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[90vw] max-w-[300px] sm:w-auto p-0 border-none shadow-xl" align="end" side="bottom">
                        <Calculator initialValue={form?.selling_price || 0} referencePrice={form?.cost_price || 0} onApply={handleCalculatorApply} onClose={() => setIsCalculatorOpen(false)} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="sm:col-span-2 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Wholesale Price (Optional)</label>
                  <Input name="wholesale_price" type="number" value={form?.wholesale_price || ''} onChange={handleChange} className="h-11" placeholder="Flat Rate" />
                </div>
                <div className="sm:col-span-2 md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                  <Input name="tax_rate" type="number" value={form?.tax_rate || ''} onChange={handleChange} className="h-11" />
                </div>
                
                {!(form?.is_service) && (form?.variants || []).length === 0 && (
                    <>
                        <div className="sm:col-span-2 md:col-span-2 flex flex-col gap-1">
                          <label className="block text-sm font-medium mb-1 flex items-center gap-2"><Scale className="w-4 h-4 text-muted-foreground" /> Unit Type</label>
                          <Select value={form?.unit || 'pcs'} onValueChange={(val) => handleSelectChange('unit', val)}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Select unit" /></SelectTrigger>
                            <SelectContent>{GROCERY_UNITS.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2 md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Stock Level</label>
                          <Input name="stock_level" type="number" value={form?.stock_level || ''} onChange={handleChange} className="h-11" />
                        </div>
                        <div className="sm:col-span-2 md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Low Stock Alert At</label>
                          <Input name="low_stock_threshold" type="number" value={form?.low_stock_threshold || ''} onChange={handleChange} className="h-11" />
                        </div>
                        <div className="sm:col-span-2 md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Expiry Date</label>
                          <Input name="expiry_date" type="date" value={form?.expiry_date || ''} onChange={handleChange} className="h-11" />
                        </div>
                    </>
                )}
                {!(form?.is_service) && (form?.variants || []).length > 0 && (
                    <div className="sm:col-span-2 md:col-span-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-100 flex items-center gap-2">
                        <BoxSelect className="w-4 h-4 shrink-0" /> <span className="flex-1">Stock is managed per variant. Total calculated stock: <strong>{form?.stock_level || 0}</strong></span>
                    </div>
                )}
             </div>
         </TabsContent>

         <TabsContent value="variants" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             {!(form?.is_service) ? (
                 <div className="border rounded-lg p-3 sm:p-4 bg-slate-50/50">
                     <h3 className="font-medium text-sm text-slate-700 mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-purple-600" /> Add Variants (Size, Color, etc.)</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3 items-end mb-4 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                         <div className="sm:col-span-2 lg:col-span-2">
                             <label className="text-xs font-medium mb-1 block">Option Name</label>
                             <Input placeholder="e.g. Red, XL" value={variantInput?.name || ''} onChange={e => setVariantInput(prev => ({...prev, name: e.target.value}))} className="h-11 sm:h-10 text-sm" />
                         </div>
                         <div className="sm:col-span-2 lg:col-span-2">
                             <label className="text-xs font-medium mb-1 block">Barcode</label>
                             <div className="flex gap-1">
                               <Input placeholder="Scan/Type" value={variantInput?.barcode || ''} onChange={e => setVariantInput(prev => ({...prev, barcode: e.target.value}))} className="h-11 sm:h-10 text-sm" />
                               <Button type="button" size="icon" variant="outline" className="h-11 w-11 sm:h-10 sm:w-10 shrink-0 bg-blue-50 hover:bg-blue-100 border-blue-200" onClick={() => handleScanClick('variant_add')} title="Scan Barcode"><Camera className="w-4 h-4 text-blue-600" /></Button>
                             </div>
                         </div>
                         <div className="sm:col-span-1 lg:col-span-1">
                             <label className="text-xs font-medium mb-1 block">Price</label>
                             <Input type="number" placeholder={form?.selling_price || '0'} value={variantInput?.price || ''} onChange={e => setVariantInput(prev => ({...prev, price: e.target.value}))} className="h-11 sm:h-10 text-sm" />
                         </div>
                         <div className="sm:col-span-1 lg:col-span-1">
                             <label className="text-xs font-medium mb-1 block">Stock</label>
                             <Input type="number" placeholder="0" value={variantInput?.stock || ''} onChange={e => setVariantInput(prev => ({...prev, stock: e.target.value}))} className="h-11 sm:h-10 text-sm" />
                         </div>
                         <div className="sm:col-span-1 lg:col-span-2">
                             <label className="text-xs font-medium mb-1 block">Batch No.</label>
                             <Input placeholder="e.g. BATCH001" value={variantInput?.batchNo || ''} onChange={e => setVariantInput(prev => ({...prev, batchNo: e.target.value}))} className="h-11 sm:h-10 text-sm" />
                         </div>
                         <div className="sm:col-span-1 lg:col-span-2">
                             <label className="text-xs font-medium mb-1 block">Expiry Date</label>
                             <Input type="date" value={variantInput?.expiryDate || ''} onChange={e => setVariantInput(prev => ({...prev, expiryDate: e.target.value}))} className="h-11 sm:h-10 text-sm" />
                         </div>
                         <div className="sm:col-span-2 md:col-span-4 lg:col-span-2 pt-2 lg:pt-0">
                             <Button type="button" onClick={addVariant} size="sm" className="h-11 sm:h-10 w-full bg-indigo-600 hover:bg-indigo-700">Add Variant</Button>
                         </div>
                     </div>
                     {Array.isArray(form?.variants) && form.variants.length > 0 ? (
                         <div className="border rounded-md overflow-hidden bg-white shadow-sm overflow-x-auto -mx-3 sm:mx-0">
                             <Table className="min-w-[600px]">
                                 <TableHeader>
                                     <TableRow className="bg-slate-50 hover:bg-slate-50">
                                         <TableHead className="py-2 h-9 text-xs min-w-[120px]">Name / SKU</TableHead>
                                         <TableHead className="py-2 h-9 text-xs min-w-[120px]">Barcode</TableHead>
                                         <TableHead className="py-2 h-9 text-xs min-w-[100px]">Batch No.</TableHead>
                                         <TableHead className="py-2 h-9 text-xs min-w-[80px]">Expiry</TableHead>
                                         <TableHead className="py-2 h-9 text-xs text-right min-w-[80px]">Price</TableHead>
                                         <TableHead className="py-2 h-9 text-xs text-right min-w-[60px]">Stock</TableHead>
                                         <TableHead className="py-2 h-9 w-20 text-right">Actions</TableHead>
                                     </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                     {form.variants.map((v) => (
                                         <TableRow key={v?.id} className="hover:bg-slate-50/50">
                                             <TableCell className="py-2"><div className="font-medium text-sm">{v?.name}</div><div className="text-[10px] text-muted-foreground">{v?.sku}</div></TableCell>
                                             <TableCell className="py-2 text-xs font-mono text-slate-600">{v?.barcode || <span className="text-slate-300 italic">No Barcode</span>}</TableCell>
                                             <TableCell className="py-2 text-xs font-mono text-slate-600">{v?.batchNo || <span className="text-slate-300 italic">N/A</span>}</TableCell>
                                             <TableCell className="py-2 text-xs font-mono text-slate-600">{v?.expiryDate ? formatExpiryDate(v.expiryDate) : <span className="text-slate-300 italic">N/A</span>}</TableCell>
                                             <TableCell className="py-2 text-right">{formatPrice(v?.price)}</TableCell>
                                             <TableCell className="py-2 text-right"><span className={cn("px-1.5 py-0.5 rounded text-xs", (v?.stock || 0) > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{v?.stock || 0}</span></TableCell>
                                             <TableCell className="py-2 text-right">
                                                 <div className="flex items-center justify-end gap-2 sm:gap-1">
                                                     <button type="button" onClick={() => openEditVariant(v)} className="text-slate-400 hover:text-blue-600 transition-colors p-2 sm:p-1.5 rounded-full hover:bg-blue-50" title="Edit Variant"><Edit className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                                                     <button type="button" onClick={() => removeVariant(v?.id)} className="text-slate-400 hover:text-red-600 transition-colors p-2 sm:p-1.5 rounded-full hover:bg-red-50" title="Delete Variant"><Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                                                 </div>
                                             </TableCell>
                                         </TableRow>
                                     ))}
                                 </TableBody>
                             </Table>
                         </div>
                     ) : (
                         <div className="text-center py-8 text-sm text-muted-foreground bg-white border border-dashed rounded-md"><p>No variants added. This product will be sold as a single item.</p></div>
                     )}
                 </div>
             ) : (
                 <div className="p-8 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed"><Scissors className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Service products do not support inventory variants.</p></div>
             )}

             <div className="border rounded-lg p-4 bg-white shadow-sm mt-4">
                 <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Settings2 className="w-4 h-4 text-indigo-600" /> Product Settings</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                     <div className="flex items-center space-x-3 border p-3 sm:p-3 rounded-lg">
                       <Checkbox id="is_visible_online" className="h-5 w-5 sm:h-4 sm:w-4" checked={form?.is_visible_online || false} onCheckedChange={(checked) => handleCheckboxChange('is_visible_online', checked)} />
                       <label htmlFor="is_visible_online" className="text-sm font-medium flex items-center gap-2 cursor-pointer flex-1 py-1"><Globe className="w-4 h-4 text-indigo-500" /> Visible on Digital Shop</label>
                     </div>
                     <div className="flex items-center space-x-3 border p-3 sm:p-3 rounded-lg">
                       <Checkbox id="allow_price_change" className="h-5 w-5 sm:h-4 sm:w-4" checked={form?.allow_price_change || false} onCheckedChange={(checked) => handleCheckboxChange('allow_price_change', checked)} />
                       <label htmlFor="allow_price_change" className="text-sm font-medium cursor-pointer flex-1 py-1">Allow manual price change</label>
                     </div>
                     <div className="flex items-center space-x-3 border p-3 sm:p-3 rounded-lg">
                       <Checkbox id="allow_quantity_change" className="h-5 w-5 sm:h-4 sm:w-4" checked={form?.allow_quantity_change || false} onCheckedChange={(checked) => handleCheckboxChange('allow_quantity_change', checked)} />
                       <label htmlFor="allow_quantity_change" className="text-sm font-medium cursor-pointer flex-1 py-1">Allow Quantity Change</label>
                     </div>
                 </div>
             </div>
         </TabsContent>
         
         <TabsContent value="marketing" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="space-y-4 border-t pt-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Search Keywords</label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white min-h-[44px]">
                        {(form?.search_keywords || []).map(k => <span key={k} className="bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">{k}<button type="button" onClick={() => removeKeyword(k)} className="hover:text-red-500 rounded-full p-1"><X className="w-3 h-3" /></button></span>)}
                        <input type="text" value={keywordInput || ''} onChange={e => setKeywordInput(e.target.value)} onKeyDown={handleKeywordKeyDown} placeholder="Add keyword... (Press Enter)" className="flex-1 outline-none text-sm min-w-[150px] bg-transparent h-8" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-800">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-amber-700"><Award className="w-4 h-4" /> Loyalty Rewards</h4>
                        <div>
                            <label className="block text-xs font-medium mb-1">Points earned per unit</label>
                            <Input type="number" value={form?.loyalty_points || ''} onChange={(e) => setForm(s => ({...s, loyalty_points: e.target.value}))} placeholder="e.g. 10" className="bg-white h-11" />
                        </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-indigo-700"><Tag className="w-4 h-4" /> Promotion Tags</h4>
                        <div className="flex flex-wrap gap-2">
                            {['New', 'Best Seller', 'Sale', 'Limited Edition'].map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => togglePromotionTag(tag)}
                                    className={cn(
                                        "px-3 py-1.5 sm:py-1 rounded-full text-xs font-medium transition-colors border",
                                        (form?.promotion_tags || []).includes(tag) 
                                            ? "bg-indigo-600 text-white border-indigo-600" 
                                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><Percent className="w-4 h-4 text-emerald-600" /> Active Offer/Discount</h4>
                        <Switch checked={form?.is_offer_active || false} onCheckedChange={(checked) => handleCheckboxChange('is_offer_active', checked)} />
                    </div>
                    
                    {form?.is_offer_active && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-1">Offer Name</label>
                                <Input name="offer_name" value={form?.offer_name || ''} onChange={handleChange} placeholder="e.g. Summer Sale 20%" className="h-11 sm:h-10" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Discount Type</label>
                                <Select value={form?.discount_type || 'percentage'} onValueChange={(val) => handleSelectChange('discount_type', val)}>
                                    <SelectTrigger className="h-11 sm:h-10"><SelectValue placeholder="Type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Discount Value</label>
                                <Input name="discount_value" type="number" value={form?.discount_value || ''} onChange={handleChange} className="h-11 sm:h-10" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Start Date</label>
                                <Input name="offer_start_date" type="datetime-local" value={form?.offer_start_date || ''} onChange={handleChange} className="h-11 sm:h-10" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">End Date</label>
                                <Input name="offer_end_date" type="datetime-local" value={form?.offer_end_date || ''} onChange={handleChange} className="h-11 sm:h-10" />
                            </div>
                            <div className="md:col-span-2 bg-slate-50 p-3 rounded text-sm text-slate-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-indigo-500" />
                                Final Selling Price will be: <strong className="text-indigo-700">{formatPrice(calculateDiscountedPrice())}</strong>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-blue-600" /> Bulk Pricing Tiers (Optional)</h4>
                    <p className="text-xs text-muted-foreground mb-3">Set automatic discounts when customers buy in larger quantities.</p>
                    
                    <div className="grid grid-cols-5 gap-2 mb-4">
                        <div className="col-span-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500">Min. Qty</label>
                            <Input type="number" value={newTier?.min_quantity || ''} onChange={(e) => setNewTier(prev => ({...prev, min_quantity: e.target.value}))} placeholder="e.g. 10" className="h-11 sm:h-9 text-sm" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500">Discount %</label>
                            <Input type="number" value={newTier?.discount_percent || ''} onChange={(e) => setNewTier(prev => ({...prev, discount_percent: e.target.value}))} placeholder="e.g. 5" className="h-11 sm:h-9 text-sm" />
                        </div>
                        <div className="flex items-end">
                            <Button type="button" onClick={addBulkTier} className="h-11 sm:h-9 w-full" variant="secondary"><Plus className="w-4 h-4" /></Button>
                        </div>
                    </div>
                    
                    {Array.isArray(form?.bulk_pricing_tiers) && form.bulk_pricing_tiers.length > 0 && (
                        <div className="space-y-2">
                            {form.bulk_pricing_tiers.map((tier, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 sm:p-2 rounded border border-slate-100 text-sm">
                                    <span>Buy <strong>{tier?.min_quantity || 0}+</strong> items</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-600 font-medium">{tier?.discount_percent || 0}% OFF</span>
                                        <button type="button" onClick={() => removeBulkTier(idx)} className="text-red-500 hover:bg-red-50 p-2 sm:p-1 rounded"><Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>
         </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-2 pt-2"> 
        <DialogClose asChild><Button variant="outline" className="w-full sm:w-auto h-12 sm:h-11 px-6">Cancel</Button></DialogClose>
        <Button 
          type="submit" 
          disabled={submitting || skuStatus === 'checking' || skuStatus === 'taken' || skuStatus === 'error'} 
          className="w-full sm:w-auto h-12 sm:h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {submitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Product" : "Create Product")}
        </Button>
      </div>
    </form>
  );
};

export default InlineProductForm;