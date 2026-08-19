import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Trash2, PlayCircle, Clock, ShoppingBag, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatPrice, cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
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

const ResumeSaleModal = ({ isOpen, onClose, onResumeSale }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedSales, setSavedSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSavedSales();
    }
  }, [isOpen]);

  const fetchSavedSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_saved_sales')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSales(data || []);
    } catch (error) {
      console.error('Error fetching saved sales:', error);
      toast({
        title: "Error",
        description: "Failed to load saved sales.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const { error } = await supabase
        .from('pos_saved_sales')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setSavedSales(prev => prev.filter(s => s.id !== deleteId));
      toast({
        title: "Deleted",
        description: "Saved sale has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleResume = async (sale) => {
    if (onResumeSale) {
      onResumeSale(sale);
      // Optional: Delete automatically after resuming? 
      // Usually users want to keep it until they explicitly delete or finish checkout.
      // We'll leave it in the list but close the modal.
      
      // Let's verify items still exist or handle gracefully
      onClose();
    }
  };

  const filteredSales = savedSales.filter(sale => 
    sale.sale_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.customer_details?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border-0">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
                <PlayCircle className="w-6 h-6 text-green-600" />
                Resume Saved Sale
              </DialogTitle>
              <DialogDescription>
                Select a draft sale to load back into the cart.
              </DialogDescription>
            </DialogHeader>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by sale name or customer..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-900/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Loading saved sales...</p>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 gap-3 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium">No saved sales found</p>
                <p className="text-sm">Save a draft from the checkout screen to see it here.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredSales.map((sale) => (
                  <div 
                    key={sale.id}
                    className="group bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-green-200 dark:hover:border-green-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{sale.sale_name}</h3>
                        {sale.note && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">
                            Note
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {sale.customer_details?.name || 'Walk-in Customer'}
                        </div>
                        <div className="flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {Array.isArray(sale.cart_items) ? sale.cart_items.reduce((acc, item) => acc + (item.quantity || 0), 0) : 0} Items
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDistanceToNow(new Date(sale.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      
                      {sale.note && (
                        <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">"{sale.note}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right mr-2">
                        <p className="text-xs text-slate-400 font-medium uppercase">Total</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{formatPrice(sale.total_amount)}</p>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteId(sale.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                      
                      <Button 
                        onClick={() => handleResume(sale)}
                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                      >
                        Resume
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Saved Sale?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The saved draft will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ResumeSaleModal;