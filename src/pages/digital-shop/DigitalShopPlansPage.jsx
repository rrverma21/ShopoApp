import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useDigitalShopEntitlement } from '@/hooks/useDigitalShopEntitlement';
import { useDigitalShopCommercialData } from '@/hooks/useDigitalShopCommercialData';
import { DEFAULT_BILLING_CYCLE, FEATURE_LABELS, accessMessage, activationLabel, cycleLabel, estimateCommercialPrice, isRecommendedPlan, money, saleableOffers, tierKey } from '@/lib/digitalShopCommercial';
import { normalizeCountryCode } from '@/lib/membershipEligibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShopoPageContainer, ShopoPageHero, ShopoPageShell } from '@/components/ui/shopo-page';

export function OfferCard({ plan, price, addon, cycle, account, accountUnavailable }) {
  const [quantity, setQuantity] = useState('0');
  let estimate;
  let error;
  try { estimate = estimateCommercialPrice(price, addon, cycle, quantity, account); } catch (problem) { error = problem.message; }
  const recommended = isRecommendedPlan(plan);
  const tier = tierKey(plan);
  const neon = {
    starter: 'border-cyan-400/70 shadow-[0_0_26px_rgba(34,211,238,0.22)] hover:border-cyan-300 hover:shadow-[0_0_38px_rgba(34,211,238,0.36)]',
    business: 'border-orange-400/80 ring-1 ring-blue-400/40 shadow-[0_0_34px_rgba(255,107,53,0.32)] hover:border-orange-300 hover:shadow-[0_0_48px_rgba(255,107,53,0.48)]',
    pro: 'border-violet-400/70 shadow-[0_0_26px_rgba(167,139,250,0.24)] hover:border-violet-300 hover:shadow-[0_0_38px_rgba(167,139,250,0.38)]',
  }[tier] || 'border-blue-400/70 shadow-[0_0_26px_rgba(59,130,246,0.22)] hover:border-blue-300 hover:shadow-[0_0_38px_rgba(59,130,246,0.36)]';
  const accent = { starter: 'from-cyan-400 to-blue-500', business: 'from-[#FF6B35] to-blue-500', pro: 'from-violet-400 to-fuchsia-500' }[tier] || 'from-blue-400 to-cyan-500';
  return <Card className={`group relative overflow-hidden rounded-2xl bg-white/95 transition-all duration-300 hover:-translate-y-1 dark:bg-slate-900/95 ${neon}`}>
    <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
    <div aria-hidden="true" className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-3xl transition-opacity duration-300 group-hover:opacity-25`} />
    <CardHeader className="relative bg-transparent"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-xl font-bold">{plan.name}</CardTitle>{recommended && <Badge className="border-0 bg-gradient-to-r from-[#FF6B35] to-orange-500 text-white shadow-[0_0_16px_rgba(255,107,53,0.45)]"><Sparkles className="mr-1 h-3.5 w-3.5" />Recommended</Badge>}</div><CardDescription className="leading-relaxed">{plan.description}</CardDescription></CardHeader>
    <CardContent className="relative space-y-5">
      <div><p className="text-3xl font-extrabold tracking-tight text-[#003D82] dark:text-blue-300">{money(price[`${cycle}_price`])}<span className="text-base font-normal text-slate-500 dark:text-slate-400">/{cycleLabel(cycle)}</span></p><p className="mt-2 text-sm font-medium">{price.included_product_limit} products included</p></div>
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800"><p>One-time activation estimate: <strong>{money(price.activation_fee)}</strong></p><p className="mt-1 text-slate-600 dark:text-slate-300">{accountUnavailable ? 'Activation status unavailable. Refresh before reviewing a first-payment estimate.' : activationLabel(account)}</p></div>
      <div className="space-y-2"><label htmlFor={`addons-${price.id}`} className="text-sm font-medium">Additional +100 Product Slots</label><Input id={`addons-${price.id}`} type="number" min="0" step="1" value={quantity} disabled={!addon} onChange={event => setQuantity(event.target.value)} /><p className="text-xs text-slate-500">{addon ? `${money(addon[`${cycle}_price`])} per unit/${cycleLabel(cycle)}. Uses the plan's billing cycle.` : 'Add-ons are not currently available.'}</p></div>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-2"><dt>Total product capacity</dt><dd className="font-semibold">{estimate.capacity}</dd></div>
        <div className="flex justify-between gap-2"><dt>Add-on subtotal</dt><dd>{money(estimate.addonSubtotal)}/{cycleLabel(cycle)}</dd></div>
        <div className="flex justify-between gap-2"><dt>Recurring total</dt><dd>{money(estimate.recurring)}/{cycleLabel(cycle)}</dd></div>
        {!accountUnavailable && <div className="flex justify-between gap-2 border-t pt-2"><dt>First payment estimate</dt><dd className="font-bold">{money(estimate.firstPayment)}</dd></div>}
        {cycle === 'annual' && estimate.annualSavings > 0 && <div className="text-emerald-700 dark:text-emerald-400">Save {money(estimate.annualSavings)} compared with 12 monthly payments, excluding activation.</div>}
      </dl>}
      <ul className="space-y-2 text-sm">{Object.entries(FEATURE_LABELS).map(([key, label]) => <li key={key} className="flex items-center gap-2">{price[key] ? <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />}<span>{label}</span><span className="sr-only">: {price[key] ? 'Included' : 'Not included'}</span></li>)}</ul>
      <Button className="w-full bg-gradient-to-r from-[#FF6B35] to-orange-500 text-white shadow-md hover:from-orange-500 hover:to-[#FF6B35] hover:shadow-lg" asChild disabled={Boolean(error)}><Link to={`/digital-shop/commercial-checkout/${plan.id}?billing_cycle=${cycle}&addon_quantity=${encodeURIComponent(quantity)}`}>Choose this plan<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
    </CardContent>
  </Card>;
}

