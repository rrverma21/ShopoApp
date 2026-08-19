import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { startOfMonth, endOfMonth } from 'date-fns';

export const useSalesData = (startDate = null, endDate = null) => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });

  // Default date range: current month
  const defaultStartDate = startDate || startOfMonth(new Date());
  const defaultEndDate = endDate || endOfMonth(new Date());

  const fetchSalesData = async () => {
    console.log('[useSalesData] Starting fetch...', { user: user?.id, startDate: defaultStartDate, endDate: defaultEndDate });
    
    if (!user?.id) {
      console.warn('[useSalesData] No user ID available');
      setLoading(false);
      setError(new Error('User not authenticated'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setFetchProgress({ current: 0, total: 0 });

      // CRITICAL FIX: Implement pagination to fetch ALL records (no 1000 limit)
      // Supabase has a default 1000 record limit per query, so we need to paginate
      
      const PAGE_SIZE = 1000;
      let allSalesData = [];
      let currentPage = 0;
      let hasMoreRecords = true;

      console.log('[useSalesData] Starting paginated fetch with page size:', PAGE_SIZE);

      while (hasMoreRecords) {
        const startRange = currentPage * PAGE_SIZE;
        const endRange = startRange + PAGE_SIZE - 1;

        console.log(`[useSalesData] Fetching page ${currentPage + 1} (records ${startRange}-${endRange})...`);

        const { data: pageData, error: pageError } = await supabase
          .from('point_of_sale_sales')
          .select(`
            id,
            created_at,
            subtotal,
            tax_amount,
            total_amount,
            customer_id,
            sale_items:point_of_sale_sale_items(
              id,
              product_id,
              quantity,
              unit_price,
              tax_rate,
              total_price,
              hsn_code,
              product:point_of_sale_products(
                id,
                name,
                hsn_code,
                tax_rate
              )
            )
          `)
          .eq('user_id', user.id)
          .gte('created_at', defaultStartDate.toISOString())
          .lte('created_at', defaultEndDate.toISOString())
          .order('created_at', { ascending: false })
          .range(startRange, endRange);

        if (pageError) {
          console.error('[useSalesData] Supabase error on page', currentPage + 1, ':', pageError);
          throw pageError;
        }

        console.log(`[useSalesData] Page ${currentPage + 1} fetched:`, pageData?.length || 0, 'records');

        if (pageData && pageData.length > 0) {
          allSalesData = [...allSalesData, ...pageData];
          setFetchProgress({ current: allSalesData.length, total: allSalesData.length });

          // Check if we received fewer records than PAGE_SIZE (means we're on the last page)
          if (pageData.length < PAGE_SIZE) {
            hasMoreRecords = false;
            console.log('[useSalesData] Last page reached');
          } else {
            currentPage++;
          }
        } else {
          // No records on this page, we're done
          hasMoreRecords = false;
          console.log('[useSalesData] No more records to fetch');
        }
      }

      console.log('[useSalesData] Total sales data fetched:', allSalesData.length, 'records across', currentPage + 1, 'pages');

      // Transform data to include HSN code, tax calculations
      const transformedSales = allSalesData.map(sale => {
        const items = sale.sale_items?.map(item => {
          const hsnCode = item.hsn_code || item.product?.hsn_code || 'N/A';
          const taxRate = item.tax_rate || item.product?.tax_rate || 0;
          const taxableValue = item.total_price || 0;
          const taxAmount = taxableValue * (taxRate / 100);

          // Calculate IGST/SGST/CGST (simplified: all as SGST+CGST for now)
          const sgstAmount = taxAmount / 2;
          const cgstAmount = taxAmount / 2;
          const igstAmount = 0; // Set to 0 for intra-state, adjust logic if needed

          return {
            product_id: item.product_id,
            product_name: item.product?.name || 'Unknown Product',
            hsn_code: hsnCode,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: taxableValue,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            igst_amount: igstAmount,
            sgst_amount: sgstAmount,
            cgst_amount: cgstAmount,
            transaction_date: sale.created_at
          };
        }) || [];

        return {
          id: sale.id,
          transaction_date: sale.created_at,
          items: items
        };
      });

      console.log('[useSalesData] Transformed sales:', transformedSales.length, 'records');
      setSales(transformedSales);
    } catch (err) {
      console.error('[useSalesData] Exception:', err);
      setError(err);
      setSales([]);
    } finally {
      setLoading(false);
      setFetchProgress({ current: 0, total: 0 });
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [user?.id, defaultStartDate?.toISOString(), defaultEndDate?.toISOString()]);

  return {
    sales,
    loading,
    error,
    refetch: fetchSalesData,
    fetchProgress
  };
};