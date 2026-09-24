import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useDigitalShopEntitlement } from '@/hooks/useDigitalShopEntitlement';
import { accessState, resolveSellerAccess } from '@/lib/sellerProductAccess';

const empty = { pos: accessState('loading'), digitalShop: accessState('loading'), refresh: () => {} };
const Context = createContext(empty);

async function history(table, column, id) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const result = await supabase.from(table).select('*').eq(column, id).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (result.error) throw result.error;
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}

function SellerAccessSession({ children, user }) {
  const { membershipData, membershipLoading, membershipError } = useAuth();
  const entitlement = useDigitalShopEntitlement(user.id);
  const [now, setNow] = useState(Date.now());
  const lastCheckedAt = useRef(now);
  const memberships = useQuery({ queryKey: ['seller-pos-history', user.id, user.profile?.membership_plan_id], queryFn: async () => {
    const rows = await history('user_memberships', 'user_id', user.id);
    const ids = [...new Set([...rows.map(row => row.plan_id || row.membership_plan_id), user.profile?.membership_plan_id].filter(Boolean))];
    const plans = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const result = await supabase.from('membership_plans').select('*').in('id', ids.slice(offset, offset + 100));
      if (result.error) throw result.error;
      plans.push(...result.data);
    }
    if (ids.some(id => !plans.some(plan => plan.id === id))) throw new Error('Membership plan history is not readable.');
    return { rows: rows.map(row => ({ ...row, plan: plans.find(plan => plan.id === (row.plan_id || row.membership_plan_id)) })), profilePlan: plans.find(plan => plan.id === user.profile?.membership_plan_id) };
  }});
  const subscriptions = useQuery({ queryKey: ['seller-ds-history', user.id], queryFn: () => history('digital_shop_subscriptions', 'business_id', user.id) });
  const refresh = () => { memberships.refetch(); subscriptions.refetch(); entitlement.refresh(); };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    const channel = supabase.channel('seller-access-history-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_memberships', filter: 'user_id=eq.' + user.id }, () => memberships.refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_shop_subscriptions', filter: 'business_id=eq.' + user.id }, () => subscriptions.refetch())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.' + user.id }, () => memberships.refetch()).subscribe();
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, [user.id, memberships.refetch, subscriptions.refetch]);
  // Re-resolve only at start/end boundaries; do not interrupt editing on every tick.
  useEffect(() => {
    const boundaries = [...(memberships.data?.rows || []).flatMap(row => [row.start_date, row.end_date]), ...(subscriptions.data || []).flatMap(row => [row.starts_at, row.ends_at])];
    if (boundaries.some(date => Date.parse(date) > lastCheckedAt.current && Date.parse(date) <= now)) entitlement.refresh();
    lastCheckedAt.current = now;
  }, [now, memberships.data, subscriptions.data, entitlement.refresh]);
  const profileMembership = membershipData?.user_id === user.id ? membershipData : memberships.data?.profilePlan ? { plan: memberships.data.profilePlan, status: 'active', start_date: user.profile.membership_start_date, end_date: user.profile.membership_end_date } : null;
  const access = resolveSellerAccess({ memberships: memberships.data?.rows, profileMembership, subscriptions: subscriptions.data, entitlement, profile: user.profile, now,
    posLoading: membershipLoading || memberships.isPending,
    digitalShopLoading: memberships.isPending || subscriptions.isPending,
    posError: membershipError || memberships.error, historyError: memberships.error || subscriptions.error });
  return <Context.Provider value={{ ...access, entitlement, refresh }}>{children}</Context.Provider>;
}

export function SellerProductAccessProvider({ children }) {
  const { user } = useAuth();
  return user?.profile?.role === 'seller' ? <SellerAccessSession key={user.id} user={user}>{children}</SellerAccessSession> : <Context.Provider value={empty}>{children}</Context.Provider>;
}
export const useSellerProductAccess = () => useContext(Context);
