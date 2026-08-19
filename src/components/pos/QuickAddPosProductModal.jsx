import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle2, RefreshCw, Camera, X, Sparkles, Search, AlertCircle } from "lucide-react";
import JsBarcode from 'jsbarcode';
import BarcodeScanner from './BarcodeScanner';
import ImageUploadField from './ImageUploadField';
import BarcodeProductPreview from './BarcodeProductPreview';
import { uploadProductImages } from '@/lib/imageUploadUtils';
import { useBarcodeProductSearch } from '@/hooks/useBarcodeProductSearch';
import { validateBarcode } from '@/lib/barcodeValidation';
import { generateUniqueSku } from '@/lib/skuGenerator';
import { cn } from '@/lib/utils';

const toTitleCase = (str) => {
    if (!str) return "";
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

const QuickAddPosProductModal = ({ open, onOpenChange, onProductAdded, posUserId }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    
    const [formData, setFormData] = useState({
        name: '',
        barcode: '',
        hsn_code: '',
        category: '',
        selling_price: '',
        cost_price: '',
        current_stocks: '',
        tax_rate: '0',
        sku: '',
        allow_quantity_change: false,
        unit: 'pcs'
    });

    const [autoFilledFields, setAutoFilledFields] = useState({
        name: false,
        category: false,
        selling_price: false,
        sku: false
    });

    const [imageFile1, setImageFile1] = useState(null);
    const [imageFile2, setImageFile2] = useState(null);
    const [autoFilledImages, setAutoFilledImages] = useState({ url1: null, url2: null });

    const [errors, setErrors] = useState({});
    const [showScanner, setShowScanner] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    
    const barcodeInputRef = useRef(null);
    const nameInputRef = useRef(null);

    const { 
        product: foundProduct, 
        loading: searchingBarcode, 
        error: searchError,
        searchBarcode 
    } = useBarcodeProductSearch(formData.barcode);

    const resetForm = useCallback(async () => {
        let newSku = '';
        if (posUserId) {
            newSku = await generateUniqueSku('', posUserId);
        }
        
        setFormData({
            name: '',
            barcode: '',
            hsn_code: '',
            category: '',
            selling_price: '',
            cost_price: '',
            current_stocks: '',
            tax_rate: '0',
            sku: newSku,
            allow_quantity_change: false,
            unit: 'pcs'
        });
        setImageFile1(null);
        setImageFile2(null);
        setAutoFilledImages({ url1: null, url2: null });
        setAutoFilledFields({ name: false, category: false, selling_price: false, sku: !!newSku });
        setErrors({});
        setShowScanner(false);
        setShowPreview(false);
        
        setTimeout(() => {
            if (barcodeInputRef.current) {
                barcodeInputRef.current.focus();
            }
        }, 100);
    }, [posUserId]);

    useEffect(() => {
        if (open && posUserId) {
            const fetchCategories = async () => {
                try {
                    const { data, error } = await supabase
                        .from('categories')
                        .select('id, name')
                        .or(`seller_id.eq.${posUserId},seller_id.is.null`)
                        .order('name');
                    
                    if (error) throw error;
                    setCategories(data || []);
                } catch (err) {
                    console.error("Error fetching categories:", err);
                }
            };
            fetchCategories();
            resetForm();
        }
    }, [open, posUserId, resetForm]);

    useEffect(() => {
        if (formData.barcode) {
            try {
                const canvas = document.getElementById("barcode-preview");
                if (canvas) {
                    JsBarcode("#barcode-preview", formData.barcode, {
                        format: "CODE128",
                        width: 2,
                        height: 40,
                        displayValue: false,
                        margin: 0,
                        background: "transparent",
                        lineColor: "currentColor"
                    });
                }
            } catch (e) {}
        }
    }, [formData.barcode, open]);

    useEffect(() => {
        if (foundProduct && formData.barcode) {
            const performFill = async () => {
                toast({
                    title: "Product Found in Database!",
                    description: `Auto-filled details for ${foundProduct.name}`,
                });
                
                let resolvedSku = foundProduct.sku;
                if (!resolvedSku && autoFilledFields.sku) {
                    resolvedSku = await generateUniqueSku(foundProduct.name, posUserId);
                } else if (!resolvedSku) {
                    resolvedSku = formData.sku; 
                }
                
                setFormData(prev => ({
                    ...prev,
                    name: foundProduct.name || prev.name,
                    category: foundProduct.category || prev.category,
                    selling_price: foundProduct.mrp ? String(foundProduct.mrp) : prev.selling_price,
                    sku: resolvedSku,
                    unit: foundProduct.unit || prev.unit
                }));

                setAutoFilledFields({
                    name: !!foundProduct.name,
                    category: !!foundProduct.category,
                    selling_price: !!foundProduct.mrp,
                    sku: !!resolvedSku
                });

                setAutoFilledImages({
                    url1: foundProduct.image_url || foundProduct.images?.[0] || null,
                    url2: foundProduct.images?.[1] || null
                });

                setShowPreview(true);
            };
            performFill();
        }
    }, [foundProduct, searchingBarcode, formData.barcode, toast, posUserId]);

    const handleDone = () => {
        onOpenChange(false);
    };

    const validateForm = () => {
        const newErrors = {};
        const validation = validateBarcode(formData.barcode);
        
        if (!formData.name.trim()) newErrors.name = "Product Name is required";
        if (!validation.isValid) newErrors.barcode = validation.error;
        if (!formData.category) newErrors.category = "Category is required";
        if (!formData.selling_price || parseFloat(formData.selling_price) < 0) newErrors.selling_price = "Valid Price is required";
        if (!formData.current_stocks || parseInt(formData.current_stocks) < 0) newErrors.current_stocks = "Stock is required";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (autoFilledFields[name]) {
            setAutoFilledFields(prev => ({ ...prev, [name]: false }));
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (autoFilledFields[name]) {
            setAutoFilledFields(prev => ({ ...prev, [name]: false }));
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleProductNameBlur = async () => {
        if (formData.name && !autoFilledFields.name) {
            setFormData(prev => ({
                ...prev,
                name: toTitleCase(prev.name)
            }));
            
            if (autoFilledFields.sku) {
                 const newSku = await generateUniqueSku(formData.name, posUserId);
                 setFormData(prev => ({ ...prev, sku: newSku }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast({ title: "Validation Error", description: "Check required fields.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            const validation = validateBarcode(formData.barcode);
            const payload = {
                user_id: posUserId,
                name: formData.name,
                sku: formData.sku,
                barcode: validation.cleanBarcode,
                category: formData.category, 
                selling_price: parseFloat(formData.selling_price),
                cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
                stock_level: parseInt(formData.current_stocks),
                tax_rate: parseFloat(formData.tax_rate) || 0,
                unit: formData.unit,
                image_url: autoFilledImages.url1,
                images: [autoFilledImages.url1, autoFilledImages.url2].filter(Boolean)
            };

            const { error: insertError } = await supabase
                .from('point_of_sale_products')
                .insert([payload]);

            if (insertError) throw insertError;

            toast({ title: "Product Added", description: `${formData.name} saved successfully.` });
            if (onProductAdded) onProductAdded();
            await resetForm();

        } catch (err) {
            console.error("Error adding product:", err);
            toast({ title: "Failed to add product", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] bg-background text-foreground border-border shadow-2xl overflow-hidden p-0 rounded-xl">
                    <div className="bg-primary p-6 text-primary-foreground">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Quick Add Product</DialogTitle>
                            <DialogDescription className="text-primary-foreground/80">
                                Fill in the details to add a new product to your inventory.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="grid gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="barcode" className="font-semibold">Barcode / QR Code *</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input 
                                            id="barcode" 
                                            ref={barcodeInputRef}
                                            name="barcode" 
                                            value={formData.barcode} 
                                            onChange={handleChange}
                                            placeholder="Scan or enter barcode..." 
                                            className={cn(errors.barcode && "border-destructive")}
                                        />
                                        {searchingBarcode && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
                                    </div>
                                    <Button type="button" variant="secondary" onClick={() => setShowScanner(true)}>
                                        <Camera className="w-4 h-4 mr-2" /> Scan
                                    </Button>
                                </div>
                                {errors.barcode && <p className="text-xs text-destructive">{errors.barcode}</p>}
                                <div className="h-10 bg-muted flex items-center justify-center rounded border border-dashed border-border overflow-hidden">
                                     {formData.barcode ? <svg id="barcode-preview" className="h-8 max-w-full text-foreground"></svg> : <span className="text-xs text-muted-foreground">Barcode Preview</span>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name" className="font-semibold">Product Name *</Label>
                                <Input 
                                    id="name" 
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleChange}
                                    onBlur={handleProductNameBlur}
                                    placeholder="Enter full product name" 
                                    className={cn(errors.name && "border-destructive")}
                                />
                                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="font-semibold">Category *</Label>
                                    <Select value={formData.category} onValueChange={(val) => handleSelectChange('category', val)}>
                                        <SelectTrigger className={cn(errors.category && "border-destructive")}>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="unit" className="font-semibold">Unit Type</Label>
                                    <Select value={formData.unit} onValueChange={(val) => handleSelectChange('unit', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                                            <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                            <SelectItem value="gm">Gram (g)</SelectItem>
                                            <SelectItem value="ltr">Liter (l)</SelectItem>
                                            <SelectItem value="ml">Milliliter (ml)</SelectItem>
                                            <SelectItem value="box">Box</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="selling_price" className="font-semibold">Selling Price *</Label>
                                    <Input 
                                        id="selling_price" 
                                        name="selling_price" 
                                        type="number" 
                                        step="0.01"
                                        value={formData.selling_price} 
                                        onChange={handleChange}
                                        placeholder="0.00" 
                                        className={cn(errors.selling_price && "border-destructive")}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="current_stocks" className="font-semibold">Initial Stock *</Label>
                                    <Input 
                                        id="current_stocks" 
                                        name="current_stocks" 
                                        type="number"
                                        value={formData.current_stocks} 
                                        onChange={handleChange}
                                        placeholder="0" 
                                        className={cn(errors.current_stocks && "border-destructive")}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={handleDone}>Cancel</Button>
                            <Button type="submit" disabled={loading} className="px-8">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Save Product
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {showScanner && (
                <BarcodeScanner 
                    isOpen={showScanner}
                    onClose={() => setShowScanner(false)}
                    onScanSuccess={(code) => {
                        handleSelectChange('barcode', code);
                        setShowScanner(false);
                    }}
                />
            )}
        </>
    );
};

export default QuickAddPosProductModal;