import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { ArrowLeft, Save, Loader2, Upload, X, FileImage as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateUniqueCode } from '@/utils/promotions/linkGenerator';
import { getPromotionsSelectString } from '@/utils/promotions/schemaDiscovery';

const OfferForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const offerId = searchParams.get('id');
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: 'Discount',
        title: '',
        description: '',
        discount_value: '',
        discount_type: 'percentage',
        validity_start: '',
        validity_end: '',
        is_active: true,
        promotional_image_url: ''
    });

    // Image upload states
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    useEffect(() => {
        if (offerId) fetchOffer();
    }, [offerId]);

    const fetchOffer = async () => {
        const { data, error } = await supabase
            .from('promotions')
            .select(getPromotionsSelectString())
            .eq('id', offerId)
            .single();
            
        if (data) {
            setFormData({
                type: data.type || 'Discount',
                title: data.title || '',
                description: data.description || '',
                discount_value: data.discount_value || '',
                discount_type: data.discount_type || 'percentage',
                validity_start: data.validity_start ? data.validity_start.split('T')[0] : '',
                validity_end: data.validity_end ? data.validity_end.split('T')[0] : '',
                is_active: data.is_active !== undefined ? data.is_active : true,
                promotional_image_url: data.promotional_image_url || ''
            });

            // Set preview if image exists
            if (data.promotional_image_url) {
                setImagePreview(data.promotional_image_url);
            }
        } else if (error) {
            toast({ title: 'Error', description: 'Failed to load offer data', variant: 'destructive' });
        }
    };

    const validateFile = (file) => {
        if (!file) return 'No file selected';
        
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return 'Invalid file type. Please upload JPG, PNG, WEBP, or GIF images only.';
        }
        
        if (file.size > MAX_FILE_SIZE) {
            return `File size exceeds 5MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`;
        }
        
        return null;
    };

    const handleFileSelect = (file) => {
        setUploadError('');
        
        const validationError = validateFile(file);
        if (validationError) {
            setUploadError(validationError);
            toast({ title: 'Invalid File', description: validationError, variant: 'destructive' });
            return;
        }

        setImageFile(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setUploadError('');
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadImage = async (offerIdForPath) => {
        if (!imageFile) return formData.promotional_image_url; 

        setUploadLoading(true);
        setUploadProgress(0);
        setUploadError('');

        try {
            const timestamp = Date.now();
            const fileName = `${timestamp}_${imageFile.name}`;
            const filePath = `offers/${user.id}/${offerIdForPath || 'temp'}/${fileName}`;

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 100);

            const { data, error } = await supabase.storage
                .from('promotions')
                .upload(filePath, imageFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('promotions')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            toast({ 
                title: 'Success', 
                description: 'Image uploaded successfully!',
                duration: 3000
            });

            return publicUrl;

        } catch (error) {
            console.error('[OfferForm] Image upload error:', error);
            const errorMsg = error.message || 'Failed to upload image';
            setUploadError(errorMsg);
            toast({ 
                title: 'Upload Failed', 
                description: errorMsg, 
                variant: 'destructive' 
            });
            throw error;
        } finally {
            setUploadLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (uploadLoading) {
            toast({ 
                title: 'Please Wait', 
                description: 'Image upload is in progress...', 
                variant: 'default' 
            });
            return;
        }

        setLoading(true);

        try {
            let imageUrl = formData.promotional_image_url;

            if (imageFile) {
                imageUrl = await uploadImage(offerId || 'new');
            }

            const payload = {
                type: formData.type,
                title: formData.title,
                description: formData.description,
                discount_value: parseFloat(formData.discount_value) || 0,
                discount_type: formData.discount_type,
                shop_id: user.id,
                validity_start: formData.validity_start ? new Date(formData.validity_start).toISOString() : null,
                validity_end: formData.validity_end ? new Date(formData.validity_end).toISOString() : null,
                is_active: formData.is_active,
                promotional_image_url: imageUrl || null,
                updated_at: new Date().toISOString()
            };

            let savedOfferId = offerId;

            if (offerId) {
                const { error } = await supabase.from('promotions').update(payload).eq('id', offerId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('promotions').insert([payload]).select().single();
                if (error) throw error;
                savedOfferId = data.id;
                
                await supabase.from('promotion_links').insert([{
                    promotion_id: savedOfferId,
                    unique_code: generateUniqueCode(),
                    full_url: 'placeholder'
                }]);
            }

            toast({ 
                title: 'Success', 
                description: 'Offer saved successfully!',
                duration: 3000 
            });
            
            navigate('/promotions/offers');

        } catch (error) {
            console.error('[OfferForm] Save error:', error);
            toast({ 
                title: 'Error', 
                description: error.message || 'Failed to save offer', 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <Button variant="ghost" onClick={() => navigate('/promotions')} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">{offerId ? 'Edit Offer' : 'Create New Offer'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Promotion Type *</Label>
                            <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Discount">Standard Discount</SelectItem>
                                    <SelectItem value="Combo">Combo Deal</SelectItem>
                                    <SelectItem value="BOGO">Buy 1 Get 1</SelectItem>
                                    <SelectItem value="Flash Sale">Flash Sale</SelectItem>
                                    <SelectItem value="Seasonal">Seasonal Offer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Promotion Title *</Label>
                            <Input 
                                required
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})} 
                                placeholder="e.g., Diwali Special - 20% Off Electronics"
                                className="text-slate-900" 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})} 
                                placeholder="Describe your offer in detail..."
                                className="text-slate-900 min-h-[100px]" 
                            />
                            <p className="text-xs text-slate-500">This will be shown to customers when they view the offer.</p>
                        </div>

                        <div className="space-y-3">
                            <Label>Promotional Image (Optional)</Label>
                            
                            {!imagePreview ? (
                                <div
                                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                                        dragActive 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                                    }`}
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 bg-white rounded-full border border-slate-200">
                                            <Upload className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-700">
                                                Drop your image here, or <span className="text-blue-600">browse</span>
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Supports: JPG, PNG, WEBP, GIF (Max 5MB)
                                            </p>
                                        </div>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                    />
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-lg p-4 bg-white">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-shrink-0">
                                            <div className="relative w-full md:w-48 h-48 bg-slate-100 rounded-lg overflow-hidden">
                                                <img 
                                                    src={imagePreview} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                                {imageFile && (
                                                    <div className="absolute top-2 right-2">
                                                        <CheckCircle2 className="w-6 h-6 text-green-600 bg-white rounded-full" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <ImageIcon className="w-5 h-5 text-slate-400" />
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">
                                                            {imageFile?.name || 'Existing Image'}
                                                        </p>
                                                        {imageFile && (
                                                            <p className="text-xs text-slate-500">
                                                                {(imageFile.size / (1024 * 1024)).toFixed(2)} MB
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={clearImage}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <X className="w-4 h-4 mr-1" />
                                                    Remove
                                                </Button>
                                            </div>

                                            {uploadLoading && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-600">Uploading...</span>
                                                        <span className="font-medium text-slate-700">{uploadProgress}%</span>
                                                    </div>
                                                    <Progress value={uploadProgress} className="h-2" />
                                                </div>
                                            )}

                                            {uploadError && (
                                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                                    <p className="text-xs text-red-700">{uploadError}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-slate-500">
                                Add an eye-catching image to make your promotion stand out. This image will be displayed when customers view your offer.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Discount Value *</Label>
                                <Input 
                                    type="number" 
                                    required 
                                    min="0"
                                    step="0.01"
                                    value={formData.discount_value} 
                                    onChange={e => setFormData({...formData, discount_value: e.target.value})} 
                                    className="text-slate-900"
                                    placeholder="e.g., 20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Discount Type *</Label>
                                <Select value={formData.discount_type} onValueChange={v => setFormData({...formData, discount_type: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Valid From</Label>
                                <Input 
                                    type="date" 
                                    value={formData.validity_start} 
                                    onChange={e => setFormData({...formData, validity_start: e.target.value})} 
                                    className="text-slate-900" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Valid Until</Label>
                                <Input 
                                    type="date" 
                                    value={formData.validity_end} 
                                    onChange={e => setFormData({...formData, validity_end: e.target.value})} 
                                    className="text-slate-900"
                                    min={formData.validity_start}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <input 
                                type="checkbox" 
                                id="is_active"
                                checked={formData.is_active} 
                                onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <Label htmlFor="is_active" className="cursor-pointer text-slate-700">
                                Activate this offer immediately
                            </Label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => navigate('/promotions/offers')}>
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={loading || uploadLoading} 
                                className="min-w-[150px] bg-[#3B82F6] hover:bg-blue-600 text-white shadow-md transition-all active:scale-95"
                            >
                                {(loading || uploadLoading) ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {uploadLoading ? 'Uploading...' : (offerId ? 'Update Offer' : 'Create Offer')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default OfferForm;