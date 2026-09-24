import React, { useMemo, useRef, useState } from 'react';
import { load as loadCashfree } from '@cashfreepayments/cashfree-js';
import { ArrowLeft, CreditCard, Loader2, LockKeyhole } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useDigitalShopEntitlement } from '@/hooks/useDigitalShopEntitlement';
import { useDigitalShopCommercialData } from '@/hooks/useDigitalShopCommercialData';
import { cycleLabel, money, saleableOffers } from '@/lib/digitalShopCommercial';
import { normalizeCountryCode } from '@/lib/membershipEligibility';
import { commercialPrepareArgs, commercialPreparationErrorMessage, prepareCommercialWithRecovery, preparedCommercialSummary } from '@/lib/digitalShopCommercialCheckout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShopoPageContainer, ShopoPageHero, ShopoPageShell } from '@/components/ui/shopo-page';

export default function DigitalShopCommercialCheckoutPage() {
  return (
    <ShopoPageShell>
      <ShopoPageContainer width="narrow" className="pt-7">
        <ShopoPageHero
          eyebrow="Digital Shop"
          title="Secure checkout"
          description="Prepare and confirm your seller subscription purchase. Server-calculated pricing remains authoritative."
        />
      </ShopoPageContainer>
      <DigitalShopCommercialCheckoutContent />
    </ShopoPageShell>
  );
}

function DigitalShopCommercialCheckoutContent() {
  const { planId } = useParams(); const [params] = useSearchParams(); const { user } = useAuth();
  const entitlement = useDigitalShopEntitlement(); const data = useDigitalShopCommercialData(entitlement.businessId);
  const [cycle, setCycle] = useState(params.get('billing_cycle') === 'monthly' ? 'monthly' : 'annual');
  const [quantity, setQuantity] = useState(params.get('addon_quantity') || '0'); const [purchase, setPurchase] = useState(null);
  const [error, setError] = useState(null); const [preparing, setPreparing] = useState(false); const [starting, setStarting] = useState(false);
  const key = useRef(crypto.randomUUID());
  const offer = useMemo(() => data.catalog ? saleableOffers(data.catalog.plans, data.catalog.prices, normalizeCountryCode(user?.profile?.country)).find(item => item.plan.id === planId) : null, [data.catalog, planId, user?.profile?.country]);
  const changeSelection = (nextCycle, nextQuantity) => { setCycle(nextCycle); setQuantity(nextQuantity); setPurchase(null); setError(null); key.current = crypto.randomUUID(); };
  const prepare = async () => { if (!offer || preparing || purchase) return; setPreparing(true); setError(null); try { const preparation = await prepareCommercialWithRecovery(supabase, commercialPrepareArgs(offer.plan.id, cycle, quantity, key.current)); if (preparation.error) { setError(commercialPreparationErrorMessage(preparation)); return; } preparedCommercialSummary(preparation.data); setPurchase(preparation.data); } catch { setError('Purchase could not be prepared. Review your selection and try again.'); } finally { setPreparing(false); } };
  const start = async () => { if (!purchase || starting) return; setStarting(true); setError(null); try { const { data: result, error: invokeError } = await supabase.functions.invoke('create-digital-shop-cashfree-order', { body: { purchase_order_id: purchase.id } }); if (!invokeError && result?.status === 'checkout_retired') { setPurchase(null); key.current = crypto.randomUUID(); setStarting(false); setError('The old checkout has expired. Prepare a new purchase to review current pricing.'); return; } if (invokeError || !result?.success || !result.payment_session_id) throw new Error('payment start failed'); const cashfree = await loadCashfree({ mode: result.is_sandbox ? 'sandbox' : 'production' }); await cashfree.checkout({ paymentSessionId: result.payment_session_id, redirectTarget: '_self' }); } catch { setError('Secure payment could not be opened. Your prepared purchase was not marked paid. Please retry.'); setStarting(false); } };
  if (data.loading || entitlement.loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!offer) return <div className="mx-auto max-w-xl px-4 py-16"><Card><CardHeader><CardTitle>Plan unavailable</CardTitle><CardDescription>This commercial offer is no longer available for purchase.</CardDescription></CardHeader><CardContent><Button asChild><Link to="/digital-shop/plans">Back to plans</Link></Button></CardContent></Card></div>;
  const summary = purchase ? preparedCommercialSummary(purchase) : null;
  return <div className="min-h-full bg-slate-50 px-4 py-10 dark:bg-slate-950"><div className="mx-auto max-w-3xl space-y-5"><Button asChild variant="ghost"><Link to="/digital-shop/plans"><ArrowLeft className="mr-2 h-4 w-4" />Plans</Link></Button><Card><CardHeader><CardTitle>Secure Digital Shop checkout</CardTitle><CardDescription>Seller subscription checkout. Amounts become authoritative only after server preparation.</CardDescription></CardHeader><CardContent className="space-y-5"><h2 className="text-xl font-semibold">{offer.plan.name}</h2>{!purchase && <><div className="flex gap-2">{['monthly','annual'].map(value => <Button key={value} variant={cycle === value ? 'default' : 'outline'} onClick={() => changeSelection(value, quantity)}>{value === 'annual' ? 'Annual — Recommended' : 'Monthly'}</Button>)}</div><label className="block text-sm font-medium">+100 product slots quantity <input className="ml-2 w-20 rounded border p-1" type="number" min="0" step="1" value={quantity} onChange={event => changeSelection(cycle, event.target.value)} /></label><p className="text-sm text-slate-500">Displayed plan estimates are informational. The server calculates the payable amount.</p></>}{summary && <div className="space-y-2 rounded border bg-emerald-50 p-4"><p className="font-semibold">Authoritative prepared purchase</p><p className="text-sm">Reference: {summary.reference}</p><p>Subscription ({cycleLabel(summary.cycle)}): {money(summary.subscriptionFee)}</p>{summary.activationFee > 0 && <p>Activation fee: {money(summary.activationFee)}</p>}{summary.addonFee > 0 && <p>Add-ons: {money(summary.addonFee)}</p>}<p className="border-t pt-2 font-bold">Total payable: {money(summary.total)}</p></div>}{error && <p role="alert" className="text-sm text-red-600">{error}</p>}{purchase ? <Button className="w-full" size="lg" onClick={start} disabled={starting}>{starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}{starting ? 'Opening secure payment…' : 'Confirm and pay with Cashfree'}</Button> : <Button className="w-full" size="lg" onClick={prepare} disabled={preparing}>{preparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}{preparing ? 'Preparing…' : 'Prepare secure payment'}</Button>}</CardContent></Card></div></div>;
}
