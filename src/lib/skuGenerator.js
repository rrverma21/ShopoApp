import { supabase } from '@/lib/supabaseClient';

/**
 * Task 2: Shared SKU Auto-generation logic
 * Generates a unique SKU for a product based on its name and a timestamp + random seed.
 * Verifies uniqueness against the database for the given user.
 * 
 * @param {string} productName - The name of the product to base the prefix on.
 * @param {string} posUserId - The user ID to ensure SKU uniqueness per user.
 * @returns {Promise<string>} A unique SKU string.
 */
export async function generateUniqueSku(productName = '', posUserId) {
    if (!posUserId) return '';
    
    // Create a prefix from the product name, default to PROD if too short or missing
    let prefix = productName ? productName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'P') : 'PROD';
    if (prefix.length < 3) prefix = 'PROD';
    
    let isAvailable = false;
    let attempts = 0;
    let newSku = '';
    
    // Attempt up to 10 times to find a unique SKU
    while (!isAvailable && attempts < 10) {
        newSku = `${prefix}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 1000)}`;
        try {
            const { data, error } = await supabase
                .from('point_of_sale_products')
                .select('id')
                .eq('sku', newSku)
                .eq('user_id', posUserId)
                .maybeSingle();
            
            if (error) {
                console.error("Database error while checking SKU uniqueness:", error);
            }
            
            if (!data) {
                isAvailable = true;
            }
        } catch (err) {
            console.error("Exception during SKU generation:", err);
            break;
        }
        attempts++;
    }
    
    // Fallback if all attempts fail or DB error occurs, highly likely unique anyway due to Date.now
    return isAvailable ? newSku : `${prefix}-${Date.now()}`;
}