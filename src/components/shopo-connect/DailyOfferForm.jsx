import React, { useState, useRef } from 'react';
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
import { Tag, IndianRupee, Image as ImageIcon, X, Plus, CalendarPlus as CalendarIcon, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

const CATEGORIES = [
  'Grocery', 'Electronics', 'Fashion', 'Medicine', 'Hardware', 'Agriculture', 'Other'
];

export default function DailyOfferForm({ onSuccess, onCancel }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [category, setCategory] = useState('');
  const [validDays, setValidDays] = useState('1');
  const [images, setImages] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!productName.trim()) newErrors.productName = 'Product name is required';
    if (!originalPrice || isNaN(parseFloat(originalPrice)) || parseFloat(originalPrice) <= 0) {
      newErrors.originalPrice = 'Valid original price required';
    }
    if (!discountPrice || isNaN(parseFloat(discountPrice)) || parseFloat(discountPrice) <= 0) {
      newErrors.discountPrice = 'Valid discount price required';
    } else if (parseFloat(discountPrice) >= parseFloat(originalPrice)) {
      newErrors.discountPrice = 'Discount price must be less than original price';
    }
    if (!category) newErrors.category = 'Category is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
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

  const uploadImages = async () => {
    const uploadedUrls = [];
    for (const img of images) {
      const fileExt = img.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/offers/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('offer-images')
        .upload(filePath, img.file);
        
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      
      const { data: { publicUrl } } = supabase.storage
        .from('offer-images')
        .getPublicUrl(filePath);
        
      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !user) return;

    setIsSubmitting(true);

    try {
      const imageUrls = await uploadImages();
      
      const oPrice = parseFloat(originalPrice);
      const dPrice = parseFloat(discountPrice);
      const percentOff = ((oPrice - dPrice) / oPrice) * 100;
      
      const startDate = new Date();
      const endDate = addDays(startDate, parseInt(validDays));

      const offerData = {
        user_id: user.id,
        product_name: productName,
        description: description,
        original_price: oPrice,
        discount_price: dPrice,
        discount_percentage: percentOff,
        category: category,
        images: imageUrls,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      };

      const { data, error } = await supabase
        .from('daily_offers')
        .insert(offerData)
        .select(`*, profiles (business_name, contact_person, avatar_url)`)
        .single();

      if (error) throw error;

      toast({
        title: "Success! 🎉",
        description: "Daily offer published successfully.",
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
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1 md:col-span-2">
          <Label>Product Name <span className="text-red-500">*</span></Label>
          <Input 
            value={productName} onChange={e => setProductName(e.target.value)}
            disabled={isSubmitting} className={errors.productName ? 'border-red-500' : ''}
            placeholder="What are you offering?"
          />
          {errors.productName && <p className="text-red-500 text-xs">{errors.productName}</p>}
        </div>

        <div className="space-y-1">
          <Label>Original Price <span className="text-red-500">*</span></Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <Input 
              type="number" step="0.01" min="0" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)}
              disabled={isSubmitting} className={`pl-8 ${errors.originalPrice ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.originalPrice && <p className="text-red-500 text-xs">{errors.originalPrice}</p>}
        </div>

        <div className="space-y-1">
          <Label>Offer Price <span className="text-red-500">*</span></Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">₹</span>
            <Input 
              type="number" step="0.01" min="0" value={discountPrice} onChange={e => setDiscountPrice(e.target.value)}
              disabled={isSubmitting} className={`pl-8 font-bold text-primary ${errors.discountPrice ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.discountPrice && <p className="text-red-500 text-xs">{errors.discountPrice}</p>}
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

        <div className="space-y-1">
          <Label>Offer Validity (Days)</Label>
          <Select value={validDays} onValueChange={setValidDays} disabled={isSubmitting}>
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24 Hours (Daily Deal)</SelectItem>
              <SelectItem value="3">3 Days</SelectItem>
              <SelectItem value="7">1 Week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>Description</Label>
          <Textarea 
            value={description} onChange={e => setDescription(e.target.value)}
            disabled={isSubmitting} className="resize-none"
            placeholder="Add details about the offer, terms and conditions..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Offer Images (Max 3)</Label>
          <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageSelect} disabled={isSubmitting} />
          
          <div className="flex gap-3 h-24">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-24 h-24 border rounded-xl overflow-hidden group">
                <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(idx)} disabled={isSubmitting}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {images.length < 3 && (
              <div 
                onClick={() => !isSubmitting && fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-muted-foreground"
              >
                <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                <span className="text-[10px]">Add Image</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : 'Publish Offer'}
        </Button>
      </div>
    </form>
  );
}