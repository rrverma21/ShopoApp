import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useDebounce } from '@/hooks/useDebounce';
import { validateBarcode } from '@/lib/barcodeValidation';

/**
 * Hook to search for a product across the global master and user-contributed catalogs by barcode.
 * Corrected to map to standard image_url and images array instead of legacy image_1_url.
 */
export function useBarcodeProductSearch(barcodeValue) {
  const debouncedBarcode = useDebounce(barcodeValue, 500);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchBarcode = useCallback(async (codeToSearch = null) => {
    const code = codeToSearch !== null ? codeToSearch : debouncedBarcode;
    
    if (!code) {
      setProduct(null);
      setError(null);
      return;
    }

    const validation = validateBarcode(code);
    
    if (!validation.isValid) {
      console.log(`[Barcode Search] Validation failed: ${validation.error}`);
      setProduct(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;
      console.log(`[Barcode Search] Attempting fetch for barcode: "${validation.cleanBarcode}"`);
      console.log(`[Barcode Search] Current User Context ID:`, currentUser?.id || 'Unauthenticated');

      // First check the global master catalog (always public/authenticated)
      console.log(`[Barcode Search] Querying 'product_master' table...`);
      const { data: masterData, error: masterError } = await supabase
        .from('product_master')
        .select('barcode, product_name, mrp, image_url')
        .ilike('barcode', validation.cleanBarcode)
        .maybeSingle();

      if (masterError) {
        console.error("[Barcode Search] Error querying product_master:", masterError);
        throw masterError;
      }

      if (masterData) {
        console.log("[Barcode Search] Found in global product_master:", masterData);
        setProduct({
          barcode: masterData.barcode,
          name: masterData.product_name,
          mrp: masterData.mrp,
          image_url: masterData.image_url,
          images: masterData.image_url ? [masterData.image_url] : [],
          category: null,
          sku: null
        });
        return; // Exit early if found in master
      }

      // If not in master, check product_contributions (now globally readable via updated RLS)
      console.log(`[Barcode Search] Not found in master. Querying 'product_contributions' table...`);
      const { data: contribData, error: contribError } = await supabase
        .from('product_contributions')
        .select('barcode, product_name, mrp, image_url, image_url_back')
        .ilike('barcode', validation.cleanBarcode)
        .maybeSingle();

      if (contribError) {
        console.error("[Barcode Search] Error querying product_contributions:", contribError);
        throw contribError;
      }

      if (contribData) {
        console.log("[Barcode Search] Found in product_contributions:", contribData);
        setProduct({
          barcode: contribData.barcode,
          name: contribData.product_name,
          mrp: contribData.mrp,
          image_url: contribData.image_url,
          images: [contribData.image_url, contribData.image_url_back].filter(Boolean),
          category: null,
          sku: null
        });
      } else {
        console.log(`[Barcode Search] INFO: 0 results found for barcode ${validation.cleanBarcode} across all catalogs. User ID: ${currentUser?.id || 'None'}`);
        setProduct(null);
      }
    } catch (err) {
      console.error("[Barcode Search] Exception caught during search:", err);
      const errorMessage = err.message || err.details || err.hint || "Failed to fetch product details. Database connection or query error.";
      setError(`Search Error: ${errorMessage}`);
      setProduct(null);
    } finally {
      setLoading(false);
      console.log(`[Barcode Search] Search process completed.`);
    }
  }, [debouncedBarcode]);

  useEffect(() => {
    if (debouncedBarcode) {
      searchBarcode();
    } else {
      setProduct(null);
      setError(null);
    }
  }, [debouncedBarcode, searchBarcode]);

  return { product, loading, error, searchBarcode };
}