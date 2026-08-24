import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Search, MoreVertical, FileDown, FileUp, X, Barcode, ChevronDown, ChevronUp, Image as ImageIcon, Zap, Copy, Info, Calculator as CalculatorIcon, UploadCloud, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatPrice, getPriceForQuantity, calculateDiscountPercentage } from '@/lib/utils';
import { useProducts } from '@/hooks/useProducts';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import ImageZoom from '@/components/ImageZoom';
import Calculator from '@/components/ui/calculator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MultiImageUploader from './MultiImageUploader';
import VariantBarcodeManager from './VariantBarcodeManager';
import VariantStockDisplay from '@/components/pos/VariantStockDisplay';

const ProductForm = ({ product, onSave, onCancel, categories, brands }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    specifications: '',
    stock: 0,
    min_order_quantity: 1,
    image_url: '', 
    images: [],
    unit: 'pcs',
    category_id: null,
    brand_id: null,
    pricing_tiers: [{ min_quantity: 1, price: 0, mrp: 0 }],
    wholesale_price: '',
    variants: [],
    barcodes: [],
    is_disabled: false,
  });
  
  const [activeTab, setActiveTab] = useState("general");
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [variantImageFiles, setVariantImageFiles] = useState({});
  const [isUploadingVariantImages, setIsUploadingVariantImages] = useState(false);
  const { user } = useAuth();
  const [openCalculator, setOpenCalculator] = useState(null);

  useEffect(() => {
    if (product) {
      let initialImages = product.images || [];
      if (initialImages.length === 0 && product.image_url) {
        initialImages = [product.image_url];
      }

      setFormData({
        id: product.id || undefined,
        name: product.name || '',
        description: product.description || '',
        specifications: product.specifications || '',
        stock: product.stock || 0,
        min_order_quantity: product.min_order_quantity || 1,
        image_url: product.image_url || '',
        images: initialImages,
        unit: product.unit || 'pcs',
        category_id: product.category_id || null,
        brand_id: product.brand_id || null,
        pricing_tiers: product.pricing_tiers?.length > 0 ? product.pricing_tiers : [{ min_quantity: 1, price: 0, mrp: 0 }],
        wholesale_price: product.wholesale_price || '',
        variants: product.variants || [],
        barcodes: product.barcodes || [],
        is_disabled: product.is_disabled || false,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        specifications: '',
        stock: 0,
        min_order_quantity: 1,
        image_url: '',
        images: [],
        unit: 'pcs',
        category_id: null,
        brand_id: null,
        pricing_tiers: [{ min_quantity: 1, price: 0, mrp: 0 }],
        wholesale_price: '',
        variants: [],
        barcodes: [],
        is_disabled: false,
      });
    }
  }, [product]);

  const handleImagesChange = useCallback(({ urls, isUploading }) => {
    setIsUploadingImages(isUploading);
    setFormData(prev => ({
      ...prev,
      images: urls,
      image_url: urls.length > 0 ? urls[0] : ''
    }));
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleTierChange = (index, e) => {
    const { name, value } = e.target;
    const newTiers = [...formData.pricing_tiers];
    newTiers[index][name] = value;
    setFormData(prev => ({ ...prev, pricing_tiers: newTiers }));
  };
  
  const handleCalculatorApply = (index, field, value) => {
    const newTiers = [...formData.pricing_tiers];
    newTiers[index][field] = value;
    setFormData(prev => ({ ...prev, pricing_tiers: newTiers }));
    setOpenCalculator(null);
  };

  const addTier = () => {
    setFormData(prev => ({ ...prev, pricing_tiers: [...prev.pricing_tiers, { min_quantity: 0, price: 0, mrp: 0 }] }));
  };

  const removeTier = (index) => {
    if (formData.pricing_tiers.length > 1) {
      const newTiers = formData.pricing_tiers.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, pricing_tiers: newTiers }));
    }
  };

  const handleVariantChange = (index, e) => {
    const { name, value } = e.target;
    const newVariants = [...formData.variants];
    newVariants[index][name] = value;
    
    if (name === 'stock') {
      const totalVariantStock = newVariants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
      setFormData(prev => ({ ...prev, variants: newVariants, stock: totalVariantStock }));
    } else {
      setFormData(prev => ({ ...prev, variants: newVariants }));
    }
  };

  const addVariant = () => {
    setFormData(prev => ({ ...prev, variants: [...prev.variants, { name: '', stock: 0, image_url: '', barcode: '' }] }));
  };

  const removeVariant = (index) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    const newVariantImageFiles = { ...variantImageFiles };
    delete newVariantImageFiles[index];
    
    const totalVariantStock = newVariants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
    
    setFormData(prev => ({ ...prev, variants: newVariants, stock: totalVariantStock }));
    setVariantImageFiles(newVariantImageFiles);
  };

  const handleBarcodeChange = (index, value) => {
    const newBarcodes = [...formData.barcodes];
    newBarcodes[index] = value;
    setFormData(prev => ({ ...prev, barcodes: newBarcodes }));
  };
  
  const addBarcode = () => {
    setFormData(prev => ({ ...prev, barcodes: [...(prev.barcodes || []), ''] }));
  };

  const removeBarcode = (index) => {
    const newBarcodes = formData.barcodes.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, barcodes: newBarcodes }));
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBarcode();
      setTimeout(() => {
        const barcodeInputs = e.target.form.querySelectorAll('input[placeholder="Enter barcode"]');
        if (barcodeInputs.length > 0) {
          barcodeInputs[barcodeInputs.length - 1].focus();
        }
      }, 0);
    }
  };

  const handleVariantImageUpload = async (file) => {
    if (!file) return null;
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) {
      toast({ title: "Variant Image Upload Error", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleVariantManagerChange = (updatedVariants) => {
    const totalVariantStock = updatedVariants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
    setFormData(prev => ({ ...prev, variants: updatedVariants, stock: totalVariantStock }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isUploadingImages) {
      toast({ title: "Please wait", description: "Images are still uploading.", variant: "warning" });
      return;
    }

    setIsUploadingVariantImages(true);
    const updatedVariants = await Promise.all(formData.variants.map(async (variant, index) => {
      let variantImageUrl = variant.image_url;
      if (variantImageFiles[index]) {
        variantImageUrl = await handleVariantImageUpload(variantImageFiles[index]);
      }
      return { ...variant, image_url: variantImageUrl };
    }));
    setIsUploadingVariantImages(false);

    const payload = {
      ...formData,
      seller_id: user.id,
      wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
      variants: updatedVariants,
    };

    onSave(payload, product);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-4 pr-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="general">General Details</TabsTrigger>
          <TabsTrigger value="variants">
            Variants & Barcodes
            {formData.variants.length > 0 && <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full" variant="secondary">{formData.variants.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleFormChange} required />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" name="unit" value={formData.unit} onChange={handleFormChange} placeholder="e.g., pcs, kg, box" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="category_id">Category</Label>
                <SearchableSelect
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={formData.category_id}
                  onChange={value => setFormData(prev => ({ ...prev, category_id: value }))}
                  placeholder="Select a category"
                />
              </div>
              <div>
                <Label htmlFor="brand_id">Brand</Label>
                <SearchableSelect
                  options={brands.map(b => ({ value: b.id, label: b.name }))}
                  value={formData.brand_id}
                  onChange={value => setFormData(prev => ({ ...prev, brand_id: value }))}
                  placeholder="Select a brand"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleFormChange} />
            </div>
            <div>
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea id="specifications" name="specifications" value={formData.specifications} onChange={handleFormChange} placeholder="e.g., Size: XL, Color: Red, Material: Cotton"/>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="is_disabled" name="is_disabled" checked={formData.is_disabled} onCheckedChange={(checked) => setFormData(prev => ({...prev, is_disabled: checked}))}/>
                <Label htmlFor="is_disabled">Disable Product</Label>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Product Images</Label>
              <MultiImageUploader 
                initialImages={formData.images}
                onImagesChange={handleImagesChange}
                userId={user?.id}
              />
              <p className="text-xs text-muted-foreground mt-1">The first image will be used as the primary display image.</p>
            </div>

            <div>
              <Label>Pricing Configuration</Label>
              <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase mb-2 block">Retail Tiers</Label>
                  <div className="space-y-2">
                    {formData.pricing_tiers.map((tier, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Input type="number" name="min_quantity" value={tier.min_quantity} onChange={(e) => handleTierChange(index, e)} placeholder="Min Qty" className="w-full sm:w-24" />
                        <div className="flex-1 flex items-center gap-1">
                          <Input type="number" step="0.01" name="price" value={tier.price} onChange={(e) => handleTierChange(index, e)} placeholder="Retail Price" className="flex-1" />
                        </div>
                        <div className="flex-1 flex items-center gap-1">
                          <Input type="number" step="0.01" name="mrp" value={tier.mrp} onChange={(e) => handleTierChange(index, e)} placeholder="MRP" className="flex-1" />
                        </div>
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeTier(index)} disabled={formData.pricing_tiers.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addTier} className="mt-2">Add Retail Tier</Button>
                </div>
                
                <div className="pt-2 border-t mt-2">
                  <Label htmlFor="wholesale_price" className="text-xs text-muted-foreground uppercase mb-2 block">Wholesale Pricing (Optional)</Label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <Input 
                      id="wholesale_price" 
                      name="wholesale_price" 
                      type="number" 
                      step="0.01" 
                      value={formData.wholesale_price} 
                      onChange={handleFormChange} 
                      placeholder="Flat Wholesale Rate" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Main Product Barcodes</Label>
              <div className="space-y-2">
                {formData.barcodes && formData.barcodes.map((barcode, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={barcode} onChange={(e) => handleBarcodeChange(index, e.target.value)} onKeyDown={handleBarcodeKeyDown} placeholder="Enter barcode" />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeBarcode(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addBarcode} className="mt-2">Add Barcode</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="stock">Total Stock</Label>
                <Input 
                  id="stock" 
                  name="stock" 
                  type="number" 
                  value={formData.stock} 
                  onChange={handleFormChange} 
                  required 
                  disabled={formData.variants.length > 0} 
                  className={formData.variants.length > 0 ? "bg-slate-100 text-slate-500" : ""}
                />
                {formData.variants.length > 0 && <p className="text-xs text-muted-foreground mt-1">Calculated from variants</p>}
              </div>
              <div>
                <Label htmlFor="min_order_quantity">Min Order Quantity</Label>
                <Input id="min_order_quantity" name="min_order_quantity" type="number" value={formData.min_order_quantity} onChange={handleFormChange} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variants" className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Variants Configuration</Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}><Plus className="mr-2 h-4 w-4"/> Add Variant</Button>
              </div>
              
              <div className="space-y-4 mb-8">
                {formData.variants.map((variant, index) => (
                  <div key={index} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input name="name" value={variant.name} onChange={(e) => handleVariantChange(index, e)} placeholder="Variant Name (e.g., Red, XL)" className="flex-1" />
                      <Input type="number" name="stock" value={variant.stock} onChange={(e) => handleVariantChange(index, e)} placeholder="Stock" className="w-full sm:w-24" />
                      <Input type="number" name="price" value={variant.price || ''} onChange={(e) => handleVariantChange(index, e)} placeholder="Price (Opt)" className="w-full sm:w-24" />
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeVariant(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {variant.image_url && <img src={variant.image_url} alt={variant.name} className="w-16 h-16 object-cover rounded-md" />}
                      <div className="flex-1 min-w-[200px]">
                        <Label htmlFor={`variant-image-${index}`} className="text-xs">Variant Image</Label>
                        <Input id={`variant-image-${index}`} type="file" onChange={(e) => setVariantImageFiles(prev => ({...prev, [index]: e.target.files[0]}))} className="max-w-xs h-8 text-xs" />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.variants.length === 0 && (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-md border border-dashed">
                    No variants added yet.
                  </div>
                )}
              </div>

              {formData.variants.length > 0 && (
                <div className="mt-8 border-t pt-6">
                  <VariantBarcodeManager 
                    variants={formData.variants} 
                    onChange={handleVariantManagerChange}
                  />
                </div>
              )}
              
              <div className="mt-6">
                <Label className="mb-2 block">Variant Stock Overview</Label>
                <VariantStockDisplay variants={formData.variants} />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <DialogFooter className="sticky bottom-0 bg-background/95 py-3 flex-col sm:flex-row gap-2 border-t mt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isUploadingImages || isUploadingVariantImages}>
          {(isUploadingImages || isUploadingVariantImages) ? "Uploading..." : "Save Product"}
        </Button>
      </DialogFooter>
    </form>
  );
};

const SearchableSelect = ({ options, value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(() => options.find(opt => opt.value === value)?.label, [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const { user } = useAuth();
  const { updateProduct, createProduct, deleteProduct, toggleSplashSale, toggleProductStatus } = useProducts();
  const isAdmin = user?.profile?.role === 'admin';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    
    let query = supabase.from('products').select(`
      *,
      categories(id, name),
      brands(id, name)
    `);
    
    if (!isAdmin) {
      query = query.eq('seller_id', user.id);
    }
    
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error fetching products", description: error.message, variant: "destructive" });
    } else {
      setProducts(data);
    }
    setLoading(false);
  }, [user, isAdmin]);
  
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (statusFilter === 'enabled') {
      filtered = filtered.filter(p => !p.is_disabled);
    } else if (statusFilter === 'disabled') {
      filtered = filtered.filter(p => p.is_disabled);
    }

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lowercasedTerm) ||
        (p.categories?.name || '').toLowerCase().includes(lowercasedTerm) ||
        (p.brands?.name || '').toLowerCase().includes(lowercasedTerm)
      );
    }

    return filtered;
  }, [products, searchTerm, statusFilter]);

  const fetchMeta = useCallback(async () => {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('seller_id', user.id);
      
    if (categoriesError) toast({ title: "Error fetching categories", description: categoriesError.message, variant: "destructive" });
    else setCategories(categoriesData);

    const { data: brandsData, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('seller_id', user.id);

    if (brandsError) toast({ title: "Error fetching brands", description: brandsError.message, variant: "destructive" });
    else setBrands(brandsData);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchMeta();
    }
  }, [user, fetchProducts, fetchMeta]);

  const handleSaveProduct = async (productData, originalProduct = null) => {
    const isEditing = !!productData.id;

    const { categories: categoriesData, brands: brandsData, ...payload } = productData;
    
    const processedPayload = {
      ...payload,
      pricing_tiers: payload.pricing_tiers.map(tier => ({
        min_quantity: Number(tier.min_quantity) || 0,
        price: Number(tier.price) || 0,
        mrp: Number(tier.mrp) || 0,
      })),
    };

    if (isEditing) {
      const { data: savedProduct, error } = await updateProduct(productData.id, processedPayload, originalProduct);

      if (error) {
        console.error("Update Product Error:", error);
        
        const errorMessage = error.userFriendly 
          ? error.message 
          : "Failed to update product. Please try again.";
        
        toast({ 
          title: "Error updating product", 
          description: errorMessage, 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Product updated successfully" });
        setIsFormOpen(false);
        setEditingProduct(null);
        fetchProducts();
      }
    } else {
      delete processedPayload.id;
      
      const { data: savedProduct, error } = await createProduct(processedPayload);

      if (error) {
        console.error("Create Product Error:", error);
        toast({ title: "Error creating product", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Product created successfully" });
        setIsFormOpen(false);
        setEditingProduct(null);
        fetchProducts();
      }
    }
  };

  const handleCopyProduct = (product) => {
    const { id, created_at, updated_at, ...copiedProductData } = product;
    const newProduct = {
      ...copiedProductData,
      name: `${product.name} (Copy)`,
      is_splash_sale: false,
    };
    setEditingProduct(newProduct);
    setIsFormOpen(true);
  };
  
  const handleToggleSplashSale = async (product) => {
    const { data: newStatus, error } = await toggleSplashSale(product.id, product.is_splash_sale);
    
    if (error) {
      toast({ title: "Error updating product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Product ${newStatus ? 'added to' : 'removed from'} Splash Sale` });
      fetchProducts();
    }
  };

  const handleToggleDisableProduct = async (product) => {
    const { data: newStatus, error } = await toggleProductStatus(product.id, product.is_disabled);
    
    if (error) {
      toast({ title: "Error updating product status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Product ${newStatus ? 'disabled' : 'enabled'} successfully` });
      fetchProducts();
    }
  };

  const handleDeleteProduct = async (productId) => {
    const { error } = await deleteProduct(productId);
    
    if (error) {
      toast({ title: "Error deleting product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product deleted successfully" });
      fetchProducts();
    }
    setShowDeleteConfirm(null);
  };
  
  const handleBulkUpload = async () => {
    if (!importFile) {
      toast({ title: "No file selected", description: "Please select a CSV file to import.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    const { data: fileContent, error: readFileError } = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ data: e.target.result, error: null });
      reader.onerror = (e) => resolve({ data: null, error: e.target.error });
      reader.readAsText(importFile);
    });

    if (readFileError) {
      toast({ title: "Error reading file", description: readFileError.message, variant: "destructive" });
      setIsImporting(false);
      return;
    }
    
    const lines = fileContent.split('\n').slice(1); 
    const productsToInsert = [];
    
    for(const line of lines) {
      if(!line.trim()) continue;

      const [name, description, stock, min_order_quantity, unit, categoryName, brandName, price, mrp, barcodes] = line.split(',').map(s => s.trim());
      
      let category_id = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())?.id;
      if(!category_id && categoryName) {
        const { data: newCategory, error } = await supabase.from('categories').insert({ name: categoryName, seller_id: user.id }).select().single();
        if(error) { console.error(`Failed to create category ${categoryName}`); continue; }
        category_id = newCategory.id;
        setCategories(prev => [...prev, newCategory]);
      }

      let brand_id = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase())?.id;
      if(!brand_id && brandName) {
        const { data: newBrand, error } = await supabase.from('brands').insert({ name: brandName, seller_id: user.id }).select().single();
        if(error) { console.error(`Failed to create brand ${brandName}`); continue; }
        brand_id = newBrand.id;
        setBrands(prev => [...prev, newBrand]);
      }

      productsToInsert.push({
        name,
        description,
        stock: parseInt(stock) || 0,
        min_order_quantity: parseInt(min_order_quantity) || 1,
        unit,
        category_id,
        brand_id,
        seller_id: user.id,
        pricing_tiers: [{ min_quantity: 1, price: parseFloat(price) || 0, mrp: parseFloat(mrp) || 0 }],
        barcodes: barcodes ? barcodes.split(';').map(s => s.trim()) : [],
      });
    }

    if(productsToInsert.length > 0) {
      const { error } = await supabase.from('products').insert(productsToInsert);
      if(error) {
        toast({ title: "Error importing products", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Import Successful", description: `${productsToInsert.length} products imported.` });
        fetchProducts();
      }
    }

    setIsImporting(false);
    setShowImportDialog(false);
    setImportFile(null);
  };

  const handleExport = () => {
    const csvHeader = "Name,Description,Stock,Min Order Quantity,Unit,Category,Brand,Price,MRP,Barcodes\n";
    const csvRows = products.map(p => {
      const price = p.pricing_tiers?.[0]?.price || 0;
      const mrp = p.pricing_tiers?.[0]?.mrp || 0;
      const barcodes = p.barcodes?.join(';') || '';
      return `"${p.name}","${p.description}",${p.stock},${p.min_order_quantity},${p.unit},${p.categories?.name || ''},${p.brands?.name || ''},${price},${mrp},"${barcodes}"`;
    }).join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'products.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.4,
        ease: "easeOut"
      },
    }),
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Product Management</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }} className="w-full sm:w-auto flex-1 sm:flex-none">
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="sm:hidden">
                    Actions <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setShowImportDialog(true)}><FileUp className="mr-2 h-4 w-4" />Import CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}><FileDown className="mr-2 h-4 w-4" />Export CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowImportDialog(true)}><FileUp className="mr-2 h-4 w-4" />Import CSV</Button>
                <Button variant="outline" onClick={handleExport}><FileDown className="mr-2 h-4 w-4" /> Export</Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 mt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="enabled">Enabled</TabsTrigger>
                <TabsTrigger value="disabled">Disabled</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div></div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {filteredProducts.map((product, index) => {
                  const priceInfo = getPriceForQuantity(product, product.min_order_quantity || 1);
                  const displayPrice = priceInfo ? priceInfo.price : null;
                  const displayMrp = priceInfo ? priceInfo.mrp : null;
                  const discount = calculateDiscountPercentage(displayMrp, displayPrice);

                  return (
                    <motion.div
                      key={product.id}
                      layout="position"
                      custom={index}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      <Card className={`glass-effect card-hover h-full flex flex-col group transition-all duration-300 ${product.is_disabled ? 'opacity-50 bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                        <div className="p-3">
                          <div className="aspect-square bg-white dark:bg-slate-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={product.image_url || 'placeholder'}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="w-full h-full"
                              >
                                {product.image_url ? (
                                  <ImageZoom 
                                    alt={product.name} 
                                    className="w-full h-full object-cover" 
                                    src={product.image_url}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <ImageIcon size={40}/>
                                  </div>
                                )}
                              </motion.div>
                            </AnimatePresence>
                            {discount > 0 && (
                              <div className="absolute top-1 left-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                                {discount}% OFF
                              </div>
                            )}
                            <div className="absolute top-1 right-1 z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full bg-black/30 hover:bg-black/50 border-none text-white">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCopyProduct(product)}>
                                    <Copy className="mr-2 h-4 w-4" /> Copy
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleSplashSale(product)}>
                                    <Zap className="mr-2 h-4 w-4" /> 
                                    {product.is_splash_sale ? 'Remove from Sale' : 'Add to Splash Sale'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleDisableProduct(product)}>
                                    {product.is_disabled ? (
                                      <><Eye className="mr-2 h-4 w-4" /> Enable Product</>
                                    ) : (
                                      <><EyeOff className="mr-2 h-4 w-4" /> Disable Product</>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setShowDeleteConfirm(product.id)} className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/50">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:gradient-text transition-colors flex-1 pr-2 truncate">{product.name}</h3>
                            <div className="text-right flex-shrink-0">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="cursor-pointer">
                                    <span className="text-sm md:text-base font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap flex items-center">
                                      {displayPrice !== null ? formatPrice(displayPrice) : 'N/A'}
                                      <Info size={10} className="ml-0.5 text-slate-400" />
                                    </span>
                                    {displayMrp && displayPrice !== null && displayMrp > displayPrice && (
                                      <span className="text-xs text-slate-500 dark:text-slate-400 line-through ml-0.5">
                                        {formatPrice(displayMrp)}
                                      </span>
                                    )}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 text-xs">
                                  <div className="space-y-1">
                                    <p className="font-bold text-sm">Pricing Tiers</p>
                                    {product.pricing_tiers && product.pricing_tiers.length > 0 ? (
                                      <ul className="text-xs space-y-0.5">
                                        {product.pricing_tiers.map((tier, i) => (
                                          <li key={i} className="flex justify-between">
                                            <span>Qty: {tier.min_quantity}+</span>
                                            <span className="font-semibold">{formatPrice(tier.price)}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-slate-500">No pricing tiers available.</p>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <Badge variant="outline">{product.categories?.name || 'Uncategorized'}</Badge>
                            <Badge variant="secondary">{product.brands?.name || 'Unbranded'}</Badge>
                          </div>
                        </div>
                        
                        <CardContent className="space-y-2 flex-grow flex flex-col justify-end p-3 pt-0 mt-auto">
                          <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div><strong className="block font-medium text-slate-500">Stock</strong> {product.stock} {product.unit}</div>
                            <div><strong className="block font-medium text-slate-500">Min. Order</strong> {product.min_order_quantity} {product.unit}</div>
                            <div>
                              <strong className="block font-medium text-slate-500">Splash Sale</strong> 
                              <span className={`px-2 py-0.5 rounded-full text-xs ${product.is_splash_sale ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                {product.is_splash_sale ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div>
                              <strong className="block font-medium text-slate-500">Status</strong>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${product.is_disabled ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                {product.is_disabled ? 'Disabled' : 'Active'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
          {filteredProducts.length === 0 && !loading && <p className="text-center py-16 text-slate-500 col-span-full">No products found. Try adjusting your search.</p>}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) { setEditingProduct(null); setIsFormOpen(false); } else { setIsFormOpen(true); }}}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? (editingProduct.id ? "Edit Product" : "Copy Product") : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <ProductForm
              product={editingProduct}
              onSave={handleSaveProduct}
              onCancel={() => { setIsFormOpen(false); setEditingProduct(null); }}
              categories={categories}
              brands={brands}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm !== null} onOpenChange={(isOpen) => !isOpen && setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteProduct(showDeleteConfirm)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Import Products from CSV</DialogTitle>
            <DialogDescription className="break-words">
              Upload a CSV file with product data. The format should be: <br/>
              <code className="text-sm bg-gray-100 dark:bg-gray-800 p-1 rounded-md block mt-1 whitespace-normal">name,description,stock,min_order_quantity,unit,categoryName,brandName,price,mrp,barcodes(separated by ;)</code>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Label htmlFor="import-file">CSV File</Label>
            <Input id="import-file" type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files[0])} />
            <a href="/product_template.csv" download className="text-sm text-blue-500 hover:underline">Download template.csv</a>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={isImporting}>{isImporting ? 'Importing...' : 'Import Products'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
};

export default ProductManagement;
