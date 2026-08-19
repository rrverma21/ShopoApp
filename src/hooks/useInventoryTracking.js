import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useInventoryTracking = (productId, currentStock) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!productId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // Fetch stock additions (stock_logs) and sales (point_of_sale_sale_items)
            const [stockRes, salesRes] = await Promise.all([
                supabase
                    .from('stock_logs')
                    .select('*, purchase_bills(bill_no)')
                    .eq('product_id', productId),
                supabase
                    .from('point_of_sale_sale_items')
                    .select('*, point_of_sale_sales(*)')
                    .eq('product_id', productId)
            ]);

            if (stockRes.error) throw stockRes.error;
            if (salesRes.error) throw salesRes.error;

            // Map stock additions
            const additions = (stockRes.data || []).map(log => ({
                id: `add-${log.id}`,
                date: log.created_at,
                type: 'Stock Addition',
                billNumber: log.purchase_bills?.bill_no || '-',
                customerName: '-',
                customerPhone: '-',
                quantity: log.added_stock,
                previousStock: log.previous_stock,
                newStock: log.new_stock,
                notes: log.reason || '-'
            }));

            // Map sales transactions
            const sales = (salesRes.data || []).map(item => {
                const saleData = item.point_of_sale_sales || {};
                return {
                    id: `sale-${item.id}`,
                    date: saleData.created_at || item.created_at,
                    type: 'Sale',
                    billNumber: saleData.invoice_number || saleData.bill_number || '-',
                    customerName: saleData.customer_name || 'Walk-in',
                    customerPhone: saleData.customer_phone || '-',
                    quantity: item.quantity,
                    previousStock: null, // Computed below
                    newStock: null,      // Computed below
                    notes: item.is_refunded ? 'Refunded' : '-'
                };
            });

            // Combine and sort (most recent first)
            let combined = [...additions, ...sales].sort(
                (a, b) => new Date(b.date) - new Date(a.date)
            );

            // Compute running stock backwards from current stock
            // Assuming the combined list includes all history reliably
            let runningStock = currentStock || 0;
            
            combined = combined.map(item => {
                if (item.type === 'Stock Addition') {
                    // For additions, we use the explicitly logged values to correct/anchor the running total
                    runningStock = item.previousStock; 
                    return item;
                } else {
                    // For sales, stock was deducted. So going backward in time, previous stock was higher.
                    const newS = runningStock;
                    const prevS = runningStock + item.quantity;
                    runningStock = prevS;
                    
                    return {
                        ...item,
                        previousStock: prevS,
                        newStock: newS
                    };
                }
            });

            setData(combined);
        } catch (err) {
            console.error('Error fetching inventory tracking:', err);
            setError(err.message || 'Failed to fetch inventory data');
        } finally {
            setLoading(false);
        }
    }, [productId, currentStock]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
};