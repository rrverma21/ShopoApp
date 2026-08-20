import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const OrderTracking = () => {
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
          'get_guest_order_tracking',
          {
            p_order_id: orderId,
            p_guest_token: token
          }
        );

        if (error) {
          if (isActive) setLoadError(true);
          return;
        }

        if (!data || typeof data !== 'object' || typeof data.status !== 'string' || data.total_amount == null) {
          return;
        }

        if (isActive) {
          setOrder({
            ...data,
            order_items: Array.isArray(data.order_items) ? data.order_items : []
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
     return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  if (loadError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Tracking</h2>
            <p className="text-gray-500 mb-4">Please reload the page and try again.</p>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      );
  }

  if (!order) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      );
  }

  const steps = [
      { id: 'pending', label: 'Order Placed', icon: Clock },
      { id: 'processing', label: 'Processing', icon: Package },
      { id: 'shipped', label: 'Shipped', icon: Truck },
      { id: 'delivered', label: 'Delivered', icon: CheckCircle },
  ];

  const currentStatusLower = order.status?.toLowerCase() || 'pending';
  const currentStepIndex = steps.findIndex(s => s.id === currentStatusLower);
  const progressWidth = currentStepIndex >= 0
      ? (currentStepIndex / (steps.length - 1)) * 100
      : 0;
  const lastUpdatedAt = new Date(order.updated_at || order.created_at);
  const lastUpdatedLabel = Number.isNaN(lastUpdatedAt.getTime())
      ? 'Unavailable'
      : format(lastUpdatedAt, 'MMM d, h:mm a');

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
                <h1 className="font-bold text-lg text-gray-900">Track Order</h1>
                <div className="text-xs text-gray-500">#{orderId.slice(0,8)}</div>
            </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-6">
            
            {/* Status Timeline */}
            <Card className="rounded-xl shadow-sm border-none overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
                    <div className="text-3xl font-bold mb-1">{order.status}</div>
                    <div className="text-sm opacity-80">
                        Last updated: {lastUpdatedLabel}
                    </div>
                </div>
                <CardContent className="p-6">
                    <div className="relative flex justify-between items-start">
                        {/* Progress Bar Background */}
                        <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 rounded-full -z-10"></div>
                        
                        {/* Active Progress Bar */}
                        <div 
                            className="absolute top-5 left-0 h-1 bg-green-500 rounded-full -z-10 transition-all duration-500"
                            style={{ width: `${progressWidth}%` }}
                        ></div>

                        {steps.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;

                            return (
                                <div key={step.id} className="flex flex-col items-center gap-2 w-20">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10 border-4",
                                        isActive ? "bg-green-500 border-green-100 text-white shadow-lg" : "bg-white border-gray-100 text-gray-300"
                                    )}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className={cn(
                                        "text-xs font-medium text-center transition-colors",
                                        isActive ? "text-gray-900" : "text-gray-400",
                                        isCurrent && "font-bold text-green-600"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {order.tracking_number && (
                        <div className="mt-8 bg-gray-50 p-3 rounded-lg flex justify-between items-center text-sm border border-gray-100">
                            <span className="text-gray-500">Tracking Number:</span>
                            <span className="font-mono font-bold text-gray-800">{order.tracking_number}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Order Info */}
            <Card className="rounded-xl shadow-sm border-gray-100">
                <CardHeader>
                    <CardTitle className="text-base font-bold">Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-3">
                        {order.order_items.map((item, i) => (
                             <div key={i} className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-500">
                                         {item.quantity}x
                                     </div>
                                     <span className="font-medium text-gray-700">{item.product_name}</span>
                                 </div>
                                 <span className="text-gray-900 font-semibold">{formatPrice(item.total)}</span>
                             </div>
                        ))}
                     </div>
                     
                     <Separator />
                     
                     <div className="flex justify-between items-center pt-2">
                         <span className="font-bold text-gray-900">Total Amount</span>
                         <span className="font-bold text-xl text-green-600">{formatPrice(order.total_amount)}</span>
                     </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default OrderTracking;
