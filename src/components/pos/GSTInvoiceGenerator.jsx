import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

const GSTInvoiceGenerator = ({ bill, refundItems, refundReason }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const { data: settings } = await supabase.from('pos_retailer_settings').select('tax_type').eq('user_id', bill.user_id).single();
      const taxName = bill.tax_type || settings?.tax_type || 'GST';

      const refundDate = format(new Date(), 'dd MMM yyyy');
      const creditNoteNo = `CN-${bill.id.substring(0, 6).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      const originalInvoiceNo = bill.id.substring(0, 8).toUpperCase();
      const originalDate = format(new Date(bill.created_at), 'dd MMM yyyy');
      
      // Calculate totals
      let totalTaxable = 0;
      let totalSGST = 0;
      let totalCGST = 0;
      let generalTotalTax = 0;
      let totalRefundAmount = 0;

      const itemsRows = refundItems.map((item, index) => {
        const qty = item.refundQty;
        const unitTaxablePrice = item.total_price / item.originalQty; 
        
        const taxableAmount = unitTaxablePrice * qty;
        const taxRate = item.tax_rate !== null && item.tax_rate !== undefined ? item.tax_rate : 0;
        const sgstRate = taxRate / 2;
        const cgstRate = taxRate / 2;
        
        const sgstAmount = taxableAmount * (sgstRate / 100);
        const cgstAmount = taxableAmount * (cgstRate / 100);
        const generalTaxAmt = taxableAmount * (taxRate / 100);
        const totalItemAmount = taxableAmount + generalTaxAmt;

        totalTaxable += taxableAmount;
        if (taxName === 'GST') {
            totalSGST += sgstAmount;
            totalCGST += cgstAmount;
        } else {
            generalTotalTax += generalTaxAmt;
        }
        totalRefundAmount += totalItemAmount;

        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px; text-align: left;">${index + 1}</td>
            <td style="padding: 8px; text-align: left;">
              <div style="font-weight: bold;">${item.product?.name || 'Item'}</div>
            </td>
            <td style="padding: 8px; text-align: left;">${item.product?.hsn_code || 'N/A'}</td>
            <td style="padding: 8px; text-align: center;">${qty}</td>
            <td style="padding: 8px; text-align: right;">${formatPrice(unitTaxablePrice)}</td>
            <td style="padding: 8px; text-align: right;">${formatPrice(taxableAmount)}</td>
            ${taxName === 'GST' ? `
            <td style="padding: 8px; text-align: right;">${formatPrice(sgstAmount)}<br><span style="font-size: 10px; color: #666;">(${sgstRate}%)</span></td>
            <td style="padding: 8px; text-align: right;">${formatPrice(cgstAmount)}<br><span style="font-size: 10px; color: #666;">(${cgstRate}%)</span></td>
            ` : `
            <td style="padding: 8px; text-align: right;">${formatPrice(generalTaxAmt)}<br><span style="font-size: 10px; color: #666;">(${taxRate}%)</span></td>
            `}
            <td style="padding: 8px; text-align: right; font-weight: bold;">${formatPrice(totalItemAmount)}</td>
          </tr>
        `;
      }).join('');

      const invoiceHTML = `
        <div style="padding: 30px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; font-size: 12px; max-width: 800px; margin: 0 auto; background: white;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 20px;">
            <div>
              <h1 style="margin: 0; color: #E11D48; font-size: 24px; font-weight: 800;">CREDIT NOTE</h1>
              <p style="margin: 5px 0 0; color: #666;">Ref: Original Invoice #${originalInvoiceNo}</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 18px; color: #333;">${creditNoteNo}</h2>
              <p style="margin: 0; font-size: 14px; color: #666;">${refundDate}</p>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #333; color: white;">
                <th style="padding: 10px 8px; text-align: left; width: 5%;">#</th>
                <th style="padding: 10px 8px; text-align: left; width: 25%;">Item</th>
                <th style="padding: 10px 8px; text-align: left; width: 10%;">HSN</th>
                <th style="padding: 10px 8px; text-align: center; width: 5%;">Qty</th>
                <th style="padding: 10px 8px; text-align: right; width: 10%;">Rate</th>
                <th style="padding: 10px 8px; text-align: right; width: 10%;">Taxable</th>
                ${taxName === 'GST' ? `
                <th style="padding: 10px 8px; text-align: right; width: 10%;">SGST</th>
                <th style="padding: 10px 8px; text-align: right; width: 10%;">CGST</th>
                ` : `
                <th style="padding: 10px 8px; text-align: right; width: 20%;">${taxName}</th>
                `}
                <th style="padding: 10px 8px; text-align: right; width: 15%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 40%;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; text-align: right; color: #666;">Taxable Amount:</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold;">${formatPrice(totalTaxable)}</td>
                </tr>
                ${taxName === 'GST' ? `
                <tr>
                  <td style="padding: 8px; text-align: right; color: #666;">Total SGST:</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold;">${formatPrice(totalSGST)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; text-align: right; color: #666;">Total CGST:</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold;">${formatPrice(totalCGST)}</td>
                </tr>
                ` : `
                <tr>
                  <td style="padding: 8px; text-align: right; color: #666;">Total ${taxName}:</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold;">${formatPrice(generalTotalTax)}</td>
                </tr>
                `}
                <tr style="border-top: 2px solid #333; font-size: 16px;">
                  <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #E11D48;">Refund Total:</td>
                  <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #E11D48;">${formatPrice(totalRefundAmount)}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      `;

      const element = document.createElement('div');
      element.innerHTML = invoiceHTML;
      
      const opt = {
        margin: 10,
        filename: `${creditNoteNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();

    } catch (error) {
      console.error("PDF Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF} 
      variant="outline" 
      disabled={isGenerating}
      className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <FileText className="w-4 h-4 mr-2" />
      )}
      {isGenerating ? 'Generating...' : 'Refund Invoice'}
    </Button>
  );
};

export default GSTInvoiceGenerator;