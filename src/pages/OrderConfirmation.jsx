import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, ArrowRight, Package, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isActive = true;
    
    const fetchOrder = async () => {
        setLoading(true);
        setOrder(null);
        setLoadError(false);

        if (!orderId) {
            setLoading(false);
            return;
        }

        try {
            let token = null;

            try {
                const storedCredential = sessionStorage.getItem(`shopoapp:guest-order:${orderId}:token`);
                const parsedCredential = storedCredential ? JSON.parse(storedCredential) : null;
                if (typeof parsedCredential?.token === 'string' && parsedCredential.token.length > 0) {
                    token = parsedCredential.token;
                }
            } catch {
                token = null;
            }

            if (!token) return;

            const { data, error } = await supabase.rpc(
                'get_guest_order_confirmation',
                {
                    p_order_id: orderId,
                    p_guest_token: token
                }
            );

            if (error) {
                if (isActive) setLoadError(true);
                return;
            }

            if (!data || typeof data !== 'object' || !data.order_id || !data.retailer_id) return;

            if (isActive) {
                setOrder({
                    ...data,
                    id: data.order_id
                });
            }
        } catch {
            if (isActive) setLoadError(true);
        } finally {
            if (isActive) setLoading(false);
        }
    };
    fetchOrder();

    return () => {
        isActive = false;
    };
  }, [orderId]);

  if (loading) {
      return (
          <div className="container mx-auto p-6 max-w-lg space-y-4">
              <Skeleton className="h-12 w-3/4 mx-auto" />
              <Skeleton className="h-64 w-full" />
          </div>
      );
  }

  if (loadError) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
              <Package className="h-16 w-16 text-slate-300 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900">Unable to Load Order</h2>
              <p className="text-slate-600 mb-4">Please reload the page and try again.</p>
              <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
      );
  }

  if (!order) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
              <Package className="h-16 w-16 text-slate-300 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900">Order Not Found</h2>
              <Button onClick={() => navigate('/')}>Return Home</Button>
          </div>
      );
  }

  const isPaid = order.payment_status === 'paid' || order.status === 'Paid';
  const isFailed = order.payment_status === 'failed';
  
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      <div className="text-center mb-8">
        {isFailed ? (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4"><XCircle className="h-8 w-8 text-red-600" /></div>
        ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4"><CheckCircle className="h-8 w-8 text-green-600" /></div>
        )}
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{isFailed ? 'Payment Failed' : 'Order Confirmed!'}</h1>
        <p className="text-slate-600">{isFailed ? 'Issue processing payment. Please retry.' : `Thank you for your purchase. Order #${order.id.slice(0, 8)}`}</p>
      </div>

      <Card className="mb-6 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
            <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Order Summary</CardTitle>
                <span className="text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
                {Array.isArray(order.order_items) && order.order_items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                        <div><span className="font-medium text-slate-900">{item.product_name}</span><div className="text-slate-500">Qty: {item.quantity}</div></div>
                        <span className="font-medium">{formatPrice(item.total)}</span>
                    </div>
                ))}
            </div>
            
            <div className="border-t pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span>{formatPrice(order.total_amount - (order.gift_wrapping_cost || 0))}</span></div>
                {order.gift_wrapping && (<div className="flex justify-between text-sm text-purple-600"><span>Gift Wrapping</span><span>{formatPrice(order.gift_wrapping_cost)}</span></div>)}
                <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2"><span>Total</span><span className="text-green-700">{formatPrice(order.total_amount)}</span></div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
              <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><Truck className="h-4 w-4" /> Delivery Info</h3>
                  <div className="text-sm text-slate-600">
                      <p>{order.shipping_address?.name}</p>
                      <p>{order.shipping_address?.address}</p>
                      <p>{order.shipping_address?.city}</p>
                  </div>
              </CardContent>
          </Card>
          <Card>
              <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><Clock className="h-4 w-4" /> Payment Info</h3>
                  <div className="text-sm text-slate-600">
                      <p className="capitalize">Method: {order.payment_method || 'Cash'}</p>
                      <p className="capitalize flex items-center gap-2">Status: <span className={`font-bold ${isPaid ? 'text-green-600' : isFailed ? 'text-red-600' : 'text-amber-600'}`}>{order.payment_status || 'Pending'}</span></p>
                  </div>
              </CardContent>
          </Card>
      </div>

      <div className="flex flex-col gap-3">
          {isFailed ? (
              <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => navigate(-1)}>Retry Payment</Button>
          ) : (
              <Button className="w-full" onClick={() => navigate('/shop/' + order.retailer_id)}>Continue Shopping</Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => navigate(`/order-tracking/${orderId}`)}>Track Order <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </div>
  );
};

export default OrderConfirmation;
