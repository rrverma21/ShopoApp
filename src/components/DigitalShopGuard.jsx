import React from 'react';
import { SellerProductGuard } from '@/components/seller/SellerProductGuard';
import { AlertCircle, Loader2, Lock, RefreshCw, Store } from 'lucide-react';
import { useDigitalShopEntitlement } from '@/hooks/useDigitalShopEntitlement';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const GuardState = ({ error, onRetry }) => (
  <div className="flex min-h-[60vh] items-center justify-center p-4">
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          {error ? <AlertCircle className="h-7 w-7 text-red-600" /> : <Lock className="h-7 w-7 text-slate-600" />}
        </div>
        <CardTitle>{error ? 'Unable to verify Digital Shop access' : 'Digital Shop plan required'}</CardTitle>
        <CardDescription>
          {error
            ? 'Your access could not be verified. Try again before making catalogue changes.'
            : 'An active Digital Shop entitlement is required. Your POS membership is checked separately.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {error ? (
          <Button onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
        ) : (
          <Button variant="outline" asChild><Link to="/digital-shop/plans"><Store className="mr-2 h-4 w-4" />View Digital Shop plans</Link></Button>
        )}
      </CardContent>
    </Card>
  </div>
);

const DigitalShopGuard = ({ children }) => {
  const entitlement = useDigitalShopEntitlement();

  if (entitlement.loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }
  if (entitlement.error) return <GuardState error onRetry={entitlement.refresh} />;
  if (!entitlement.entitled) return <GuardState onRetry={entitlement.refresh} />;

  return typeof children === 'function' ? children(entitlement) : children;
};

const SellerDigitalShopGuard = ({ children }) => <SellerProductGuard product="digitalShop"><DigitalShopGuard>{children}</DigitalShopGuard></SellerProductGuard>;
export default SellerDigitalShopGuard;
