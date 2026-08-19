import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatPrice } from '@/lib/utils';

export const generateReceiptPDF = (businessDetails, saleData, saleItems, customerDetails, amountForCreditPayment, t) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 250] // Standard thermal receipt width, dynamic height
  });

  const isGSTInvoice = saleData.billing_type === 'gst_invoice';
  
  let yPos = 10;
  const margin = 5;
  const pageWidth = 80;
  const contentWidth = pageWidth - (margin * 2);

  // Helper functions
  const centerText = (text, y, size = 10, isBold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
    return y + (size * 0.4);
  };

  const leftRightText = (left, right, y, size = 9, isBold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(left, margin, y);
    const rightWidth = doc.getStringUnitWidth(right) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    doc.text(right, pageWidth - margin - rightWidth, y);
    return y + 4;
  };

  const drawLine = (y) => {
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineDashPattern([], 0);
    return y + 3;
  };

  // 1. Business Header
  if (businessDetails.business_name) {
    yPos = centerText(businessDetails.business_name, yPos, 14, true);
  } else {
    yPos = centerText('RETAIL RECEIPT', yPos, 14, true);
  }

  if (businessDetails.street_address) {
    yPos = centerText(businessDetails.street_address, yPos, 8);
  }
  if (businessDetails.city) {
    yPos = centerText(`${businessDetails.city}${businessDetails.pincode ? ` - ${businessDetails.pincode}` : ''}`, yPos, 8);
  }
  if (businessDetails.phone) {
    yPos = centerText(`Ph: ${businessDetails.phone}`, yPos, 8);
  }
  if (businessDetails.gstin && isGSTInvoice) {
    yPos = centerText(`GSTIN: ${businessDetails.gstin}`, yPos, 8, true);
  }

  yPos += 2;
  yPos = drawLine(yPos);

  // Billing Mode Label
  if (isGSTInvoice) {
     yPos = centerText('*** TAX INVOICE ***', yPos, 10, true);
  } else {
     yPos = centerText('*** ESTIMATE / NON-GST BILL ***', yPos, 10, true);
  }
  yPos += 2;

  // 2. Receipt Details
  const docNum = isGSTInvoice 
      ? (saleData.invoice_number || `INV-${saleData.id?.substring(0, 6).toUpperCase() || 'NEW'}`)
      : (saleData.bill_number || `BILL-${saleData.id?.substring(0, 6).toUpperCase() || 'NEW'}`);
      
  const docLabel = isGSTInvoice ? 'Invoice No:' : 'Bill No:';
  
  yPos = leftRightText(`${docLabel} ${docNum}`, '', yPos, 8);
  yPos = leftRightText(`Date: ${new Date().toLocaleDateString()}`, `Time: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, yPos, 8);
  yPos = leftRightText(`Cashier: POS System`, '', yPos, 8);
  
  if (customerDetails?.name || customerDetails?.phone) {
    yPos += 2;
    yPos = leftRightText(`Customer: ${customerDetails.name || 'Walk-in'}`, '', yPos, 8);
    if (customerDetails.phone) {
      yPos = leftRightText(`Phone: ${customerDetails.phone}`, '', yPos, 8);
    }
  }

  yPos += 2;
  yPos = drawLine(yPos);

  // 3. Items Header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Item', margin, yPos);
  doc.text('Qty', margin + 35, yPos, { align: 'right' });
  doc.text('Price', margin + 50, yPos, { align: 'right' });
  doc.text('Total', pageWidth - margin, yPos, { align: 'right' });
  yPos += 4;
  yPos = drawLine(yPos);

  // 4. Items List
  doc.setFont('helvetica', 'normal');
  saleItems.forEach(item => {
    let itemName = item.name || 'Unknown Item';
    if (itemName.length > 18) itemName = itemName.substring(0, 18) + '..';
    
    doc.text(itemName, margin, yPos);
    
    const formattedQty = Number(item.quantity).toFixed(3).replace(/\.?0+$/, '');
    doc.text(formattedQty, margin + 35, yPos, { align: 'right' });
    
    const displayPrice = isGSTInvoice ? item.unit_price : (item.total_price / item.quantity);
    doc.text(formatPrice(displayPrice).replace('₹', ''), margin + 50, yPos, { align: 'right' });
    
    const displayTotal = isGSTInvoice ? (item.unit_price * item.quantity) : item.total_price;
    doc.text(formatPrice(displayTotal).replace('₹', ''), pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 4;

    if (isGSTInvoice && (item.hsn_code || item.tax_rate > 0)) {
        doc.setFontSize(7);
        doc.setTextColor(100);
        let taxLine = '';
        if (item.hsn_code) taxLine += `HSN: ${item.hsn_code}  `;
        if (item.tax_rate > 0) taxLine += `GST: ${item.tax_rate}%`;
        doc.text(taxLine, margin + 2, yPos);
        doc.setTextColor(0);
        doc.setFontSize(8);
        yPos += 3;
    }
  });

  yPos += 1;
  yPos = drawLine(yPos);

  // 5. Totals
  const subtotal = saleData.subtotal || 0;
  const discount = saleData.discount_amount || 0;
  const tax = isGSTInvoice ? (saleData.tax_amount || 0) : 0;
  const total = saleData.total_amount || 0;
  const amountPaid = saleData.amount_paid || total;
  const balance = saleData.balance_due || 0;

  if (isGSTInvoice) {
      yPos = leftRightText('Taxable Value:', formatPrice(subtotal), yPos, 9);
  } else {
      yPos = leftRightText('Subtotal:', formatPrice(subtotal), yPos, 9);
  }

  if (discount > 0) {
    yPos = leftRightText('Discount:', `-${formatPrice(discount)}`, yPos, 9);
  }

  if (isGSTInvoice && tax > 0) {
    yPos = leftRightText('CGST:', formatPrice(tax / 2), yPos, 9);
    yPos = leftRightText('SGST:', formatPrice(tax / 2), yPos, 9);
  }

  yPos += 1;
  yPos = leftRightText('GRAND TOTAL:', formatPrice(total), yPos, 12, true);
  yPos += 1;
  
  // Payment Info
  yPos = drawLine(yPos);
  yPos = leftRightText('Payment Method:', saleData.payment_method || 'Cash', yPos, 9);
  yPos = leftRightText('Amount Paid:', formatPrice(amountPaid), yPos, 9);
  
  if (balance > 0) {
    yPos = leftRightText('Balance Due:', formatPrice(balance), yPos, 9, true);
  }

  // 6. Loyalty Points (if applicable)
  if (saleData.loyalty_points_earned > 0 || saleData.loyalty_points_redeemed > 0) {
    yPos += 2;
    yPos = drawLine(yPos);
    yPos = centerText('--- LOYALTY REWARDS ---', yPos, 8, true);
    if (saleData.loyalty_points_earned > 0) {
      yPos = leftRightText('Points Earned:', `+${saleData.loyalty_points_earned}`, yPos, 8);
    }
    if (saleData.loyalty_points_redeemed > 0) {
      yPos = leftRightText('Points Redeemed:', `-${saleData.loyalty_points_redeemed}`, yPos, 8);
      yPos = leftRightText('Points Discount:', formatPrice(saleData.loyalty_discount_amount || 0), yPos, 8);
    }
  }

  // 7. Footer
  yPos += 4;
  yPos = drawLine(yPos);
  yPos += 2;
  yPos = centerText('Thank you for shopping with us!', yPos, 9, true);
  yPos = centerText('Please visit again', yPos, 8);
  
  if (isGSTInvoice) {
      yPos += 2;
      yPos = centerText('This is a computer generated invoice', yPos, 7);
  } else {
      yPos += 2;
      yPos = centerText('This is a computer generated bill', yPos, 7);
  }

  // Generate and print
  doc.autoPrint();
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = blobUrl;
  document.body.appendChild(iframe);
  
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.print();
    }, 100);
  };
};