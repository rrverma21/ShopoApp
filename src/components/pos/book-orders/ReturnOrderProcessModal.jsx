import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/currencyFormatter';
import { Loader2, User, Calendar, Store, MapPin, Phone } from 'lucide-react';

export default function ReturnOrderProcessModal({ returnOrder, isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState('Approved');
  const [comments, setComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [localReturnOrder, setLocalReturnOrder] = useState(null);
  const [enrichedItems, setEnrichedItems] = useState([]);
  const [totals, setTotals] = useState({ net: 0, cgst: 0, sgst: 0, total: 0 });
  const [retailerInfo, setRetailerInfo] = useState(null);
  const [customerAddress, setCustomerAddress] = useState('Address not available');
  const [customerPhone, setCustomerPhone] = useState('N/A');

  useEffect(() => {
    if (isOpen && returnOrder) {
      setLocalReturnOrder(returnOrder); // Set initially to avoid blank flashes
      setStatus('Approved');
      setComments('');
      fetchDetails();
    }
  }, [isOpen, returnOrder]);

  const fetchDetails = async () => {
    if (!returnOrder) return;
    setIsLoadingDetails(true);
    
    try {
      // 1. Fetch full return order to ensure we have executive_name, retailer_name, and booking_date
      const { data: fullReturnOrder, error: roError } = await supabase
        .from('return_orders')
        .select('*, return_order_items(*)')
        .eq('id', returnOrder.id)
        .single();
        
      if (roError) throw roError;
      
      const activeReturnOrder = fullReturnOrder || returnOrder;
      setLocalReturnOrder(activeReturnOrder);

      // 2. Fetch Product Details using the enriched items
      const itemsToProcess = activeReturnOrder.return_order_items || returnOrder.return_order_items || [];
      const productIds = itemsToProcess.map(item => item.product_id);
      
      let productDetails = [];
      if (productIds.length > 0) {
        const { data: pd, error: productError } = await supabase.rpc('fetch_return_product_details', { p_item_ids: productIds });
        if (productError) throw productError;
        productDetails = pd || [];
      }

      // 3. Fetch Retailer Details (Seller's info for Credit Note)
      const { data: profileData } = await supabase
        .from('pos_retailer_settings')
        .select('business_name, business_address, business_gstin')
        .eq('user_id', user.id)
        .single();
        
      // 4. Determine Customer Name, Address, and Phone
      let customerName = activeReturnOrder.retailer_name;
      
      // Fallback to booked order if retailer_name wasn't directly on the return order
      if (!customerName && activeReturnOrder.booked_order_id) {
         const { data: bookedData } = await supabase
           .from('booked_orders')
           .select('retailer_name')
           .eq('id', activeReturnOrder.booked_order_id)
           .single();
         if (bookedData?.retailer_name) customerName = bookedData.retailer_name;
      }
      
      if (!customerName) customerName = 'Customer';

      setRetailerInfo({
        company_name: profileData?.business_name || '',
        company_address: profileData?.business_address || '',
        company_gst: profileData?.business_gstin || '',
        bill_to_name: customerName,
      });

      // Fetch Customer Address and Mobile
      if (customerName && customerName !== 'Customer') {
        const { data: custData } = await supabase
          .from('point_of_sale_customers')
          .select('address, phone')
          .eq('user_id', user.id)
          .eq('name', customerName)
          .single();
          
        if (custData) {
          setCustomerAddress(custData.address || 'Address not available');
          setCustomerPhone(custData.phone || 'N/A');
        } else {
          setCustomerAddress('Address not available');
          setCustomerPhone('N/A');
        }
      } else {
        setCustomerAddress('Address not available');
        setCustomerPhone('N/A');
      }

      // 5. Calculate logic
      let netAmount = 0;
      let cgstAmount = 0;
      let sgstAmount = 0;
      
      const enriched = itemsToProcess.map(retItem => {
        const prodData = productDetails.find(p => p.id === retItem.product_id) || {};
        const basePrice = prodData.base_price || 0;
        const taxRate = prodData.tax_rate || 0;
        const qty = retItem.quantity || 1;
        
        const itemNet = basePrice * qty;
        const itemTax = itemNet * (taxRate / 100);
        const itemTotal = itemNet + itemTax;
        
        netAmount += itemNet;
        cgstAmount += (itemTax / 2);
        sgstAmount += (itemTax / 2);
        
        return {
          ...retItem,
          ...prodData,
          base_price: basePrice,
          total: itemTotal,
        };
      });

      setEnrichedItems(enriched);
      setTotals({
        net: netAmount,
        cgst: cgstAmount,
        sgst: sgstAmount,
        total: netAmount + cgstAmount + sgstAmount
      });

    } catch (err) {
      console.error('Error fetching details:', err);
      toast({
        title: "Failed to load details",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleProcess = async () => {
    if (!status) {
      toast({ title: "Please select an approval status", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    try {
      // Standardize the phone to 10 digits before saving ensuring consistency
      const cleanMobile = customerPhone !== 'N/A' && customerPhone
        ? customerPhone.replace(/\D/g, '').slice(-10)
        : '';

      const cnData = {
        company_name: retailerInfo.company_name,
        company_address: retailerInfo.company_address,
        company_gst: retailerInfo.company_gst,
        bill_to_name: retailerInfo.bill_to_name,
        bill_to_address: customerAddress !== 'Address not available' ? customerAddress : '',
        bill_to_gst: '',
        customer_mobile: cleanMobile,
        net_amount: totals.net,
        total_discount: 0,
        cgst_amount: totals.cgst,
        sgst_amount: totals.sgst,
        igst_amount: 0,
        total_amount: totals.total,
        items_json: enrichedItems
      };

      const { data, error } = await supabase.rpc('create_credit_note', {
        p_return_id: localReturnOrder.id,
        p_approval_status: status,
        p_approval_comments: comments,
        p_cn_data: cnData
      });

      if (error) throw error;

      toast({
        title: "Return Processed",
        description: data?.credit_note_number ? `Credit Note ${data.credit_note_number} Generated!` : 'Return status updated.',
        className: "bg-green-50 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-100 dark:border-green-800"
      });

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      toast({
        title: "Processing Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Process Return #{localReturnOrder?.id?.split('-')[0]?.toUpperCase() || '...'}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Review the items and generate a credit note for the customer.
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Order Details Header Section */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 md:p-5 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5" /> Executive Name
                  </p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {localReturnOrder?.executive_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" /> Booking Date
                  </p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(localReturnOrder?.booking_date)}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 uppercase tracking-wider">
                    <Store className="w-3.5 h-3.5" /> Retailer Name
                  </p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {localReturnOrder?.retailer_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 uppercase tracking-wider">
                    <Phone className="w-3.5 h-3.5" /> Retailer Mobile
                  </p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {customerPhone}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5" /> Retailer Address
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                    {customerAddress}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead className="text-slate-700 dark:text-slate-300">Product</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 text-center">Qty</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300">Reason</TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 text-right">Refund Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrichedItems.map((item, i) => (
                    <TableRow key={item.id || i} className="border-slate-200 dark:border-slate-800">
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">{item.product_name}</TableCell>
                      <TableCell className="text-center text-slate-600 dark:text-slate-400">{item.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                          {item.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-900 dark:text-slate-100 font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {enrichedItems.length === 0 && (
                    <TableRow className="border-slate-200 dark:border-slate-800">
                      <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <TableCell colSpan={3} className="text-right font-bold text-slate-900 dark:text-slate-100">Total Refund:</TableCell>
                    <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(totals.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-slate-700 dark:text-slate-300">Approval Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status" className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectItem value="Approved">Approved - Generate Credit Note</SelectItem>
                    <SelectItem value="Partial">Partial Approval</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="comments" className="text-slate-700 dark:text-slate-300">Approval Comments / Notes</Label>
                <Textarea 
                  id="comments"
                  placeholder="Enter any internal notes or reasons for rejection..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 min-h-[80px]"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            Cancel
          </Button>
          <Button 
            onClick={handleProcess} 
            disabled={isProcessing || isLoadingDetails}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : status === 'Rejected' ? (
              'Reject Return'
            ) : (
              'Process & Generate Credit Note'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}