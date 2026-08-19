import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { amountToWords } from '@/utils/amountToWords';

// Single source of truth for Indian Currency Formatting
const formatINR = (amount) => {
  if (amount == null || isNaN(amount)) return 'Rs. 0.00';
  const isNegative = amount < 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${isNegative ? '-' : ''}Rs. ${formatted}`;
};

export const generateQuotationPDF = (quotation, settings, customer) => {
  const doc = new jsPDF();
  
  // Settings fallbacks
  const businessName = settings?.business_name || 'Business Name';
  const businessAddress = settings?.business_address || '';
  const businessGSTIN = settings?.business_gstin || '';
  const businessPhone = settings?.phone || '';

  doc.setFont('helvetica');

  // Header Left - Business Details
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, 14, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(businessAddress, 14, 28, { maxWidth: 100 });
  if (businessGSTIN) doc.text(`GSTIN: ${businessGSTIN}`, 14, 34);
  if (businessPhone) doc.text(`Ph: ${businessPhone}`, 14, 40);

  // Header Right - Document Details
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', 196, 22, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quotation #: ${quotation.quotation_number}`, 196, 30, { align: 'right' });
  doc.text(`Date: ${format(new Date(quotation.quotation_date), 'dd MMM yyyy')}`, 196, 35, { align: 'right' });
  doc.text(`Status: ${quotation.status}`, 196, 40, { align: 'right' });

  // Bill To Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Quotation To:', 14, 55);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let currentY = 61;
  
  doc.text(customer?.name || 'Walk-in Customer', 14, currentY);
  currentY += 5;
  if (customer?.phone) {
    doc.text(`Ph: ${customer.phone}`, 14, currentY);
    currentY += 5;
  }
  if (customer?.firm_name) {
    doc.text(`Firm: ${customer.firm_name}`, 14, currentY);
    currentY += 5;
  }
  if (customer?.gstin) {
    doc.text(`GST No: ${customer.gstin}`, 14, currentY);
  }

  // Items Table
  const tableData = (quotation.quotation_items || []).map((item, index) => [
    index + 1,
    item.product_name,
    item.hsn_code || '-',
    item.quantity,
    formatINR(item.rate),
    formatINR(item.taxable_amount),
    formatINR(item.sgst_amount || (item.taxable_amount * (item.sgst_percentage || 0) / 100)),
    formatINR(item.cgst_amount || (item.taxable_amount * (item.cgst_percentage || 0) / 100)),
    formatINR(item.item_total)
  ]);

  doc.autoTable({
    startY: 85,
    head: [['S.No.', 'Product Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'SGST', 'CGST', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [240, 240, 240], 
      textColor: [0, 0, 0], 
      fontStyle: 'bold',
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' }, // S.No.
      1: { cellWidth: 'auto', halign: 'left' }, // Description
      2: { cellWidth: 16, halign: 'center' }, // HSN
      3: { cellWidth: 12, halign: 'center' }, // Qty
      4: { cellWidth: 24, halign: 'right' }, // Rate
      5: { cellWidth: 26, halign: 'right' }, // Taxable
      6: { cellWidth: 20, halign: 'right' }, // SGST
      7: { cellWidth: 20, halign: 'right' }, // CGST
      8: { cellWidth: 30, halign: 'right' }  // Amount
    }
  });

  const finalY = doc.lastAutoTable.finalY;

  // Amount in Words (Left aligned)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words:', 14, finalY + 10);
  doc.setFont('helvetica', 'normal');
  const finalAmount = Math.round(quotation.final_total || quotation.grand_total);
  doc.text(`${amountToWords(finalAmount)} Rupees Only`, 14, finalY + 15, { maxWidth: 100 });

  // Summary Box (Right aligned)
  const summaryBoxWidth = 80;
  const summaryBoxX = 210 - 14 - summaryBoxWidth;
  let sumY = finalY + 8;
  const lineSpacing = 7;
  const padding = 4;
  
  // Calculate box height dynamically
  let boxHeight = padding * 2 + (lineSpacing * 3); // Subtotal, SGST, CGST
  if (quotation.discount_amount > 0) boxHeight += lineSpacing * 2; // Grand Total, Discount
  boxHeight += lineSpacing + 2; // Final Total + extra space
  
  // Draw Summary Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(252, 252, 252);
  doc.rect(summaryBoxX, sumY - padding, summaryBoxWidth, boxHeight, 'FD');

  const textX = summaryBoxX + padding;
  const amountX = summaryBoxX + summaryBoxWidth - padding;

  // Summary Content
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Taxable Amount:', textX, sumY);
  doc.text(formatINR(quotation.subtotal), amountX, sumY, { align: 'right' });
  
  sumY += lineSpacing;
  doc.text('SGST Total:', textX, sumY);
  doc.text(formatINR(quotation.sgst_total), amountX, sumY, { align: 'right' });
  
  sumY += lineSpacing;
  doc.text('CGST Total:', textX, sumY);
  doc.text(formatINR(quotation.cgst_total), amountX, sumY, { align: 'right' });
  
  if (quotation.discount_amount > 0) {
    sumY += lineSpacing;
    doc.text('Grand Total:', textX, sumY);
    doc.text(formatINR(quotation.grand_total), amountX, sumY, { align: 'right' });
    
    sumY += lineSpacing;
    const discountLabel = quotation.discount_type === 'percentage' ? `${quotation.discount_value}%` : 'Flat';
    doc.setTextColor(220, 38, 38);
    doc.text(`Discount (${discountLabel}):`, textX, sumY);
    // Use formatINR and conditionally handle negative prefix if discount_amount is positive
    doc.text(`-${formatINR(quotation.discount_amount)}`, amountX, sumY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }
  
  sumY += lineSpacing + 2;
  
  // Draw separator line for Final Total
  doc.line(summaryBoxX, sumY - 5, summaryBoxX + summaryBoxWidth, sumY - 5);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Final Total:', textX, sumY);
  doc.text(formatINR(quotation.final_total || quotation.grand_total), amountX, sumY, { align: 'right' });

  // Notes & T&C (Left aligned below amount in words)
  let footerY = Math.max(finalY + 30, sumY + 15);
  if (quotation.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes / Terms & Conditions:', 14, footerY);
    doc.setFont('helvetica', 'normal');
    doc.text(quotation.notes, 14, footerY + 5, { maxWidth: 120 });
  }

  // Signature (Right aligned at the bottom)
  const sigY = footerY + 25;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', 196, sigY, { align: 'right' });
  doc.line(146, sigY - 5, 196, sigY - 5);

  return doc;
};