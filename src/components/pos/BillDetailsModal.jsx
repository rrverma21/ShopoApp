import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, RotateCcw, AlertCircle, Download, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import RefundDialog from './RefundDialog';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useRegion } from '@/contexts/RegionContext';
import { formatCurrency } from '@/utils/currencyFormatter';
import { convertAmountToWords } from '@/utils/amountInWords';
import { formatAddress } from '@/utils/addressValidation';

const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

const safeFormatDate = (dateString, formatStr = 'dd MMM yyyy') => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? 'Invalid Date' : format(d, formatStr);
};

const BillDetailsModal = ({ billId, isOpen, onClose, onUpdatePayment, sale: passedSale }) => {
  const { toast } = useToast();
  const { currentRegion, regionConfig } = useRegion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bill, setBill] = useState(null);
  const [billType, setBillType] = useState(null);
  const [retailerInfo, setRetailerInfo] = useState(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [creditUsages, setCreditUsages] = useState([]);
  const [rewardsData, setRewardsData] = useState({ points: 0, value: 0 });

  const fetchBillDetails = useCallback(async () => {
    if (passedSale && !billId) {
        setBill(passedSale);
        setBillType('sale');
        if (passedSale.user_id) {
            const [settingsRes, profileRes] = await Promise.all([
                supabase.from('pos_retailer_settings').select('*').eq('user_id', passedSale.user_id).maybeSingle(),
                supabase.from('profiles').select('*').eq('id', passedSale.user_id).maybeSingle()
            ]);
            
            let addrStr = settingsRes.data?.business_address || profileRes.data?.street_address || '123 Business Avenue, Tech Park, City - 400001';
            try { if (addrStr.startsWith('{')) addrStr = JSON.parse(addrStr); } catch(e){}

            setRetailerInfo({
                name: settingsRes.data?.business_name || profileRes.data?.business_name || 'NINETY LAYERS ENTERPRISES',
                address: formatAddress(addrStr, currentRegion),
                gstin: settingsRes.data?.business_gstin || profileRes.data?.gstin || '27AADCB2230M1Z2',
                phone: profileRes.data?.phone || '+91 9876543210'
            });
        }
        
        // Fetch credit notes & rewards for passedSale
        const billIds = [];
        if (passedSale.id) billIds.push(passedSale.id.toString());
        if (passedSale.bill_number) billIds.push(passedSale.bill_number.toString());
        
        if (billIds.length > 0) {
            // The pos_credit_notes table doesn't have a credit_note_number column, we use the id instead
            const { data: usageData, error: usageError } = await supabase
                .from('pos_credit_note_usage')
                .select(`id, amount_used, pos_credit_notes (id)`)
                .in('bill_id', billIds)
                .neq('status', 'Cancelled');
            
            if (!usageError && usageData) {
                setCreditUsages(usageData);
            }

            // Rewards data is natively tracked in point_of_sale_sales
            setRewardsData({ 
                points: Number(passedSale.loyalty_points_redeemed || 0), 
                value: Number(passedSale.loyalty_discount_amount || 0) 
            });
        }
        return;
    }

    if (!billId || !isOpen) return;

    if (!isValidUUID(billId)) {
        setError("Invalid Bill ID format.");
        return;
    }
    
    setLoading(true);
    setError(null);
    setBillType(null);
    setBill(null);
    setRetailerInfo(null);
    setCreditUsages([]);
    setRewardsData({ points: 0, value: 0 });

    try {
      let fetchedBill = null;
      let type = null;

      const { data: saleData } = await supabase
        .from('point_of_sale_sales')
        .select(`*, point_of_sale_customers (*), point_of_sale_sale_items (*, point_of_sale_products (name, sku, hsn_code, selling_price, mrp))`)
        .eq('id', billId)
        .maybeSingle();

      if (saleData) {
        type = 'sale';
        fetchedBill = saleData;
        
        // Fetch credit notes usage
        const billIds = [];
        if (fetchedBill.id) billIds.push(fetchedBill.id.toString());
        if (fetchedBill.bill_number) billIds.push(fetchedBill.bill_number.toString());
        
        if (billIds.length > 0) {
            const { data: usageData, error: usageError } = await supabase
                .from('pos_credit_note_usage')
                .select(`id, amount_used, pos_credit_notes (id)`)
                .in('bill_id', billIds)
                .neq('status', 'Cancelled');
            
            if (!usageError && usageData) {
                setCreditUsages(usageData);
            }

            setRewardsData({ 
                points: Number(fetchedBill.loyalty_points_redeemed || 0), 
                value: Number(fetchedBill.loyalty_discount_amount || 0) 
            });
        }
      } else {
        const { data: purchaseData } = await supabase
          .from('purchase_bills')
          .select(`*, suppliers (*), purchase_bill_items (*, point_of_sale_products (name, sku, hsn_code, selling_price, mrp))`)
          .eq('id', billId)
          .maybeSingle();

        if (purchaseData) {
          type = 'purchase';
          fetchedBill = purchaseData;
        } else {
          throw new Error('No details found for the provided ID.');
        }
      }

      setBillType(type);
      setBill(fetchedBill);

      if (fetchedBill?.user_id) {
          const [settingsRes, profileRes] = await Promise.all([
              supabase.from('pos_retailer_settings').select('*').eq('user_id', fetchedBill.user_id).maybeSingle(),
              supabase.from('profiles').select('*').eq('id', fetchedBill.user_id).maybeSingle()
          ]);
          
          let addrStr = settingsRes.data?.business_address || profileRes.data?.street_address || '123 Business Avenue, Tech Park, City - 400001';
          try { if (addrStr.startsWith('{')) addrStr = JSON.parse(addrStr); } catch(e){}

          setRetailerInfo({
              name: settingsRes.data?.business_name || profileRes.data?.business_name || 'NINETY LAYERS ENTERPRISES',
              address: formatAddress(addrStr, currentRegion),
              gstin: settingsRes.data?.business_gstin || profileRes.data?.gstin || '27AADCB2230M1Z2',
              phone: profileRes.data?.phone || '+91 9876543210'
          });
      }

    } catch (err) {
      console.error('[BillDetailsModal] Error:', err);
      setError(err.message || 'An unexpected error occurred.');
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [billId, isOpen, passedSale, toast, currentRegion]);

  useEffect(() => {
    if (isOpen) fetchBillDetails();
    else { 
      setBill(null); 
      setBillType(null); 
      setError(null); 
      setShowRefundDialog(false); 
      setCreditUsages([]);
      setRewardsData({ points: 0, value: 0 });
    }
  }, [isOpen, fetchBillDetails]);

  const generateInvoicePDF = async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const printArea = document.getElementById('printable-bill-area');
    if (!printArea) {
      throw new Error('Invoice content not found');
    }
    const originalWidth = printArea.style.width;
    try {
      printArea.classList.add('force-desktop-layout');
      printArea.style.width = '900px'; 
      const canvas = await html2canvas(printArea, { 
        scale: 2, logging: false, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', windowWidth: 900, scrollY: -window.scrollY, scrollX: -window.scrollX, proxy: null 
      });
      printArea.classList.remove('force-desktop-layout');
      printArea.style.width = originalWidth;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;
      let pageCount = 1;
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - margin);
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pageCount++;
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin);
      }
      const isGSTInvoice = bill?.billing_type === 'gst_invoice';
      const docLabel = isGSTInvoice ? 'Invoice' : 'Bill';
      const invoiceNumber = invoiceData?.invoiceNo || (isGSTInvoice ? bill?.invoice_number : bill?.bill_number) || bill?.id?.substring(0, 8) || 'Doc';
      const timestamp = new Date().getTime();
      const filename = `${docLabel}_${invoiceNumber}_${timestamp}.pdf`;
      const blob = pdf.output('blob');
      return { blob, filename, invoiceNumber, docLabel };
    } catch (err) {
      printArea.classList.remove('force-desktop-layout');
      printArea.style.width = originalWidth;
      throw new Error('Failed to generate PDF: ' + err.message);
    }
  };

  const handleWhatsAppShare = async () => {
    let customerPhone = bill?.customer_phone || bill?.phone || '';
    if (!customerPhone || customerPhone.trim() === '') {
        toast({ title: 'Phone Number Missing', description: 'Customer phone number not available for WhatsApp sharing', variant: 'destructive' });
        return;
    }
    customerPhone = customerPhone.toString().trim().replace(/^\+91/, '').replace(/^91/, '').replace(/\D/g, '');
    if (customerPhone.length < 10) {
        toast({ title: 'Invalid Phone Number', description: 'Customer phone number must be valid', variant: 'destructive' });
        return;
    }
    setIsGeneratingPDF(true);
    try {
        const { blob, filename, invoiceNumber, docLabel } = await generateInvoicePDF();
        const totalAmount = invoiceData?.totals?.grandTotal || bill?.total_amount || 0;
        const invoiceDate = invoiceData?.date || safeFormatDate(bill?.created_at) || 'N/A';
        const customerName = invoiceData?.customerName || 'Customer';
        const messageText = `📄 *${docLabel} Details*\n\n${docLabel} No: ${invoiceNumber}\nDate: ${invoiceDate}\nCustomer: ${customerName}\nTotal Amount: ${formatCurrency(totalAmount, currentRegion)}\n\nThank you for your business!\n📎 PDF ${docLabel.toLowerCase()} is attached.`;
        const hasShareAPI = navigator.share && navigator.canShare;
        if (hasShareAPI) {
          try {
            const file = new File([blob], filename, { type: 'application/pdf' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ title: `${docLabel} ${invoiceNumber}`, text: messageText, files: [file] });
              toast({ title: 'Success', description: `${docLabel} shared successfully!` });
              return;
            }
          } catch (shareErr) {
            if (shareErr.name === 'AbortError') return;
            console.warn('[WhatsApp Share] Share API failed, falling back to WhatsApp Web:', shareErr.message);
          }
        }
        const encodedMessage = encodeURIComponent(`📄 *${docLabel} Details*\n\n${docLabel} No: ${invoiceNumber}\nDate: ${invoiceDate}\nCustomer: ${customerName}\nTotal Amount: ${formatCurrency(totalAmount, currentRegion)}\n\nThank you for your business!\n\nℹ️ Note: Please download the PDF ${docLabel.toLowerCase()} separately (browser download) and attach it to the chat.`);
        const whatsappPhone = `${regionConfig.phonePrefix.replace('+', '')}${customerPhone}`;
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        toast({ title: 'Opening WhatsApp Web', description: `PDF downloaded. Please attach it manually in WhatsApp chat.` });
    } catch (err) {
        toast({ title: 'Share Failed', description: err.message || 'Could not prepare document for sharing. Please try downloading the PDF instead.', variant: 'destructive' });
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  const handleExportPDF = async () => {
      setIsGeneratingPDF(true);
      try {
          const { blob, filename } = await generateInvoicePDF();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 100);
          toast({ title: 'Success', description: 'PDF downloaded successfully' });
      } catch (err) {
          toast({ title: 'Export Failed', description: err.message || 'Could not generate PDF', variant: 'destructive' });
      } finally {
          setIsGeneratingPDF(false);
      }
  };

  const isSale = billType === 'sale';
  const isPurchase = billType === 'purchase';
  const isGSTInvoice = bill?.billing_type === 'gst_invoice';
  const isWithoutGST = bill?.billing_type === 'without_gst';

  const invoiceData = useMemo(() => {
      if (!bill) return null;
      let parsedTaxBreakdown = {};
      try {
          if (typeof bill.tax_breakdown === 'string') {
              parsedTaxBreakdown = JSON.parse(bill.tax_breakdown);
          } else if (bill.tax_breakdown && typeof bill.tax_breakdown === 'object') {
              parsedTaxBreakdown = bill.tax_breakdown;
          }
      } catch (e) {
          console.warn("Failed to parse tax_breakdown", e);
      }
      
      let invoiceNumber = 'N/A';
      if (isGSTInvoice) {
          if (bill.invoice_number && bill.invoice_number.trim()) invoiceNumber = bill.invoice_number.trim();
          else if (bill.id) invoiceNumber = `INV-${bill.id.substring(0, 8).toUpperCase()}`;
      } else {
          if (bill.bill_number && bill.bill_number.trim()) invoiceNumber = bill.bill_number.trim();
          else if (bill.bill_no && bill.bill_no.trim()) invoiceNumber = bill.bill_no.trim();
          else if (bill.id) invoiceNumber = `BILL-${bill.id.substring(0, 8).toUpperCase()}`;
      }
      
      let invoiceDate = 'N/A';
      if (isGSTInvoice && bill.invoice_date) invoiceDate = safeFormatDate(bill.invoice_date);
      else if (isPurchase && bill.bill_date) invoiceDate = safeFormatDate(bill.bill_date);
      else if (bill.created_at) invoiceDate = safeFormatDate(bill.created_at);

      let custAddress = isSale ? (bill.customer_address || bill.point_of_sale_customers?.address || 'N/A') : (bill.suppliers?.address || 'N/A');
      try { if (custAddress.startsWith('{')) custAddress = JSON.parse(custAddress); } catch(e){}
      const formattedAddress = formatAddress(custAddress, currentRegion);
      
      const totalTaxAmt = Number(parsedTaxBreakdown.total_tax || parsedTaxBreakdown.tax_amount || bill.tax_amount || 0);
      
      let cgstAmt = Number(parsedTaxBreakdown.cgst_amount || parsedTaxBreakdown.total_cgst || parsedTaxBreakdown.cgst || 0);
      let sgstAmt = Number(parsedTaxBreakdown.sgst_amount || parsedTaxBreakdown.total_sgst || parsedTaxBreakdown.sgst || 0);
      
      if (cgstAmt === 0 && sgstAmt === 0 && totalTaxAmt > 0) {
          cgstAmt = totalTaxAmt / 2;
          sgstAmt = totalTaxAmt / 2;
      }

      const data = {
          invoiceNo: invoiceNumber,
          date: invoiceDate,
          customerName: isSale ? (bill.customer_name || bill.point_of_sale_customers?.name || 'Walk-in Customer') : (bill.suppliers?.name || 'Unknown Supplier'),
          customerAddress: formattedAddress,
          customerPhone: isSale ? (bill.customer_phone || bill.point_of_sale_customers?.phone || 'N/A') : (bill.suppliers?.phone || 'N/A'),
          customerGstin: isSale ? (bill.customer_gstin || bill.point_of_sale_customers?.gstin || 'N/A') : (bill.suppliers?.gst_number || 'N/A'),
          paymentStatus: bill.payment_status || bill.status || 'Pending',
          paymentMethod: bill.payment_method || 'N/A',
          items: [],
          totals: {
              taxable: Number(parsedTaxBreakdown.total_taxable_value || parsedTaxBreakdown.taxable_value || bill.subtotal || 0),
              cgst: cgstAmt,
              sgst: sgstAmt,
              discount: Number(bill.discount_amount || 0),
              totalTax: totalTaxAmt,
              grandTotal: Number(parsedTaxBreakdown.grand_total || bill.final_amount || bill.total_amount || 0)
          }
      };

      let itemsSource = [];
      if (isSale) {
          if (Array.isArray(bill.item_gst_details)) {
              itemsSource = bill.item_gst_details;
          } else if (typeof bill.item_gst_details === 'string') {
              try { itemsSource = JSON.parse(bill.item_gst_details); } catch(e){}
          }
          
          if (!itemsSource || itemsSource.length === 0) {
              itemsSource = bill.point_of_sale_sale_items || [];
          }

          if (!itemsSource || itemsSource.length === 0) {
              if (Array.isArray(bill.cart_items)) itemsSource = bill.cart_items;
              else if (typeof bill.cart_items === 'string') {
                  try { itemsSource = JSON.parse(bill.cart_items); } catch(e){}
              }
          }
      } else if (isPurchase) {
          itemsSource = bill.purchase_bill_items || [];
          if (!itemsSource || itemsSource.length === 0) {
              if (Array.isArray(bill.items)) itemsSource = bill.items;
              else if (typeof bill.items === 'string') {
                  try { itemsSource = JSON.parse(bill.items); } catch(e){}
              }
          }
      }

      data.items = itemsSource.map((item, idx) => {
          const qty = Number(item.quantity || 0);
          const rate = Number(item.unit_price || item.rate || 0);
          const mrp = Number(item.mrp || item.original_mrp || item.point_of_sale_products?.mrp || item.point_of_sale_products?.selling_price || rate);
          
          let discountAmt = 0;
          let discountPercent = 0;
          let discountType = item.discount_type || 'amount';
          
          if (item.discount_percentage) {
              discountPercent = Number(item.discount_percentage);
              discountType = 'percentage';
          } else if (item.discount_percent) {
              discountPercent = Number(item.discount_percent);
              discountType = 'percentage';
          }

          if (item.discount && typeof item.discount === 'object') {
              if (item.discount.type === 'percentage') {
                  discountPercent = Number(item.discount.value);
                  discountAmt = (qty * mrp) * (discountPercent / 100);
                  discountType = 'percentage';
              } else {
                  discountAmt = Number(item.discount.value);
                  if (qty * mrp > 0) discountPercent = (discountAmt / (qty * mrp)) * 100;
              }
          } else {
              discountAmt = Number(item.discount || item.discount_amount || 0);
              if (discountAmt > 0 && discountPercent === 0 && (qty * mrp) > 0) {
                   discountPercent = (discountAmt / (qty * mrp)) * 100;
              }
          }
          
          discountPercent = discountPercent > 0 ? Number(discountPercent.toFixed(2)) : 0;

          const taxRate = Number(item.gst_rate || item.tax_rate || item.gst_percentage || 0);
          let amount = Number(item.amount || item.total_price || 0);
          let taxable = Number(item.taxable_value || item.total_price || (qty * rate - discountAmt));
          let gstAmount = Number(item.tax_amount || item.gst_amount || 0);

          if (gstAmount === 0 && taxRate > 0) {
              gstAmount = (taxable * taxRate) / 100;
          }

          if (amount === 0) {
              amount = taxable + gstAmount;
          } else if (isPurchase && !item.tax_amount && !item.gst_amount) {
              gstAmount = amount - (amount / (1 + (taxRate / 100)));
          }

          return { 
              no: idx + 1, 
              name: item.name || item.product_name || item.point_of_sale_products?.name || 'Item', 
              hsn: item.hsn_code || item.point_of_sale_products?.hsn_code || '-', 
              qty: Number(qty).toFixed(3).replace(/\.?0+$/, ''), 
              mrp: mrp,
              rate: rate, 
              gstRate: taxRate, 
              gstAmount: gstAmount, 
              discount: discountAmt, 
              discountType: discountType,
              discountPercent: discountPercent,
              amount: amount, 
              isRefunded: item.is_refunded || false 
          };
      });

      return data;
  }, [bill, isSale, isPurchase, isGSTInvoice, currentRegion]);

  // Payment Breakdown Calculations
  const totalCreditApplied = creditUsages.reduce((sum, usage) => sum + Number(usage.amount_used || 0), 0);
  const rewardsPointsRedeemed = rewardsData.points;
  const rewardsDiscountValue = rewardsData.value;

  let amountPaid = Number(bill?.amount_paid || 0);
  if (bill?.amount_paid === undefined || bill?.amount_paid === null) {
      if (invoiceData?.paymentStatus === 'Paid' || invoiceData?.paymentStatus === 'Completed') {
          amountPaid = Math.max(0, (invoiceData?.totals?.grandTotal || 0) - totalCreditApplied - rewardsDiscountValue);
      }
  }

  const totalPayment = amountPaid + totalCreditApplied + rewardsDiscountValue;

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-5xl max-h-[95vh] overflow-y-auto p-0 bg-white border border-slate-200 shadow-2xl z-[100] print:w-full print:max-w-full print:h-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:shadow-none print:border-none print:p-0 print:m-0 print:static print:transform-none print:translate-x-0 print:translate-y-0 print:block">
          <DialogHeader className="no-print p-4 sm:p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-slate-800 flex items-center flex-wrap gap-2 sm:gap-3">
                  {isPurchase ? 'Purchase Bill Details' : 'Transaction Details'}
                  {isGSTInvoice && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 text-xs sm:text-sm">{regionConfig.tax.name} Invoice</Badge>}
                  {isWithoutGST && <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-300 text-xs sm:text-sm">Without {regionConfig.tax.name} Bill</Badge>}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-slate-500 mt-1">Professional document view. Ready for printing and sharing.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 min-h-[400px]">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-500">Loading document data...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="bg-red-50 p-4 rounded-full mb-4"><AlertCircle className="h-8 w-8 text-red-500" /></div>
              <h3 className="text-lg font-bold text-slate-800">Error Loading Document</h3>
              <p className="text-slate-500 mt-2 mb-6">{error}</p>
              <Button onClick={fetchBillDetails} variant="outline">Try Again</Button>
            </div>
          )}

          {!loading && !error && bill && invoiceData && retailerInfo && (
            <div className="p-4 sm:p-10 print:p-0 bg-white text-black font-sans mx-auto w-full max-w-5xl receipt-content print:block print:visible opacity-100" id="printable-bill-area" style={{ color: '#000' }}>
              
              <div className="flex flex-col sm:flex-row [.force-desktop-layout_&]:flex-row justify-between items-start mb-6 print:flex-row print:flex">
                  <div className="flex-1 pr-4 mb-4 sm:mb-0 [.force-desktop-layout_&]:mb-0">
                      <h1 className="text-xl sm:text-3xl font-bold text-[#1E40AF] tracking-wide uppercase print:text-[#1E40AF]" style={{ color: '#1E40AF' }}>{retailerInfo.name}</h1>
                      <p className="text-xs sm:text-sm mt-1 sm:mt-2 text-gray-800 whitespace-pre-wrap">{retailerInfo.address}</p>
                      <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-2 [.force-desktop-layout_&]:grid-cols-2 gap-y-1 gap-x-4 max-w-md text-xs sm:text-sm text-gray-800">
                          {isGSTInvoice && <p><strong className="font-semibold">{regionConfig.invoiceLabels.taxId}:</strong> {retailerInfo.gstin}</p>}
                          <p><strong className="font-semibold">Phone:</strong> {retailerInfo.phone}</p>
                      </div>
                  </div>
                  <div className="mt-2 sm:mt-0 text-left sm:text-right [.force-desktop-layout_&]:text-right print:mt-0 print:text-right w-full sm:w-auto [.force-desktop-layout_&]:w-auto">
                      <h2 className="text-lg sm:text-2xl font-bold text-[#1E40AF] uppercase tracking-wider print:text-[#1E40AF]" style={{ color: '#1E40AF' }}>
                          {isGSTInvoice ? regionConfig.invoiceLabels.taxInvoice : 'RECEIPT / BILL'}
                      </h2>
                      <div className="mt-2 inline-block text-left bg-gray-50 p-3 rounded border border-gray-100 print:border-gray-300 w-full sm:w-auto [.force-desktop-layout_&]:w-auto">
                          <p className="text-xs sm:text-sm text-gray-800 mb-1">
                              <strong className="font-semibold">{isGSTInvoice ? 'Invoice No:' : 'Bill No:'}</strong> 
                              <span className="ml-2 font-mono">{invoiceData.invoiceNo}</span>
                          </p>
                          <p className="text-xs sm:text-sm text-gray-800"><strong className="font-semibold">Date:</strong> <span className="ml-2">{invoiceData.date}</span></p>
                      </div>
                  </div>
              </div>

              <div className="border-b-2 border-[#1E40AF] w-full mb-6 print:border-[#1E40AF]" style={{ borderColor: '#1E40AF' }}></div>

              <div className="grid grid-cols-1 sm:grid-cols-2 [.force-desktop-layout_&]:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 print:grid-cols-2 print:grid">
                  <div className="bg-[#F9FAFB] p-3 sm:p-4 rounded-md border border-gray-200 print:bg-[#F9FAFB] print:border-gray-300" style={{ backgroundColor: '#F9FAFB' }}>
                      <h3 className="text-[10px] sm:text-xs font-bold text-[#1E40AF] mb-2 sm:mb-3 uppercase tracking-wider border-b border-gray-200 pb-2 print:text-[#1E40AF]" style={{ color: '#1E40AF' }}>{isSale ? 'Bill To (Buyer)' : 'Supplier Details'}</h3>
                      <p className="font-bold text-sm sm:text-base text-gray-900 mb-1">{invoiceData.customerName}</p>
                      {isGSTInvoice && <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-2 min-h-[20px] sm:min-h-[40px]">{invoiceData.customerAddress}</p>}
                      <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                          <p><strong className="font-medium text-gray-900">Phone:</strong> {invoiceData.customerPhone}</p>
                          {isGSTInvoice && invoiceData.customerGstin !== 'N/A' && (
                              <p><strong className="font-medium text-gray-900">{regionConfig.invoiceLabels.taxId}:</strong> {invoiceData.customerGstin}</p>
                          )}
                      </div>
                  </div>

                  <div className="bg-[#F9FAFB] p-3 sm:p-4 rounded-md border border-gray-200 print:bg-[#F9FAFB] print:border-gray-300" style={{ backgroundColor: '#F9FAFB' }}>
                      <h3 className="text-[10px] sm:text-xs font-bold text-[#1E40AF] mb-2 sm:mb-3 uppercase tracking-wider border-b border-gray-200 pb-2 print:text-[#1E40AF]" style={{ color: '#1E40AF' }}>Payment Information</h3>
                      <div className="space-y-2 sm:space-y-3 mt-2">
                          <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600 font-medium">Payment Status:</span>
                              <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider", invoiceData.paymentStatus === 'Paid' || invoiceData.paymentStatus === 'Completed' ? "bg-green-100 text-green-800 border-green-300 print:bg-white print:text-black" : invoiceData.paymentStatus?.includes('Refund') ? "bg-orange-100 text-orange-800 border-orange-300 print:bg-white print:text-black" : "bg-red-100 text-red-800 border-red-300 print:bg-white print:text-black")}>{invoiceData.paymentStatus}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600 font-medium">Payment Method:</span>
                              <span className="text-xs sm:text-sm font-semibold text-gray-900">{invoiceData.paymentMethod}</span>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                              <span className="text-xs sm:text-sm text-gray-600 font-medium">Amount Paid:</span>
                              <span className="text-xs sm:text-sm font-bold text-gray-900">{formatCurrency(amountPaid, currentRegion)}</span>
                          </div>

                          {totalCreditApplied > 0 && (
                              <div className="pt-2 border-t border-gray-200 mt-2">
                                  <div className="flex justify-between items-center">
                                      <span className="text-xs sm:text-sm text-gray-600 font-medium">Credit Notes Applied:</span>
                                      <span className="text-xs sm:text-sm font-bold text-gray-900">{formatCurrency(totalCreditApplied, currentRegion)}</span>
                                  </div>
                                  {creditUsages.length > 0 && (
                                      <div className="text-[10px] text-gray-500 text-right mt-0.5">
                                          ({creditUsages.map(u => u.pos_credit_notes?.id ? `CN-${u.pos_credit_notes.id.substring(0,8).toUpperCase()}` : 'CN').join(', ')})
                                      </div>
                                  )}
                              </div>
                          )}

                          {rewardsPointsRedeemed > 0 && (
                              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Rewards Points:</span>
                                  <span className="text-xs sm:text-sm font-bold text-gray-900">{rewardsPointsRedeemed} points ({formatCurrency(rewardsDiscountValue, currentRegion)})</span>
                              </div>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                              <span className="text-xs sm:text-sm text-gray-800 font-bold">Total Payment:</span>
                              <span className="text-xs sm:text-sm font-bold text-green-700">{formatCurrency(totalPayment, currentRegion)}</span>
                          </div>

                          {(bill.balance_due > 0) && (
                              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                                  <span className="text-xs sm:text-sm text-gray-600 font-medium">Balance Due:</span>
                                  <span className="text-xs sm:text-sm font-bold text-red-600">{formatCurrency(bill.balance_due, currentRegion)}</span>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="mb-6">
                  <div className="hidden sm:block print:block [.force-desktop-layout_&]:block rounded-md overflow-hidden border border-gray-200 print:border-gray-400">
                      <table className="w-full text-left border-collapse print:border-collapse">
                          <thead>
                              <tr className="bg-slate-100 text-slate-900 print:bg-slate-100 print:text-slate-900 border-b border-slate-300" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                                  <th className="py-2.5 px-3 text-xs font-bold w-[40px] border-r border-slate-200 print:border-slate-300">#</th>
                                  <th className="py-2.5 px-3 text-xs font-bold border-r border-slate-200 print:border-slate-300">Item Description</th>
                                  <th className="py-2.5 px-3 text-xs font-bold w-[60px] text-right border-r border-slate-200 print:border-slate-300">Qty</th>
                                  <th className="py-2.5 px-3 text-xs font-bold w-[80px] text-right border-r border-slate-200 print:border-slate-300">MRP</th>
                                  <th className="py-2.5 px-3 text-xs font-bold w-[80px] text-right border-r border-slate-200 print:border-slate-300">Rate</th>
                                  <th className="py-2.5 px-3 text-xs font-bold w-[70px] text-right border-r border-slate-200 print:border-slate-300">HSN No.</th>
                                  <th className="py-2.5 px-3 text-xs font-bold w-[60px] text-right border-r border-slate-200 print:border-slate-300">{regionConfig.tax.name} %</th>
                                  <th className="py-2.5 px-3 text-xs font-bold w-[80px] text-right border-r border-slate-200 print:border-slate-300">{regionConfig.tax.name} Amt</th>
                                  <th className="py-2.5 px-3 text-xs font-bold w-[100px] text-right border-r border-slate-200 print:border-slate-300">Discount</th>
                                  <th className="py-2.5 px-3 text-xs font-bold w-[100px] text-right">Amount</th>
                              </tr>
                          </thead>
                          <tbody>
                              {invoiceData.items.length > 0 ? (
                                  invoiceData.items.map((item, index) => (
                                      <tr key={index} className={cn("border-b border-gray-200 print:border-gray-300", index % 2 === 0 ? "bg-white" : "bg-[#F9FAFB] print:bg-[#F9FAFB]", item.isRefunded && "opacity-50 line-through text-gray-500")} style={index % 2 !== 0 ? { backgroundColor: '#F9FAFB' } : {}}>
                                          <td className="py-3 px-3 text-xs border-r border-gray-200 print:border-gray-300 text-center">{item.no}</td>
                                          <td className="py-3 px-3 text-xs border-r border-gray-200 print:border-gray-300 font-medium text-gray-900">{item.name}{item.isRefunded && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1 py-0.5 rounded no-underline inline-block">Refunded</span>}</td>
                                          <td className="py-3 px-3 text-xs border-r border-gray-200 print:border-gray-300 text-right font-medium">{item.qty}</td>
                                          <td className="py-3 px-3 text-xs border-r border-gray-200 print:border-gray-300 text-right text-gray-700">{formatCurrency(item.mrp, currentRegion)}</td>
                                          <td className="py-3 px-3 text-xs border-r border-gray-200 print:border-gray-300 text-right text-gray-700">{formatCurrency(item.rate, currentRegion)}</td>
                                          <td className="py-3 px-3 text-xs border-r border-gray-200 print:border-gray-300 text-right text-gray-700">{item.hsn}</td>
                                          <td className="py-3 px-3 text-xs border-r border-gray-200 print:border-gray-300 text-right text-gray-700">{item.gstRate !== undefined && item.gstRate !== null ? `${item.gstRate}%` : '-'}</td>
                                          <td className="py-3 px-3 text-xs border-r border-gray-200 print:border-gray-300 text-right text-gray-700">{formatCurrency(item.gstAmount, currentRegion)}</td>
                                          <td className="py-3 px-3 text-xs border-r border-gray-200 print:border-gray-300 text-right text-gray-700">
                                            {item.discount > 0 ? (
                                              <span className="whitespace-nowrap text-green-700 font-medium">
                                                {formatCurrency(item.discount, currentRegion)}
                                                {item.discountType === 'percentage' && item.discountPercent > 0 ? ` (${item.discountPercent}%)` : ''}
                                              </span>
                                            ) : '-'}
                                          </td>
                                          <td className="py-3 px-3 text-sm border-gray-200 print:border-gray-300 text-right font-bold text-gray-900">{formatCurrency(item.amount, currentRegion)}</td>
                                      </tr>
                                  ))
                              ) : (<tr><td colSpan={10} className="py-8 text-center text-gray-500 text-sm italic">No items found for this document.</td></tr>)}
                          </tbody>
                      </table>
                  </div>

                  <div className="block sm:hidden print:hidden [.force-desktop-layout_&]:hidden space-y-3">
                      {invoiceData.items.length > 0 ? (
                          invoiceData.items.map((item, index) => (
                              <div key={index} className={cn("bg-white border border-gray-200 rounded-lg p-3 shadow-sm relative", item.isRefunded && "opacity-60 bg-gray-50")}>
                                  {item.isRefunded && <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-bl-lg rounded-tr-lg font-bold">REFUNDED</div>}
                                  <div className="font-bold text-gray-900 mb-2 text-sm pr-16 leading-tight">{item.no}. {item.name}</div>
                                  <div className="grid grid-cols-4 gap-2 text-xs mb-2 pb-2 border-b border-gray-100">
                                      <div><span className="text-gray-500 block text-[10px] uppercase mb-0.5">Qty</span><span className="font-medium text-sm">{item.qty}</span></div>
                                      <div><span className="text-gray-500 block text-[10px] uppercase mb-0.5">MRP</span><span className="font-medium text-sm">{formatCurrency(item.mrp, currentRegion)}</span></div>
                                      <div><span className="text-gray-500 block text-[10px] uppercase mb-0.5">Rate</span><span className="font-medium text-sm">{formatCurrency(item.rate, currentRegion)}</span></div>
                                      <div className="text-right"><span className="text-gray-500 block text-[10px] uppercase mb-0.5">Amount</span><span className="font-bold text-gray-900 text-sm">{formatCurrency(item.amount, currentRegion)}</span></div>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded flex justify-between items-center text-[10px] text-gray-600 flex-wrap gap-1">
                                      <div>HSN: <span className="font-medium text-gray-800">{item.hsn}</span></div>
                                      {item.gstRate !== undefined && item.gstRate !== null && (
                                          <div>{regionConfig.tax.name} ({item.gstRate}%): <span className="font-medium text-gray-800">{formatCurrency(item.gstAmount, currentRegion)}</span></div>
                                      )}
                                      {item.discount > 0 && (
                                          <div className="text-green-700 font-medium">
                                            Disc: -{formatCurrency(item.discount, currentRegion)}
                                            {item.discountType === 'percentage' && item.discountPercent > 0 ? ` (${item.discountPercent}%)` : ''}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))
                      ) : (<div className="text-center py-8 text-gray-500 text-sm italic bg-gray-50 rounded-lg border border-gray-200">No items found for this document.</div>)}
                  </div>
              </div>

              <div className="bg-[#F9FAFB] p-3 rounded border border-gray-200 mb-6 print:bg-[#F9FAFB] print:border-gray-300" style={{ backgroundColor: '#F9FAFB' }}>
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-1 font-medium">Amount in Words:</p>
                  <p className="text-xs sm:text-sm font-bold text-[#1E40AF] italic print:text-[#1E40AF] break-words" style={{ color: '#1E40AF' }}>
                      {convertAmountToWords(invoiceData.totals.grandTotal, currentRegion)}
                  </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 [.force-desktop-layout_&]:grid-cols-12 gap-6 sm:gap-8 print:grid-cols-12 print:grid">
                  <div className="sm:col-span-7 [.force-desktop-layout_&]:col-span-7 print:col-span-7 order-2 sm:order-1 [.force-desktop-layout_&]:order-1">
                      <h3 className="text-xs font-bold text-[#1E40AF] mb-2 uppercase tracking-wider print:text-[#1E40AF]" style={{ color: '#1E40AF' }}>Terms & Conditions:</h3>
                      <ul className="text-[10px] text-gray-600 list-disc pl-4 space-y-1.5 leading-relaxed">
                          <li>Goods once sold will not be taken back or exchanged unless authorized.</li>
                          <li>All disputes are subject to local jurisdiction only.</li>
                          <li>Interest @ 18% p.a. will be charged if payment is delayed beyond agreed terms.</li>
                          <li>E. & O.E. (Errors and Omissions Excepted).</li>
                      </ul>
                  </div>

                  <div className="sm:col-span-5 [.force-desktop-layout_&]:col-span-5 print:col-span-5 order-1 sm:order-2 [.force-desktop-layout_&]:order-2">
                      <div className="bg-white border border-gray-200 rounded p-4 print:border-gray-400 shadow-sm sm:shadow-none">
                          <div className="space-y-2 text-xs sm:text-sm">
                              <div className="flex justify-between text-gray-700">
                                  <span>{isGSTInvoice ? 'Total Taxable Amount' : 'Subtotal'}</span>
                                  <span className="font-medium">{formatCurrency(invoiceData.totals.taxable, currentRegion)}</span>
                              </div>
                              {invoiceData.totals.discount > 0 && (
                                  <div className="flex justify-between text-green-600">
                                      <span>Discount</span>
                                      <span className="font-medium">-{formatCurrency(invoiceData.totals.discount, currentRegion)}</span>
                                  </div>
                              )}
                              {isGSTInvoice && (
                                <>
                                  <div className="flex justify-between text-gray-700">
                                      <span>Total Tax 1 (CGST)</span>
                                      <span className="font-medium">{formatCurrency(invoiceData.totals.cgst, currentRegion)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-700">
                                      <span>Total Tax 2 (SGST)</span>
                                      <span className="font-medium">{formatCurrency(invoiceData.totals.sgst, currentRegion)}</span>
                                  </div>
                                </>
                              )}
                              {(bill.round_off_amount || 0) !== 0 && (
                                  <div className="flex justify-between text-gray-500 text-[10px] sm:text-xs">
                                      <span>Round Off</span>
                                      <span>{Number(bill.round_off_amount) > 0 ? '+' : ''}{formatCurrency(bill.round_off_amount, currentRegion)}</span>
                                  </div>
                              )}
                          </div>
                          
                          <div className="border-t-2 border-gray-200 my-3 print:border-gray-400"></div>
                          
                          <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">Grand Total</span>
                              <span className="text-xl sm:text-2xl font-black text-[#1E40AF] print:text-[#1E40AF]" style={{ color: '#1E40AF' }}>
                                  {formatCurrency(invoiceData.totals.grandTotal, currentRegion)}
                              </span>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="mt-12 sm:mt-16 flex justify-center sm:justify-end print:mt-24">
                  <div className="text-center w-48 sm:w-64">
                      <div className="border-b border-gray-400 mb-2 w-full"></div>
                      <p className="text-xs sm:text-sm font-bold text-gray-800 truncate px-2">For {retailerInfo.name}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Authorized Signatory</p>
                  </div>
              </div>
              <div className="mt-8 sm:mt-12 text-center text-[8px] sm:text-[10px] text-gray-400 italic pt-4 border-t border-gray-100 print:mt-16">This is a computer generated document and does not require a physical signature.</div>
            </div>
          )}

          <DialogFooter className="no-print p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 items-center rounded-b-lg">
            {!error && bill && (
              <>
                <Button variant="outline" onClick={handleExportPDF} className="w-full sm:w-auto font-semibold border-slate-300 shadow-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={loading || !bill || !invoiceData || isGeneratingPDF}>
                    {isGeneratingPDF ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Download className="w-4 h-4 mr-2" />Export PDF</>}
                </Button>
                <Button onClick={handleWhatsAppShare} className="w-full sm:w-auto font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm sm:shadow-md transition-colors" disabled={loading || !bill || isGeneratingPDF}>
                    {isGeneratingPDF ? <><Loader2 className="w-4 h-4 mr-2 text-white animate-spin" />Generating PDF...</> : <><MessageCircle className="w-4 h-4 mr-2 text-white" />Share via WhatsApp</>}
                </Button>
              </>
            )}
            {!error && bill && isSale && (!bill.status?.includes('Fully Refunded')) && (
              <Button onClick={() => setShowRefundDialog(true)} variant="outline" className="w-full sm:w-auto font-semibold text-red-600 border-red-200 hover:bg-red-50 transition-colors shadow-sm sm:shadow-none" disabled={loading || !bill || isGeneratingPDF}>
                <RotateCcw className="w-4 h-4 mr-2" /> Process Refund
              </Button>
            )}
            {!error && bill && isPurchase && onUpdatePayment && (
                <Button onClick={() => { if (bill) { onUpdatePayment(bill); onClose(); } }} className="w-full sm:w-auto font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm sm:shadow-md transition-colors" disabled={loading || !bill || isGeneratingPDF}>
                    <Edit className="w-4 h-4 mr-2" /> Update Payment
                </Button>
            )}
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto font-semibold border-slate-300 shadow-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800" disabled={loading}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RefundDialog bill={bill} isOpen={showRefundDialog} onClose={() => setShowRefundDialog(false)} onSuccess={() => { setShowRefundDialog(false); fetchBillDetails(); }} />
    </>
  );
};

export default BillDetailsModal;