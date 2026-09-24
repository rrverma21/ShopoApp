import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const EMPTY_STATE = {
  loading: true,
  entitled: false,
  capacity: 0,
  publishedCount: 0,
  remainingCapacity: 0,
  sources: [],
  source: null,
  startsAt: null,
  endsAt: null,
  expiresAt: null,
  capabilities: null,
  resolutionStatus: null,
  reasonCodes: [],
  hasConflictingRecords: false,
  error: null,
};

// This hook is used by the global seller-access provider and by Digital Shop
// screens. Supabase reuses a channel with the same topic, so configure one
// channel per business and distribute its refresh event to every hook instance.
const entitlementChannels = new Map();
let entitlementChannelSequence = 0;

const subscribeToEntitlementChanges = (businessId, refreshEntitlement) => {
  let entry = entitlementChannels.get(businessId);

  if (!entry) {
    const refreshListeners = new Set();
    const notifyListeners = () => refreshListeners.forEach(listener => listener());
    const channel = supabase
      // Do not reuse a channel that is still closing during a StrictMode remount.
      .channel(`digital-shop-entitlement-${businessId}-${++entitlementChannelSequence}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_shop_subscriptions', filter: `business_id=eq.${businessId}` }, notifyListeners)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_of_sale_products', filter: `user_id=eq.${businessId}` }, notifyListeners)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_memberships', filter: `user_id=eq.${businessId}` }, notifyListeners)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${businessId}` }, notifyListeners);

    entry = { channel, refreshListeners };
    entitlementChannels.set(businessId, entry);
    channel.subscribe();
  }

  entry.refreshListeners.add(refreshEntitlement);

  return () => {
    entry.refreshListeners.delete(refreshEntitlement);

    if (entry.refreshListeners.size === 0 && entitlementChannels.get(businessId) === entry) {
      entitlementChannels.delete(businessId);
      supabase.removeChannel(entry.channel);
    }
  };
};

export const useDigitalShopEntitlement = (requestedBusinessId) => {
  const { user, loading: authLoading } = useAuth();
  const businessId = requestedBusinessId || user?.posOwnerId || user?.id || null;
  const [state, setState] = useState(EMPTY_STATE);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!businessId) {
      setState({ ...EMPTY_STATE, loading: false });
      return;
    }

    setState(current => ({ ...current, loading: true, error: null }));

    try {
      const { data: resolverRows, error: resolverError } = await supabase.rpc(
        'resolve_effective_digital_shop_entitlement',
        { p_business_id: businessId }
      );
      if (resolverError) throw resolverError;

      const resolution = Array.isArray(resolverRows) ? resolverRows[0] : resolverRows;
      if (!resolution) throw new Error('Digital Shop entitlement resolver returned no result.');

      const sources = Array.isArray(resolution.sources) ? resolution.sources : [];
      const capacity = Number(resolution.effective_online_product_limit ?? 0);

      const publishedRequest = supabase
        .from('point_of_sale_products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', businessId)
        .eq('is_visible_online', true)
        .eq('archived', false);

      const standaloneRequest = sources.includes('standalone_digital_shop')
        ? supabase.rpc('get_active_digital_shop_entitlements', { p_business_id: businessId })
        : Promise.resolve({ data: [], error: null });

      const [publishedResult, standaloneResult] = await Promise.all([
        publishedRequest,
        standaloneRequest,
      ]);
      if (publishedResult.error) throw publishedResult.error;
      if (standaloneResult.error) throw standaloneResult.error;

      const standalone = Array.isArray(standaloneResult.data)
        ? standaloneResult.data[0]
        : standaloneResult.data;
      const publishedCount = publishedResult.count || 0;
      const entitled = Boolean(resolution.actor_authorized && resolution.has_publish_entitlement);

      setState({
        loading: false,
        entitled,
        capacity,
        publishedCount,
        remainingCapacity: Math.max(0, capacity - publishedCount),
        sources,
        source: sources.length === 1 ? sources[0] : sources.length > 1 ? 'combined' : null,
        startsAt: standalone?.starts_at || null,
        endsAt: standalone?.ends_at || null,
        expiresAt: standalone?.ends_at || null,
        capabilities: standalone ? {
          cartEnabled: Boolean(standalone.cart_enabled),
          codOrdersEnabled: Boolean(standalone.cod_orders_enabled),
          discountsEnabled: Boolean(standalone.discounts_enabled),
          localShopsEnabled: Boolean(standalone.local_shops_enabled),
          planId: standalone.plan_id,
          planCode: standalone.plan_code,
          planName: standalone.plan_name,
          billingModel: standalone.billing_model,
          currencyCode: standalone.currency_code,
        } : null,
        resolutionStatus: resolution.resolution_status || null,
        reasonCodes: Array.isArray(resolution.reason_codes) ? resolution.reason_codes : [],
        hasConflictingRecords: Boolean(resolution.has_conflicting_records),
        error: null,
      });
    } catch (error) {
      console.error('[useDigitalShopEntitlement] Unable to resolve entitlement:', error);
      setState(current => ({ ...current, loading: false, entitled: false, error }));
    }
  }, [authLoading, businessId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!businessId) return undefined;
    return subscribeToEntitlementChanges(businessId, refresh);
  }, [businessId, refresh]);

  return useMemo(() => ({ ...state, businessId, refresh }), [businessId, refresh, state]);
};