export default function DigitalShopPlansPage() {
  const { user } = useAuth();
  const entitlement = useDigitalShopEntitlement();
  const data = useDigitalShopCommercialData(entitlement.businessId);
  const [cycle, setCycle] = useState(DEFAULT_BILLING_CYCLE);
  const offers = data.catalog ? saleableOffers(data.catalog.plans, data.catalog.prices, normalizeCountryCode(user?.profile?.country)) : [];
  const addons = data.catalog?.addons.filter(item => item.is_active && item.code === 'product_slots_100') || [];
  const addon = addons.length === 1 ? addons[0] : null;
  return <ShopoPageShell><ShopoPageContainer className="space-y-6 py-7">
    <ShopoPageHero eyebrow="Flexible plans for growing shops" title="Digital Shop Plans" description={entitlement.loading ? 'Checking current access…' : entitlement.error ? 'Current access could not be verified.' : accessMessage(entitlement.sources)} actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:border-[#FF6B35] hover:bg-white/20 hover:text-white"><Link to="/digital-shop/subscription">Subscription & access</Link></Button>{!entitlement.loading && entitlement.entitled && <Button asChild className="bg-[#FF6B35] text-white hover:bg-orange-600"><Link to="/digital-shop/dashboard">Continue to your Digital Shop<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}</div>} />
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-bold">Choose your billing cycle</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Annual billing offers the best value for long-term growth.</p></div><div className="inline-flex w-fit flex-wrap gap-2 rounded-xl bg-slate-100 p-1.5 dark:bg-slate-900" role="group" aria-label="Billing cycle">{['monthly', 'annual'].map(value => <Button key={value} aria-pressed={cycle === value} variant={cycle === value ? 'default' : 'ghost'} className={cycle === value ? 'bg-[#003D82] text-white hover:bg-blue-800' : ''} onClick={() => setCycle(value)}>{value === 'annual' ? 'Annual — Recommended' : 'Monthly'}</Button>)}</div></div><p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Compare estimates below. Final payment terms are calculated and locked by the server. Activation is charged once per business; renewal is explicit and automatic collection is not enabled.</p></section>
    {data.loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" aria-label="Loading prices" /></div> : data.catalogError ? <Card className="rounded-2xl border-red-200 shadow-md dark:border-red-900"><CardContent className="py-8"><p role="alert">Pricing could not be loaded. {data.catalogError.message}</p><Button onClick={data.refresh} className="mt-3">Retry</Button></CardContent></Card> : <>
      {data.contextError && <div role="alert" className="rounded-lg border p-3 text-sm">{data.contextError.message} <Button variant="link" onClick={data.refresh}>Retry account details</Button></div>}
      {offers.length ? <div className="grid items-start gap-7 py-3 lg:grid-cols-3">{offers.map(({ plan, price }) => <OfferCard key={price.id} plan={plan} price={price} addon={addon} cycle={cycle} account={data.context?.account} accountUnavailable={Boolean(data.contextError)} />)}</div> : <Card className="rounded-2xl shadow-md"><CardContent className="py-12 text-center">Commercial pricing is not available for your market yet. Existing Digital Shop access is unaffected.</CardContent></Card>}
    </>}
  </ShopoPageContainer></ShopoPageShell>;
}
