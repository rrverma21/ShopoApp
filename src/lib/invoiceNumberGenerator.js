import { supabase } from './customSupabaseClient';

const getMonthYear = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

export const generateDocumentNumber = async (userId, docType) => {
    const monthYear = getMonthYear();
    
    try {
        const { data: count, error } = await supabase.rpc('increment_pos_document_counter', {
            p_user_id: userId,
            p_doc_type: docType,
            p_month_year: monthYear
        });

        if (error) {
            console.error(`Error generating ${docType} number:`, error);
            throw error;
        }

        const serialStr = String(count).padStart(3, '0');
        const prefix = docType === 'invoice' ? 'INV' : 'BILL';
        
        return {
            formatted: `${prefix}-${monthYear}-${serialStr}`,
            serial: count,
            yearMonth: monthYear
        };
    } catch (err) {
        console.error("Fallback number generation triggered due to error:", err);
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const prefix = docType === 'invoice' ? 'INV' : 'BILL';
        return {
            formatted: `${prefix}-${monthYear}-${randomSuffix}`,
            serial: parseInt(randomSuffix, 10),
            yearMonth: monthYear
        };
    }
};

export const generateInvoiceNumber = (userId) => generateDocumentNumber(userId, 'invoice');
export const generateBillNumber = (userId) => generateDocumentNumber(userId, 'bill');

// Legacy sync functions made no-op since RPC handles atomicity securely
export const syncLocalInvoiceNumber = () => {}; 
export const syncLocalBillNumber = () => {};