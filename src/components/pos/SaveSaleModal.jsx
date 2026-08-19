import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, User, FileText, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatPrice } from '@/lib/utils';

const SaveSaleModal = ({ isOpen, onClose, cart, customer, total, onSaveSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saleName, setSaleName] = useState('');
  const [note, setNote] = useState('');
  const [clearCart, setClearCart] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto-generate a name based on time or customer
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSaleName(customer ? `${customer.name} - ${timeStr}` : `Walk-in - ${timeStr}`);
      setNote('');
      setClearCart(true);
    }
  }, [isOpen, customer]);

  const handleSave = async () => {
    if (!saleName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this saved sale.",
        variant: "destructive"
      });
      return;
    }

    if (!cart || cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Cannot save an empty sale.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from('pos_saved_sales').insert({
        user_id: user.id,
        sale_name: saleName,
        customer_details: customer || null,
        cart_items: cart,
        total_amount: total,
        note: note
      });

      if (error) throw error;

      toast({
        title: "Sale Saved",
        description: "The sale has been saved successfully.",
      });

      if (onSaveSuccess) onSaveSuccess(clearCart);
      onClose();

    } catch (error) {
      console.error('Error saving sale:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save the sale.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border-0">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <Save className="w-6 h-6 text-blue-600" />
            Save Current Sale
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Park this sale to resume it later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-500">Items</span>
              <span className="font-semibold">{cart.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Total Value</span>
              <span className="font-bold text-lg text-green-600">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="saleName" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> Sale Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="saleName"
              placeholder="e.g. Table 5, John Doe, Morning Order"
              value={saleName}
              onChange={(e) => setSaleName(e.target.value)}
              className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Notes (Optional)
            </Label>
            <Textarea
              id="note"
              placeholder="Any special instructions or reminders..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="clearCart" 
              checked={clearCart} 
              onCheckedChange={setClearCart}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <Label htmlFor="clearCart" className="cursor-pointer text-slate-600 dark:text-slate-300">
              Clear cart after saving
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-slate-200 hover:bg-slate-50">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveSaleModal;