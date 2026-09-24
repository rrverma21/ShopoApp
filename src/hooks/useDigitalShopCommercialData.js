import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { loadCommercialCatalog, loadCommercialContext } from '@/lib/digitalShopCommercial';

export function useDigitalShopCommercialData(businessId, includeCatalog = true) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, catalog: null, context: null, catalogError: null, contextError: null });
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let alive = true;
    setState({ loading: true, catalog: null, context: null, catalogError: null, contextError: null });
    if (!businessId) {
      setState({ loading: false, catalog: null, context: null, catalogError: null, contextError: new Error('Sign in to view commercial details.') });
      return () => { alive = false; };
    }
    Promise.allSettled([
      includeCatalog ? loadCommercialCatalog(supabase) : Promise.resolve(null),
      loadCommercialContext(supabase, businessId),
    ]).then(([catalog, context]) => {
      if (!alive) return;
      setState({ loading: false, catalog: catalog.value || null, context: context.value || null,
        catalogError: catalog.status === 'rejected' ? catalog.reason : null,
        contextError: context.status === 'rejected' ? context.reason : null });
    });
    return () => { alive = false; };
  }, [businessId, includeCatalog, revision]);
  return { ...state, refresh };
}
