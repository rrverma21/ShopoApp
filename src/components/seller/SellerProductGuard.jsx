import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSellerProductAccess } from '@/hooks/useSellerProductAccess';
import { productPresentation } from '@/lib/sellerProductAccess';
import { ShopoContentCard } from '@/components/ui/shopo-page';
import { Button } from '@/components/ui/button';

export function SellerProductCard({ product, compact = false }) {
  const { user } = useAuth();
  const access = useSellerProductAccess();
  if (user?.profile?.role !== 'seller') return null;
  const item = access[product];
  if (item.state === 'loading') return <ShopoContentCard className={compact ? 'p-4 text-sm' : 'p-6'} role="status">Checking {product === 'pos' ? 'POS' : 'Digital Shop'} access...</ShopoContentCard>;
  if (item.state === 'error') return <ShopoContentCard className={compact ? 'flex items-center justify-between gap-3 p-4' : 'space-y-4 p-6'}><p role="alert" className={compact ? 'text-sm' : undefined}>Unable to verify {product === 'pos' ? 'POS' : 'Digital Shop'} access.</p><Button size={compact ? 'sm' : undefined} onClick={access.refresh}>Try again</Button></ShopoContentCard>;
  const display = productPresentation(product, item.state);
  return <ShopoContentCard className="min-w-0 space-y-4 p-6"><h2 className="text-xl font-bold">{display.title}</h2>{item.canAccess && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Active</p>}<p className="text-sm text-slate-600 dark:text-slate-300">{product === 'pos' ? (item.state === 'never' ? 'Your account does not currently include POS. Billing, inventory, customers, credit and reports.' : 'Billing, inventory, customers, credit and reports.') : 'Publish products, receive customer orders and manage your storefront.'}</p><Button asChild className="min-h-11 max-w-full whitespace-normal"><Link to={display.href}>{display.label}</Link></Button></ShopoContentCard>;
}

export function SellerProductGuard({ product, children }) {
  const { user } = useAuth();
  const access = useSellerProductAccess();
  if (user?.profile?.role !== 'seller' || access[product].canAccess) return children;
  return <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"><SellerProductCard product={product} /><Button asChild variant="outline"><Link to="/seller/dashboard">My Business Tools</Link></Button></div>;
}
