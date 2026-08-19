import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RotateCcw, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const RefundDialog = ({ bill, isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const posUserId = user?.posOwnerId || user?.id;
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [generatedCreditNote, setGeneratedCreditNote] = useState(null);

  useEffect(() => {
    if (isOpen && bill) {
      const initial = {};
      bill.point_of_sale_sale_items?.forEach(item => {
        if (!item.is_refunded) {
          initial[item.id] = { selected: false, qty: item.quantity };
        }
      });
      setSelectedItems(initial);
      setReason('');
      setNotes('');
      setCustomerName(bill.customer_name || bill.point_of_sale_customers?.name || '');
      setCustomerPhone(bill.customer_phone || bill.point_of_sale_customers?.phone || '');
      setGeneratedCreditNote(null);
    }
  }, [isOpen, bill]);

  const totalRefundAmount = useMemo(() => {
    let total = 0;
    if (!bill?.point_of_sale_sale_items) return total;
    
    bill.point_of_sale_sale_items.forEach(item => {
      const st = selectedItems[item.id];
      if (st && st.selected) {
        const itemOriginalQty = item.quantity || 1;
        const itemNetTotal = Number(item.total_price || 0) + (Number(item.total_price || 0) * Number(item.tax_rate || 0) / 100);
        const unitNetPrice = itemNetTotal / itemOriginalQty;
        total += unitNetPrice * st.qty;
      }
    });
    return total;
  }, [selectedItems, bill]);

  const handleToggleItem = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId].selected
      }
    }));
  };

  const handleQuantityChange = (itemId, maxQty, value) => {
    let newQty = parseInt(value, 10);
    if (isNaN(newQty) || newQty < 1) newQty = 1;
    if (newQty > maxQty) newQty = maxQty;

    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        qty: newQty,
        selected: true
      }
    }));
  };

  const processCoreRefund = async () => {
    const itemsToRefund = bill.point_of_sale_sale_items
      .filter(item => selectedItems[item.id]?.selected)
      .map(item => {
        const st = selectedItems[item.id];
        const itemOriginalQty = item.quantity || 1;
        const itemNetTotal = Number(item.total_price || 0) + (Number(item.total_price || 0) * Number(item.tax_rate || 0) / 100);
        const unitNetPrice = itemNetTotal / itemOriginalQty;
        const refundAmt = Number((unitNetPrice * st.qty).toFixed(2));

        return {
          sale_item_id: item.id,
          product_id: item.product_id,
          quantity: st.qty,
          amount: refundAmt
        };
      });

    const { data, error } = await supabase.rpc('process_sale_refund', {
      p_sale_id: bill.id,
      p_items: itemsToRefund,
      p_reason: reason.trim(),
      p_notes: notes.trim() || null
    });

    if (error) throw error;
    return itemsToRefund;
  };

  const handleProcessRefund = async () => {
    if (!bill?.id) return;
    if (totalRefundAmount <= 0) { toast({ title: "Select Items", description: "Select at least one item.", variant: "destructive" }); return; }
    if (!reason.trim()) { toast({ title: "Reason Required", description: "Provide a reason for refund.", variant: "destructive" }); return; }
    if (!customerPhone.trim() || !customerName.trim()) { toast({ title: "Customer Details Required", description: "Name and Mobile are required for refunds.", variant: "destructive" }); return; }

    setLoading(true);
    try {
      await processCoreRefund();
      toast({ title: "Refund Successful", description: `Refund of ₹${totalRefundAmount.toFixed(2)} processed.` });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast({ title: "Refund Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCreditNote = async () => {
    if (!bill?.id) return;
    if (totalRefundAmount <= 0) { toast({ title: "Select Items", description: "Select at least one item.", variant: "destructive" }); return; }
    if (!reason.trim()) { toast({ title: "Reason Required", description: "Provide a reason.", variant: "destructive" }); return; }
    if (!customerPhone.trim() || !customerName.trim()) { toast({ title: "Customer Details Required", description: "Name and Mobile are required for Credit Notes.", variant: "destructive" }); return; }

    setLoading(true);
    try {
      await processCoreRefund();

      const { data: note, error: noteError } = await supabase
        .from('pos_credit_notes')
        .insert({
          user_id: posUserId,
          customer_mobile: customerPhone.trim(),
          customer_name: customerName.trim(),
          amount: totalRefundAmount,
          original_bill_id: bill.id,
          status: 'Active'
        }).select().single();

      if (noteError) throw noteError;

      setGeneratedCreditNote(note);
      toast({ title: "Credit Note Generated", description: `Note for ₹${totalRefundAmount.toFixed(2)} created successfully.` });
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasRefundableItems = bill?.point_of_sale_sale_items?.some(item => !item.is_refunded);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !loading) {
        onClose();
        if (generatedCreditNote && onSuccess) onSuccess();
      }
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-[150]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
            <RotateCcw className="w-5 h-5 text-red-500" />
            Process Refund / Credit Note
          </DialogTitle>
          <DialogDescription>Receipt #{bill?.invoice_number || bill?.id?.split('-')[0].toUpperCase()}</DialogDescription>
        </DialogHeader>

        {generatedCreditNote ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Credit Note Generated!</h3>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg w-full max-w-sm space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between"><span className="text-slate-500">ID:</span><span className="font-mono">{generatedCreditNote.id.split('-')[0].toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount:</span><span className="font-bold text-blue-600">₹{generatedCreditNote.amount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Customer:</span><span>{generatedCreditNote.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Mobile:</span><span>{generatedCreditNote.customer_mobile}</span></div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Status:</span>
                <Badge className="badge-credit-active">Active</Badge>
              </div>
            </div>
            <Button className="mt-4" onClick={() => { onClose(); if (onSuccess) onSuccess(); }}>Close</Button>
          </div>
        ) : !hasRefundableItems ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">No refundable items available.</p>
          </div>
        ) : (
          <div className="space-y-6 my-2">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-100 dark:bg-slate-800/80">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">Select</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center w-[100px]">Qty</TableHead>
                    <TableHead className="text-right">Refund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill?.point_of_sale_sale_items?.map((item) => {
                    if (item.is_refunded) return null;
                    const st = selectedItems[item.id];
                    if (!st) return null;
                    
                    const itemNetTotal = Number(item.total_price || 0) + (Number(item.total_price || 0) * Number(item.tax_rate || 0) / 100);
                    const unitNetPrice = itemNetTotal / (item.quantity || 1);
                    const itemRefundTotal = unitNetPrice * st.qty;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-center">
                          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600 cursor-pointer" checked={st.selected} onChange={() => handleToggleItem(item.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{item.point_of_sale_products?.name}</TableCell>
                        <TableCell className="px-2">
                          <Input type="number" min="1" max={item.quantity} value={st.qty} onChange={(e) => handleQuantityChange(item.id, item.quantity, e.target.value)} disabled={!st.selected} className="h-8 text-center" />
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">{st.selected ? `₹${itemRefundTotal.toFixed(2)}` : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Customer Name <span className="text-red-500">*</span></label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Required" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Mobile Number <span className="text-red-500">*</span></label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Required" />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Reason <span className="text-red-500">*</span></label>
                <Input placeholder="e.g., Customer changed mind" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Total Refund:</span>
                <span className="text-xl font-black text-red-600">₹{totalRefundAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {!generatedCreditNote && hasRefundableItems && (
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleProcessRefund} disabled={loading || totalRefundAmount <= 0} className="bg-slate-800 hover:bg-slate-700 text-white">
              Refund to Source
            </Button>
            <Button onClick={handleGenerateCreditNote} disabled={loading || totalRefundAmount <= 0} className="bg-blue-600 hover:bg-blue-700 text-white">
              <FileText className="w-4 h-4 mr-2" /> Generate Credit Note
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RefundDialog;