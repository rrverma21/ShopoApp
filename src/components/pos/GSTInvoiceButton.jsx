import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Download, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { formatPrice, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { convertAmountToWords } from '@/utils/amountInWords';
import { useToast } from '@/components/ui/use-toast';

const GSTInvoiceButton = ({ bill, billItems, buttonStyle = 'default', settings: propSettings, className }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState(propSettings || null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (propSettings) return;
      if (!bill?.user_id) return;

      try {
        const { data, error } = await supabase
          .from('pos_retailer_settings')
          .select('*')
          .eq('user_id', bill.user_id)
          .maybeSingle();
        
        if (data) setSettings(data);
        
        if (!data) {
           const { data: profile } = await supabase.from('profiles').select('*').eq('id', bill.user_id).single();
           if(profile) {
               setSettings({
                   business_name: profile.business_name,
                   business_address: profile.street_address + ', ' + profile.city,
                   business_gstin: profile.gstin,
                   phone: profile.phone,
                   tax_type: 'GST'
               });
           }
        }
      } catch (err) {
        console.error("Error fetching invoice settings:", err);
      }
    };

    if (!settings && bill) {
      fetchSettings();
    }
  }, [bill, propSettings, settings]);

  const generatePDF = async () => {
    if (!bill || !settings) {
        toast({ title: "Settings missing", description: "Business details not found for invoice.", variant: "destructive" });
        return;
    }
    
    setIsGenerating(true);

    try {
      const items = billItems || bill.items || [];
      const isGSTInvoice = bill.billing_type === 'gst_invoice';
      const taxName = bill.tax_type || settings.tax_type || 'GST';
      
      const invoiceNo = isGSTInvoice 
        ? (bill.invoice_number || `INV-${bill.id.substring(0, 8).toUpperCase()}`)
        : (bill.bill_number || `BILL-${bill.id.substring(0, 8).toUpperCase()}`);
        
      const invoiceDate = bill.created_at ? format(new Date(bill.created_at), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');
      
      const billingMode = bill.billing_mode || (bill.order_type === 'Wholesaler' ? 'wholesale' : 'retail');
      const invoiceTypeHeader = isGSTInvoice 
        ? (billingMode === 'wholesale' ? 'WHOLESALE TAX INVOICE' : 'TAX INVOICE') 
        : (billingMode === 'wholesale' ? 'WHOLESALE BILL' : 'RETAIL BILL');

      const businessName = settings.business_name || 'Business Name';
      const businessAddress = settings.business_address || 'Address Not Provided';
      const businessGSTIN = settings.business_gstin || 'N/A';
      const businessPhone = settings.phone || 'N/A';
      const businessStateCode = settings.state_code || '27';

      const bankName = settings.seller_bank_name || '';
      const accNumber = settings.seller_bank_account_number || '';
      const ifscCode = settings.seller_bank_ifsc || '';
      const branchName = settings.seller_bank_branch || '';
      const upiId = settings.seller_upi_id || '';
      const qrCodeUrl = settings.seller_qr_code || '';

      const customerName = bill.customer?.name || bill.customer_name || 'Walk-in Customer';
      const customerPhone = bill.customer?.phone || bill.customer_phone || '';
      const customerFirmName = bill.customer?.firm_name || '';
      const customerAddress = bill.customer?.address || '';
      const customerGSTIN = bill.customer?.customer_gstin || bill.customer?.gstin || '';
      const customerStateCode = bill.customer?.customer_state_code || businessStateCode;

      const isInterState = customerStateCode !== businessStateCode;

      let totalTaxable = 0;
      let totalSGST = 0;
      let totalCGST = 0;
      let totalIGST = 0;
      let generalTotalTax = 0;
      
      const itemsRows = items.map((item, index) => {
        const rawQty = parseFloat(item.quantity || item.refundQty || 0);
        const qty = Number(rawQty).toFixed(3).replace(/\.?0+$/, '');
        
        const taxRate = item.tax_rate !== null && item.tax_rate !== undefined ? parseFloat(item.tax_rate) : 0;
        let taxableValue = 0;
        let unitPrice = 0;

        const rawTotal = parseFloat(item.total_price || (item.selling_price * rawQty) || 0);
        
        taxableValue = rawTotal / (1 + (taxRate / 100));
        unitPrice = taxableValue / (rawQty || 1);

        const taxAmount = rawTotal - taxableValue;
        
        let sgstAmt = 0, cgstAmt = 0, igstAmt = 0;
        let sgstRate = 0, cgstRate = 0, igstRate = 0;

        if (taxName === 'GST') {
            if (isInterState) {
                igstRate = taxRate;
                igstAmt = taxAmount;
            } else {
                sgstRate = taxRate / 2;
                cgstRate = taxRate / 2;
                sgstAmt = taxAmount / 2;
                cgstAmt = taxAmount / 2;
            }
            totalSGST += sgstAmt;
            totalCGST += cgstAmt;
            totalIGST += igstAmt;
        } else {
            generalTotalTax += taxAmount;
        }

        totalTaxable += taxableValue;

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
            <td style="padding: 6px; text-align: center;">${index + 1}</td>
            <td style="padding: 6px; text-align: left;">
              <div style="font-weight: 600; color: #1e293b;">${item.product?.name || item.product_name || item.name || 'Item'}</div>
              ${item.variant_name ? `<div style="font-size: 9px; color: #64748b;">${item.variant_name}</div>` : ''}
            </td>
            <td style="padding: 6px; text-align: left;">${item.hsn_code || item.product?.hsn_code || '-'}</td>
            <td style="padding: 6px; text-align: center;">${qty}</td>
            <td style="padding: 6px; text-align: right;">${formatPrice(unitPrice)}</td>
            <td style="padding: 6px; text-align: right;">${formatPrice(taxableValue)}</td>
            ${taxName === 'GST' ? (
              !isInterState ? `
              <td style="padding: 6px; text-align: right;">${formatPrice(sgstAmt)}<br><span style="font-size: 8px; color: #64748b;">(${sgstRate}%)</span></td>
              <td style="padding: 6px; text-align: right;">${formatPrice(cgstAmt)}<br><span style="font-size: 8px; color: #64748b;">(${cgstRate}%)</span></td>
              ` : `
              <td style="padding: 6px; text-align: right;">${formatPrice(igstAmt)}<br><span style="font-size: 8px; color: #64748b;">(${igstRate}%)</span></td>
              `
            ) : `
              <td style="padding: 6px; text-align: right;">${formatPrice(taxAmount)}<br><span style="font-size: 8px; color: #64748b;">(${taxRate}%)</span></td>
            `}
            <td style="padding: 6px; text-align: right; font-weight: bold;">${formatPrice(rawTotal)}</td>
          </tr>
        `;
      }).join('');

      const totalAmount = bill.total_amount || (totalTaxable + totalSGST + totalCGST + totalIGST + generalTotalTax);
      const amountInWords = convertAmountToWords(totalAmount);

      const invoiceHTML = `
        <div style="padding: 30px; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.4; font-size: 11px; max-width: 800px; margin: 0 auto; background: white;">
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 25px; border-bottom: 2px solid #2563eb; padding-bottom: 15px;">
            <div>
              <h1 style="margin: 0; color: #2563eb; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px;">${businessName}</h1>
              <p style="margin: 4px 0 0; color: #475569; white-space: pre-line;">${businessAddress}</p>
              <div style="margin-top: 8px; font-size: 10px; color: #334155;">
                ${isGSTInvoice ? `<p style="margin: 2px 0;"><strong>Tax ID:</strong> ${businessGSTIN}</p>` : ''}
                <p style="margin: 2px 0;"><strong>Phone:</strong> ${businessPhone}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 18px; color: ${billingMode === 'wholesale' ? '#9333ea' : '#0f172a'}; text-transform: uppercase; letter-spacing: 1px;">${invoiceTypeHeader}</h2>
              <p style="margin: 4px 0; font-size: 12px; color: #475569; font-weight: 500;">${isGSTInvoice ? 'Invoice No:' : 'Bill No:'} ${invoiceNo}</p>
              <p style="margin: 0; font-size: 11px; color: #64748b;">Date: ${invoiceDate}</p>
            </div>
          </div>

          <div style="display: flex; gap: 20px; margin-bottom: 25px;">
            <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 8px 0; font-size: 11px; color: #2563eb; font-weight: 700; text-transform: uppercase;">Bill To (Buyer)</h3>
              <p style="margin: 0; font-weight: 700; font-size: 12px;">${customerName}</p>
              ${customerPhone ? `<p style="margin: 1px 0 0; font-size: 10px; color: #475569;">Ph: ${customerPhone}</p>` : ''}
              ${customerFirmName ? `<p style="margin: 1px 0 0; font-size: 10px; color: #475569;">Firm Name: ${customerFirmName}</p>` : ''}
              ${customerGSTIN && isGSTInvoice ? `<p style="margin: 1px 0 0; font-size: 10px; color: #475569;">Tax ID: <strong>${customerGSTIN}</strong></p>` : ''}
              ${customerAddress ? `<p style="margin: 3px 0 0; font-size: 10px; color: #475569;">${customerAddress}</p>` : ''}
            </div>
            <div style="flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: right;">
               <h3 style="margin: 0 0 8px 0; font-size: 11px; color: #2563eb; font-weight: 700; text-transform: uppercase;">Payment Info</h3>
               <p style="margin: 0; font-weight: 600;">Status: <span style="color: #16a34a;">${bill.payment_status || 'Paid'}</span></p>
               <p style="margin: 2px 0;">Method: ${bill.payment_method || 'Cash'}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: ${billingMode === 'wholesale' ? '#9333ea' : '#2563eb'}; color: white;">
                <th style="padding: 8px 6px; text-align: center; width: 5%; border-radius: 4px 0 0 4px;">#</th>
                <th style="padding: 8px 6px; text-align: left; width: 30%;">Item</th>
                <th style="padding: 8px 6px; text-align: left; width: 10%;">HSN</th>
                <th style="padding: 8px 6px; text-align: center; width: 5%;">Qty</th>
                <th style="padding: 8px 6px; text-align: right; width: 10%;">Rate</th>
                <th style="padding: 8px 6px; text-align: right; width: 10%;">Taxable</th>
                ${taxName === 'GST' ? (
                  !isInterState ? `
                  <th style="padding: 8px 6px; text-align: right; width: 10%;">SGST</th>
                  <th style="padding: 8px 6px; text-align: right; width: 10%;">CGST</th>
                  ` : `
                  <th style="padding: 8px 6px; text-align: right; width: 20%;">IGST</th>
                  `
                ) : `
                  <th style="padding: 8px 6px; text-align: right; width: 20%;">${taxName}</th>
                `}
                <th style="padding: 8px 6px; text-align: right; width: 10%; border-radius: 0 4px 4px 0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="background: #f1f5f9; padding: 8px 12px; margin-bottom: 20px; border-radius: 4px; font-style: italic; border-left: 3px solid ${billingMode === 'wholesale' ? '#9333ea' : '#2563eb'};">
            <span style="font-weight: 600; font-style: normal; color: #334155;">Amount in Words:</span> ${amountInWords}
          </div>

          <div style="display: flex; gap: 30px;">
            <div style="flex: 1.5;">
              <div style="display: flex; gap: 15px;">
                ${bankName ? `
                <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px;">
                  <p style="margin: 0 0 5px 0; font-weight: 700; color: #2563eb; font-size: 10px; text-transform: uppercase;">Bank Details</p>
                  <p style="margin: 1px 0;"><strong>Bank:</strong> ${bankName}</p>
                  <p style="margin: 1px 0;"><strong>A/c No:</strong> ${accNumber}</p>
                  <p style="margin: 1px 0;"><strong>IFSC/Code:</strong> ${ifscCode}</p>
                  <p style="margin: 1px 0;"><strong>Branch:</strong> ${branchName}</p>
                </div>` : ''}
                
                ${(upiId || qrCodeUrl) ? `
                <div style="flex: 0 0 100px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <p style="margin: 0 0 5px 0; font-weight: 700; color: #2563eb; font-size: 10px;">SCAN TO PAY</p>
                  ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width: 60px; height: 60px; object-fit: contain; margin-bottom: 4px;" />` : ''}
                  ${upiId ? `<p style="margin: 0; font-size: 9px; word-break: break-all;">${upiId}</p>` : ''}
                </div>` : ''}
              </div>
              
              <div style="margin-top: 20px; font-size: 9px; color: #64748b;">
                <p style="font-weight: 700; margin-bottom: 2px;">Terms & Conditions:</p>
                <ol style="margin: 0; padding-left: 15px;">
                  <li>Goods once sold will not be taken back.</li>
                  <li>Interest @18% p.a. will be charged for delayed payment.</li>
                  <li>Subject to ${settings.city || 'local'} jurisdiction.</li>
                </ol>
              </div>
            </div>

            <div style="flex: 1;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px; text-align: right; color: #64748b; border-bottom: 1px solid #f1f5f9;">Taxable Amount:</td>
                  <td style="padding: 6px; text-align: right; font-weight: 600;">${formatPrice(totalTaxable)}</td>
                </tr>
                ${taxName === 'GST' ? (
                  !isInterState ? `
                  <tr>
                    <td style="padding: 6px; text-align: right; color: #64748b; border-bottom: 1px solid #f1f5f9;">SGST:</td>
                    <td style="padding: 6px; text-align: right; font-weight: 600;">${formatPrice(totalSGST)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px; text-align: right; color: #64748b; border-bottom: 1px solid #f1f5f9;">CGST:</td>
                    <td style="padding: 6px; text-align: right; font-weight: 600;">${formatPrice(totalCGST)}</td>
                  </tr>` : `
                  <tr>
                    <td style="padding: 6px; text-align: right; color: #64748b; border-bottom: 1px solid #f1f5f9;">IGST:</td>
                    <td style="padding: 6px; text-align: right; font-weight: 600;">${formatPrice(totalIGST)}</td>
                  </tr>`
                ) : `
                  <tr>
                    <td style="padding: 6px; text-align: right; color: #64748b; border-bottom: 1px solid #f1f5f9;">${taxName}:</td>
                    <td style="padding: 6px; text-align: right; font-weight: 600;">${formatPrice(generalTotalTax)}</td>
                  </tr>
                `}
                ${bill.discount_amount > 0 ? `
                <tr>
                  <td style="padding: 6px; text-align: right; color: #16a34a; border-bottom: 1px solid #f1f5f9;">Discount:</td>
                  <td style="padding: 6px; text-align: right; font-weight: 600; color: #16a34a;">-${formatPrice(bill.discount_amount)}</td>
                </tr>` : ''}
                <tr style="background: ${billingMode === 'wholesale' ? '#faf5ff' : '#eff6ff'};">
                  <td style="padding: 10px 6px; text-align: right; font-weight: 800; color: ${billingMode === 'wholesale' ? '#9333ea' : '#2563eb'}; font-size: 14px;">Grand Total:</td>
                  <td style="padding: 10px 6px; text-align: right; font-weight: 800; color: ${billingMode === 'wholesale' ? '#9333ea' : '#2563eb'}; font-size: 14px;">${formatPrice(totalAmount)}</td>
                </tr>
              </table>
              
              <div style="margin-top: 40px; text-align: center;">
                <p style="border-top: 1px solid #cbd5e1; padding-top: 5px; font-weight: 700; font-size: 10px; color: #475569;">Authorized Signatory</p>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 9px; color: #94a3b8;">
            This is a computer generated document.
          </div>

        </div>
      `;

      const element = document.createElement('div');
      element.innerHTML = invoiceHTML;
      
      const opt = {
        margin: 10,
        filename: `${invoiceNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      
      toast({
        title: "Document Downloaded",
        description: `${isGSTInvoice ? `${taxName} Tax Invoice` : 'Bill'} has been generated successfully.`,
        variant: "default",
      });
      
      element.remove();

    } catch (error) {
      console.error("Document generation failed:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isGSTInvoice = bill?.billing_type === 'gst_invoice';
  const label = isGSTInvoice ? 'Generate Invoice' : 'Generate Bill';

  if (buttonStyle === 'modal-header') {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={generatePDF} 
        disabled={isGenerating}
        className={cn("gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20", className)}
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {label}
      </Button>
    );
  }

  if (buttonStyle === 'pos-popup') {
    return (
      <Button 
        onClick={generatePDF} 
        disabled={isGenerating}
        className={cn("w-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-3 rounded-xl h-14 text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]", className)}
      >
        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
        Download {isGSTInvoice ? 'Invoice' : 'Bill'}
      </Button>
    );
  }

  return (
    <Button 
        variant="outline" 
        size="sm"
        onClick={generatePDF} 
        disabled={isGenerating}
        className={cn("gap-2", className)}
    >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isGSTInvoice ? 'Invoice' : 'Bill'}
    </Button>
  );
};

export default GSTInvoiceButton;