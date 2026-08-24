import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDebounce } from '@/hooks/useDebounce';
import { validateBarcode } from '@/lib/barcodeValidation';

/**
 * Searches the current user's active POS inventory by barcode.
 */
export function useBarcodeProductSearch(barcodeValue, posUserId) {
  const debouncedBarcode = useDebounce(barcodeValue, 500);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    ++requestSequence.current;
    setProduct(null);
    setError(null);

    const validation = validateBarcode(barcodeValue || '');
    setLoading(Boolean(posUserId && validation.isValid));
  }, [barcodeValue, posUserId]);

  const searchBarcode = useCallback(async (codeToSearch = null) => {
    const requestId = ++requestSequence.current;
    const code = codeToSearch !== null ? codeToSearch : debouncedBarcode;
    
    if (!code || !posUserId) {
      setProduct(null);
      setError(null);
      setLoading(false);
      return;
    }

    const validation = validateBarcode(code);
    
    if (!validation.isValid) {
      console.log(`[Barcode Search] Validation failed: ${validation.error}`);
      setProduct(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('point_of_sale_products')
        .select('id, barcode, name, selling_price, image_url, images, category, sku, unit')
        .eq('user_id', posUserId)
        .eq('barcode', validation.cleanBarcode)
        .eq('archived', false)
        .limit(1)
        .maybeSingle();

      if (queryError) throw queryError;
      if (requestId !== requestSequence.current) return;

      setProduct(data || null);
    } catch (err) {
      if (requestId !== requestSequence.current) return;
      console.error('[Barcode Search] POS inventory lookup failed:', err);
      setError(err.message || 'Failed to check your POS inventory. Please retry.');
      setProduct(null);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [debouncedBarcode, posUserId]);

  useEffect(() => {
    if (debouncedBarcode && posUserId) {
      searchBarcode();
    } else {
      ++requestSequence.current;
      setProduct(null);
      setError(null);
      setLoading(false);
    }
  }, [debouncedBarcode, posUserId, searchBarcode]);

  return { product, loading, error, searchBarcode };
}
