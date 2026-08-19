import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, Package, Tag, Image as ImageIcon, MapPin, Phone, Mail, Globe, X, Plus, Trash2, Loader2 
} from 'lucide-react';

const CATEGORIES = [
  'Grocery', 'Electronics', 'Fashion', 'Medicine', 'Hardware', 'Agriculture', 'Packaging', 'Other'
];

export default function BusinessListingForm({ onSuccess, onCancel }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const logoInputRef = useRef(null);
  const imagesInputRef = useRef(null);
  const firstInputRef = useRef(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [category, setCategory] = useState('');
  
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('1');
  const [bulkTiers, setBulkTiers] = useState([]);
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  
  const [logo, setLogo] = useState(null);
  const [images, setImages] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!category) newErrors.category = 'Category is required';
    
    if (!productName.trim()) newErrors.productName = 'Product name is required';
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) newErrors.price = 'Valid price is required';
    if (!moq || isNaN(parseInt(moq)) || parseInt(moq) < 1) newErrors.moq = 'MOQ must be at least 1';
    
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phone.trim()) newErrors.phone = 'Phone is required';
    else if (!phoneRegex.test(phone)) newErrors.phone = 'Invalid phone format (e.g. +919876543210)';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!emailRegex.test(email)) newErrors.email = 'Invalid email format';
    
    if (!location.trim()) newErrors.location = 'Location is required';
    
    if (website && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(website)) {
      newErrors.website = 'Invalid URL format';
    }

    bulkTiers.forEach((tier, idx) => {
      if (!tier.qty || isNaN(parseInt(tier.qty)) || parseInt(tier.qty) <= parseInt(moq)) {
        newErrors[`tier_${idx}_qty`] = 'Must be > MOQ';
      }
      if (!tier.price || isNaN(parseFloat(tier.price)) || parseFloat(tier.price) >= parseFloat(price)) {
        newErrors[`tier_${idx}_price`] = 'Must be < Base Price';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTier = () => {
    setBulkTiers([...bulkTiers, { qty: '', price: '' }]);
  };

  const handleRemoveTier = (index) => {
    setBulkTiers(bulkTiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (index, field, value) => {
    const newTiers = [...bulkTiers];
    newTiers[index][field] = value;
    setBulkTiers(newTiers);
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ variant: "destructive", title: "Invalid file", description: "Must be an image." });
        return;
      }
      setLogo({ file, preview: URL.createObjectURL(file) });
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (validFiles.length < files.length) {
      toast({ variant: "destructive", title: "Invalid files", description: "Only images are allowed." });
    }
    
    if (images.length + validFiles.length > 3) {
      toast({ variant: "destructive", title: "Limit exceeded", description: "Max 3 images allowed." });
      return;
    }
    
    const newImages = validFiles.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setImages([...images, ...newImages]);
  };

  const removeImage = (index) => {
    setImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  useEffect(() => {
    return () => {
      if (logo) URL.revokeObjectURL(logo.preview);
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [logo, images]);

  const uploadFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${folder}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(filePath, file);
      
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    
    const { data: { publicUrl } } = supabase.storage
      .from('listing-images')
      .getPublicUrl(filePath);
      
    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !user) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fix the errors before submitting." });
      return;
    }

    setIsSubmitting(true);

    try {
      let logoUrl = null;
      if (logo) {
        logoUrl = await uploadFile(logo.file, 'logos');
      }

      const imageUrls = [];
      for (const img of images) {
        imageUrls.push(await uploadFile(img.file, 'products'));
      }

      const listingData = {
        user_id: user.id,
        business_name: businessName,
        business_description: businessDesc,
        business_category: category,
        product_name: productName,
        product_description: productDesc,
        product_price: parseFloat(price),
        minimum_order_quantity: parseInt(moq),
        bulk_pricing: bulkTiers.length > 0 ? bulkTiers : null,
        phone_number: phone,
        email_address: email,
        business_location: location,
        website_url: website,
        business_logo_url: logoUrl,
        product_images: imageUrls
      };

      const { data, error } = await supabase
        .from('business_listings')
        .insert(listingData)
        .select(`
          *,
          profiles (
            business_name,
            contact_person,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      toast({
        title: "Success! 🎉",
        description: "Business listing created successfully.",
        className: "bg-green-50 border-green-200 text-green-900"
      });

      if (onSuccess) onSuccess(data);

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 py-4">
      
      {/* 1. Business Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
          <Building2 className="w-5 h-5 text-primary" /> Business Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Business Name <span className="text-red-500">*</span></Label>
            <Input 
              ref={firstInputRef}
              value={businessName} onChange={e => setBusinessName(e.target.value)}
              maxLength={100} disabled={isSubmitting}
              className={errors.businessName ? 'border-red-500' : ''}
              placeholder="Your Company Ltd."
            />
            {errors.businessName && <p className="text-red-500 text-xs">{errors.businessName}</p>}
          </div>
          <div className="space-y-1">
            <Label>Category <span className="text-red-500">*</span></Label>
            <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
              <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-red-500 text-xs">{errors.category}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Business Description</Label>
          <Textarea 
            value={businessDesc} onChange={e => setBusinessDesc(e.target.value)}
            maxLength={300} disabled={isSubmitting}
            placeholder="Briefly describe your business..."
            className="resize-none"
          />
          <div className="text-xs text-muted-foreground text-right">{businessDesc.length}/300</div>
        </div>
      </div>

      {/* 2. Product Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
          <Package className="w-5 h-5 text-primary" /> Core Product Offering
        </h3>
        
        <div className="space-y-1">
          <Label>Product / Service Name <span className="text-red-500">*</span></Label>
          <Input 
            value={productName} onChange={e => setProductName(e.target.value)}
            disabled={isSubmitting}
            className={errors.productName ? 'border-red-500' : ''}
            placeholder="e.g. Premium Grade A Wheat (50kg Bag)"
          />
          {errors.productName && <p className="text-red-500 text-xs">{errors.productName}</p>}
        </div>

        <div className="space-y-1">
          <Label>Product Description</Label>
          <Textarea 
            value={productDesc} onChange={e => setProductDesc(e.target.value)}
            disabled={isSubmitting}
            placeholder="Details about quality, origin, variations..."
            className="resize-none h-20"
          />
        </div>
      </div>

      {/* 3. Wholesale Pricing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
          <Tag className="w-5 h-5 text-primary" /> Wholesale & Pricing
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Base Price (per unit) <span className="text-red-500">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input 
                type="number" step="0.01" min="0" className={`pl-8 ${errors.price ? 'border-red-500' : ''}`}
                value={price} onChange={e => setPrice(e.target.value)} disabled={isSubmitting}
              />
            </div>
            {errors.price && <p className="text-red-500 text-xs">{errors.price}</p>}
          </div>
          <div className="space-y-1">
            <Label>Min. Order Quantity (MOQ) <span className="text-red-500">*</span></Label>
            <Input 
              type="number" min="1" className={errors.moq ? 'border-red-500' : ''}
              value={moq} onChange={e => setMoq(e.target.value)} disabled={isSubmitting}
            />
            {errors.moq && <p className="text-red-500 text-xs">{errors.moq}</p>}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label>Bulk Pricing Tiers (Optional)</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddTier} disabled={isSubmitting}>
              <Plus className="w-3 h-3 mr-1" /> Add Tier
            </Button>
          </div>
          {bulkTiers.map((tier, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Qty &gt;=</Label>
                <Input 
                  type="number" value={tier.qty} onChange={e => handleTierChange(idx, 'qty', e.target.value)}
                  className={errors[`tier_${idx}_qty`] ? 'border-red-500 h-8 text-sm' : 'h-8 text-sm'} 
                  disabled={isSubmitting}
                />
                {errors[`tier_${idx}_qty`] && <p className="text-red-500 text-[10px]">{errors[`tier_${idx}_qty`]}</p>}
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Price/Unit (₹)</Label>
                <Input 
                  type="number" step="0.01" value={tier.price} onChange={e => handleTierChange(idx, 'price', e.target.value)}
                  className={errors[`tier_${idx}_price`] ? 'border-red-500 h-8 text-sm' : 'h-8 text-sm'}
                  disabled={isSubmitting}
                />
                {errors[`tier_${idx}_price`] && <p className="text-red-500 text-[10px]">{errors[`tier_${idx}_price`]}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon" className="mt-5 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveTier(idx)} disabled={isSubmitting}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Contact & Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
          <Phone className="w-5 h-5 text-primary" /> Contact Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Phone Number <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                value={phone} onChange={e => setPhone(e.target.value)} disabled={isSubmitting}
                className={`pl-9 ${errors.phone ? 'border-red-500' : ''}`} placeholder="+91..."
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
          </div>
          <div className="space-y-1">
            <Label>Email <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isSubmitting}
                className={`pl-9 ${errors.email ? 'border-red-500' : ''}`} placeholder="sales@example.com"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Location / Address <span className="text-red-500">*</span></Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Textarea 
              value={location} onChange={e => setLocation(e.target.value)} disabled={isSubmitting}
              className={`pl-9 min-h-[60px] resize-none ${errors.location ? 'border-red-500' : ''}`} 
              placeholder="Full business address..."
            />
          </div>
          {errors.location && <p className="text-red-500 text-xs">{errors.location}</p>}
        </div>

        <div className="space-y-1">
          <Label>Website (Optional)</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={website} onChange={e => setWebsite(e.target.value)} disabled={isSubmitting}
              className={`pl-9 ${errors.website ? 'border-red-500' : ''}`} placeholder="https://www.example.com"
            />
          </div>
          {errors.website && <p className="text-red-500 text-xs">{errors.website}</p>}
        </div>
      </div>

      {/* 5. Images */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
          <ImageIcon className="w-5 h-5 text-primary" /> Media
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Business Logo</Label>
            <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={handleLogoSelect} disabled={isSubmitting} />
            <div 
              onClick={() => !isSubmitting && logoInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative overflow-hidden"
            >
              {logo ? (
                <>
                  <img src={logo.preview} alt="Logo" className="w-full h-full object-contain p-2" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 w-6 h-6 rounded-full" onClick={(e) => {e.stopPropagation(); setLogo(null);}}>
                    <X className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span className="text-sm">Click to upload logo</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product Images (Max 3)</Label>
            <input type="file" accept="image/*" multiple className="hidden" ref={imagesInputRef} onChange={handleImageSelect} disabled={isSubmitting} />
            
            {images.length === 0 ? (
              <div 
                onClick={() => !isSubmitting && imagesInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span className="text-sm">Click to upload product images</span>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 h-32">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-1/3 h-full border rounded-xl overflow-hidden group">
                    <img src={img.preview} alt={`Product ${idx+1}`} className="w-full h-full object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(idx)} disabled={isSubmitting}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {images.length < 3 && (
                  <div 
                    onClick={() => !isSubmitting && imagesInputRef.current?.click()}
                    className="w-1/3 h-full border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-50"
                  >
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={isSubmitting} className="min-w-[140px]">
          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : 'Publish Listing'}
        </Button>
      </div>
    </form>
  );
}