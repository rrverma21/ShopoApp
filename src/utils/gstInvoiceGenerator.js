import { amountToWords } from './amountToWords';
import { supabase } from '@/lib/supabaseClient';

// Helper: Generate Invoice Number
export const generateInvoiceNumber = (prefix = 'INV', sequence) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const fy = month > 3 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
    // Pad sequence to at least 4 digits
    const seq = sequence.toString().padStart(4, '0');
    return `${prefix}/${fy}/${seq}`;
};

// Helper: Calculate Tax Breakdown
export const calculateTaxBreakdown = (items, isInterState) => {
    let taxableValue = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalTax = 0;

    const breakdown = items.map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.price || item.unit_price) || 0; // Selling Price (assumed inclusive for retail, or base for wholesale depending on logic)
        // Assuming price provided is Taxable Value for simplicity in this calculation or extracting it
        // If price is inclusive: Taxable = Price / (1 + Rate/100)
        // Let's assume the system passes Taxable Value or we calculate it. 
        // For this utility, we'll assume 'item.taxable_value' is passed or derived.
        
        const taxRate = parseFloat(item.tax_rate) || 0;
        
        // Standard calculation assuming item.price is unit price (taxable)
        // Adjust based on your specific pricing model (inclusive vs exclusive)
        const itemTaxable = (parseFloat(item.taxable_value) || rate) * qty;
        
        let itemCgst = 0;
        let itemSgst = 0;
        let itemIgst = 0;

        if (isInterState) {
            itemIgst = itemTaxable * (taxRate / 100);
        } else {
            itemCgst = itemTaxable * (taxRate / 200);
            itemSgst = itemTaxable * (taxRate / 200);
        }

        taxableValue += itemTaxable;
        cgstAmount += itemCgst;
        sgstAmount += itemSgst;
        igstAmount += itemIgst;
        totalTax += (itemCgst + itemSgst + itemIgst);

        return {
            ...item,
            taxable_amount: itemTaxable,
            cgst: itemCgst,
            sgst: itemSgst,
            igst: itemIgst
        };
    });

    return {
        taxableValue,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax,
        grandTotal: taxableValue + totalTax,
        itemBreakdown: breakdown
    };
};

// Main Generator Function
export const generateGSTInvoice = async (orderId, orderItems, sellerProfile, customerDetails, isWholesale = false) => {
    try {
        // 1. Validation
        if (isWholesale) {
            const missingHsn = orderItems.filter(i => !i.hsn_code && !i.product?.hsn_code);
            if (missingHsn.length > 0) {
                return { 
                    success: false, 
                    error: `HSN Codes missing for: ${missingHsn.map(i => i.name || i.product?.name).join(', ')}` 
                };
            }
        }

        // 2. Generate Invoice Number
        // Fetch last invoice sequence for this seller to increment
        // (Simplified for this snippet: using timestamp or random if no sequence table)
        // Ideally, you'd have a sequence table. Here we'll use a timestamp-based unique string for safety in this frontend-only context
        const sequence = Math.floor(Date.now() / 1000).toString().slice(-6); 
        const invoiceNumber = generateInvoiceNumber(sellerProfile.invoice_prefix || 'INV', sequence);

        // 3. Calculate Taxes
        const isInterState = customerDetails?.state_code && sellerProfile?.state_code && (customerDetails.state_code !== sellerProfile.state_code);
        const taxDetails = calculateTaxBreakdown(orderItems, isInterState);

        // 4. Prepare Data
        const invoiceData = {
            invoice_number: invoiceNumber,
            order_id: orderId,
            seller_id: sellerProfile.id,
            customer_details: customerDetails,
            items_snapshot: orderItems,
            tax_breakdown: taxDetails,
            total_amount: taxDetails.grandTotal,
            invoice_date: new Date().toISOString()
        };

        // 5. Insert into DB
        const { data: invoice, error } = await supabase
            .from('pos_gst_invoices')
            .insert(invoiceData)
            .select()
            .single();

        if (error) throw error;

        // 6. Update Order
        const updateTable = orderItems[0]?.sale_id ? 'point_of_sale_sales' : 'orders'; // Detect POS vs Marketplace
        const { error: updateError } = await supabase
            .from(updateTable)
            .update({
                has_gst_invoice: true,
                gst_invoice_id: invoice.id,
                gst_invoice_number: invoiceNumber
            })
            .eq('id', orderId);

        if (updateError) throw updateError;

        return { success: true, invoice };

    } catch (error) {
        console.error("Invoice Generation Error:", error);
        return { success: false, error: error.message };
    }
};

// Validation Helper for POS UI
export const validateInvoiceRequirements = (items, shopCategory) => {
    if (shopCategory === 'Wholesaler') {
        const missing = items.filter(i => !i.hsn_code && !i.product?.hsn_code);
        if (missing.length > 0) {
            return {
                isValid: false,
                message: `HSN Codes are mandatory for Wholesalers. Missing for: ${missing.map(i => i.name).join(', ')}`
            };
        }
    }
    return { isValid: true };
};