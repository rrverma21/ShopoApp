import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Upload } from 'lucide-react';
import SubmissionReceipt from './SubmissionReceipt';

const SuggestEditModal = ({ isOpen, onClose, product, initialBarcode }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  const [formData, setFormData] = useState({
    name: product?.product_name || '',
    mrp: product?.mrp || '',
    barcode: initialBarcode || product?.barcode || '',
    notes: '',
  });
  
  const [imageFile, setImageFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = product?.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(`contributions/${fileName}`, imageFile);

        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(`contributions/${fileName}`);
          
        imageUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('product_edit_suggestions')
        .insert({
          original_product_id: product?.id, // Can be null if suggested via generic flow
          suggested_changes: {
            ...formData,
            image_url: imageUrl
          },
          status: 'pending',
          reviewed_by: null
        })
        .select()
        .single();

      if (error) throw error;

      setSuccessData({
        ...data,
        product_name: formData.name,
        barcode: formData.barcode
      });

    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessData(null);
    setFormData({ name: '', mrp: '', barcode: '', notes: '' });
    setImageFile(null);
    onClose();
  };

  if (successData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
           <SubmissionReceipt data={successData} onClose={handleClose} type="edit" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Suggest Changes</DialogTitle>
          <DialogDescription>
            Help us improve our product database. Accurate data earns you rewards!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input 
              id="barcode" 
              value={formData.barcode} 
              onChange={e => setFormData({...formData, barcode: e.target.value})}
              disabled={!!product} // Disable if editing a known product
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mrp">MRP (₹)</Label>
            <Input 
              id="mrp" 
              type="number" 
              value={formData.mrp} 
              onChange={e => setFormData({...formData, mrp: e.target.value})}
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">New Image (Optional)</Label>
            <Input 
              id="image" 
              type="file" 
              accept="image/*"
              onChange={e => setImageFile(e.target.files[0])}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Why are you suggesting this change?</Label>
            <Textarea 
              id="notes" 
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="e.g. Price changed, Wrong name, Better image..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit Suggestion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestEditModal;