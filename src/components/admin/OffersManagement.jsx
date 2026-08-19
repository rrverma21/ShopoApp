import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, UploadCloud, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from '@/components/ui/badge';

const OfferForm = ({ offer, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        button_text: 'Shop Now',
        button_link: '',
        sort_order: 0,
        is_active: true,
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (offer) {
            setFormData({
                id: offer.id,
                title: offer.title || '',
                description: offer.description || '',
                image_url: offer.image_url || '',
                button_text: offer.button_text || 'Shop Now',
                button_link: offer.button_link || '',
                sort_order: offer.sort_order || 0,
                is_active: offer.is_active ?? true,
            });
            setImagePreview(offer.image_url || '');
        } else {
            setFormData({
                title: '',
                description: '',
                image_url: '',
                button_text: 'Shop Now',
                button_link: '',
                sort_order: 0,
                is_active: true,
            });
            setImagePreview('');
            setImageFile(null);
        }
    }, [offer]);

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleImageUpload = async (file) => {
        if (!file) return null;
        setIsUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `offers/${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(fileName, file, { upsert: true });

        setIsUploading(false);
        if (error) {
            toast({ title: "Image Upload Error", description: error.message, variant: "destructive" });
            return null;
        }

        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path);
        return publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let imageUrl = formData.image_url;
        
        if (imageFile) {
            imageUrl = await handleImageUpload(imageFile);
            if (!imageUrl) return;
        }

        if (!imageUrl) {
            toast({ title: "Image Required", description: "Please upload an image for the offer.", variant: "destructive" });
            return;
        }

        onSave({ ...formData, image_url: imageUrl });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" value={formData.title} onChange={handleFormChange} required placeholder="e.g., Summer Sale" />
            </div>

            <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleFormChange} placeholder="Short description of the offer" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="button_text">Button Text (Optional)</Label>
                    <Input id="button_text" name="button_text" value={formData.button_text} onChange={handleFormChange} placeholder="e.g., Shop Now" />
                </div>
                 <div>
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input id="sort_order" name="sort_order" type="number" value={formData.sort_order} onChange={handleFormChange} placeholder="0" />
                </div>
            </div>
            
            <div>
                 <Label htmlFor="button_link">Button Link (Optional)</Label>
                 <Input id="button_link" name="button_link" value={formData.button_link} onChange={handleFormChange} placeholder="e.g., /products?category=summer" />
            </div>

            <div className="flex items-center space-x-2">
                <Switch 
                    id="is_active" 
                    checked={formData.is_active} 
                    onCheckedChange={(checked) => setFormData(prev => ({...prev, is_active: checked}))} 
                />
                <Label htmlFor="is_active">Active</Label>
            </div>

            <div>
                <Label className="mb-2 block">Offer Image</Label>
                <div className="flex items-center gap-4">
                    <div 
                        className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        onClick={() => document.getElementById('offer-image-input').click()}
                    >
                        <Input 
                            id="offer-image-input" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setImageFile(file);
                                    setImagePreview(URL.createObjectURL(file));
                                }
                            }}
                        />
                        <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">Click to upload image</p>
                    </div>
                    {imagePreview && (
                        <div className="w-32 h-32 rounded-lg overflow-hidden border border-slate-200 relative">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isUploading}>{isUploading ? "Uploading..." : "Save Offer"}</Button>
            </DialogFooter>
        </form>
    );
};

const OffersManagement = () => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const fetchOffers = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('marketplace_offers')
            .select('*')
            .order('sort_order', { ascending: true });
        
        if (error) {
            toast({ title: "Error fetching offers", description: error.message, variant: "destructive" });
        } else {
            setOffers(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    const handleSave = async (offerData) => {
        const isEditing = !!offerData.id;
        // eslint-disable-next-line no-unused-vars
        const { id, ...upsertData } = offerData;

        const { error } = isEditing
            ? await supabase.from('marketplace_offers').update(upsertData).eq('id', id)
            : await supabase.from('marketplace_offers').insert([upsertData]);

        if (error) {
            toast({ title: "Error saving offer", description: error.message, variant: "destructive" });
        } else {
            toast({ title: `Offer ${isEditing ? 'updated' : 'created'} successfully` });
            setIsFormOpen(false);
            setEditingOffer(null);
            fetchOffers();
        }
    };

    const handleDelete = async (id) => {
        // First, delete image from storage
        const offerToDelete = offers.find(o => o.id === id);
        if (offerToDelete && offerToDelete.image_url) {
            const path = new URL(offerToDelete.image_url).pathname.split('/product-images/').pop();
            if(path) {
                await supabase.storage.from('product-images').remove([path]);
            }
        }
        
        const { error } = await supabase.from('marketplace_offers').delete().eq('id', id);
        if (error) {
            toast({ title: "Error deleting offer", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Offer deleted" });
            fetchOffers();
        }
        setDeleteConfirmId(null);
    };

    const handleToggleActive = async (offer) => {
         const { error } = await supabase
            .from('marketplace_offers')
            .update({ is_active: !offer.is_active })
            .eq('id', offer.id);
        
        if (error) {
            toast({ title: "Error updating status", description: error.message, variant: "destructive" });
        } else {
            setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: !o.is_active } : o));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Marketplace Offers</h1>
                <Button onClick={() => { setEditingOffer(null); setIsFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add New Offer
                </Button>
            </div>

            {loading ? (
                 <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offers.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500 bg-white dark:bg-slate-800/20 rounded-lg border border-dashed dark:border-slate-700">
                            No offers found. Create your first marketplace offer!
                        </div>
                    ) : (
                         <AnimatePresence>
                            {offers.map((offer) => (
                                <motion.div
                                    key={offer.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    layout
                                >
                                    <Card className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                                        <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden group">
                                            <img 
                                                src={offer.image_url} 
                                                alt={offer.title} 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                            />
                                            <div className="absolute top-2 right-2">
                                                <Badge variant={offer.is_active ? "success" : "secondary"} className={`${offer.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-slate-500 hover:bg-slate-600'} text-white border-none`}>
                                                    {offer.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                             <div className="absolute bottom-2 left-2">
                                                <Badge variant="outline" className="bg-black/50 text-white border-none backdrop-blur-sm">
                                                    Order: {offer.sort_order}
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex justify-between items-start gap-2">
                                                <span className="truncate" title={offer.title}>{offer.title}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex flex-col gap-4">
                                            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                                                {offer.description}
                                            </p>
                                            <div className="flex justify-between items-center pt-2 border-t dark:border-slate-800">
                                                 <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleToggleActive(offer)}
                                                    title={offer.is_active ? "Deactivate" : "Activate"}
                                                 >
                                                    {offer.is_active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                                                </Button>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => { setEditingOffer(offer); setIsFormOpen(true); }}>
                                                        <Edit className="h-4 w-4 mr-1" /> Edit
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmId(offer.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            )}

            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) { setEditingOffer(null); } setIsFormOpen(isOpen);}}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingOffer ? "Edit Offer" : "Create New Offer"}</DialogTitle>
                    </DialogHeader>
                    <OfferForm 
                        offer={editingOffer} 
                        onSave={handleSave} 
                        onCancel={() => setIsFormOpen(false)} 
                    />
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the offer banner and its image from the storage.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(deleteConfirmId)} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default OffersManagement;