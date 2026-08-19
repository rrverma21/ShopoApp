import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatPrice, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingBag, 
  Truck, 
  Eye, 
  AlertCircle, 
  Package, 
  ChevronRight,
  Store,
  Calendar,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';

const DigitalShopOrdersCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('digital_shop_orders')
        .select(`
          *,
          retailer:profiles!digital_shop_orders_retailer_id_fkey(business_name)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching digital shop orders:', err);
      setError('Failed to load recent orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200';
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className="rounded-xl shadow-lg border-none overflow-hidden h-full">
        <CardHeader className="border-b bg-gray-50/50 pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border-b flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-xl shadow-lg border-red-100 bg-red-50/20">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-red-600 font-medium">{error}</p>
          <Button variant="outline" onClick={fetchOrders} className="border-red-200 hover:bg-red-50 text-red-600">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-lg border-none overflow-hidden bg-white">
      <CardHeader className="border-b bg-gray-50/80 pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-900">
          <ShoppingBag className="h-5 w-5 text-indigo-600" />
          Recent Digital Orders
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/order-history')} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-semibold">
          View All <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-indigo-300" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-1">No orders yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs">Start exploring local shops and place your first digital order today!</p>
            <Button onClick={() => navigate('/local-shops')} className="bg-indigo-600 hover:bg-indigo-700">
              Browse Shops
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Desktop Headers */}
            <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 bg-gray-50/40 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-1">Order ID</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {orders.map((order) => (
              <div 
                key={order.id} 
                className="group p-4 md:px-6 md:py-4 hover:bg-gray-50 transition-colors duration-200 flex flex-col md:grid md:grid-cols-5 md:gap-4 md:items-center"
              >
                {/* Mobile: Header Row */}
                <div className="flex justify-between md:hidden mb-2">
                   <div className="font-mono text-xs text-gray-500">#{order.id.slice(0, 8)}</div>
                   <Badge variant="outline" className={cn("rounded-md px-2 py-0 font-medium border-0", getStatusColor(order.status))}>
                      {order.status}
                   </Badge>
                </div>

                {/* Desktop: Order ID & Shop Name */}
                <div className="col-span-1 mb-1 md:mb-0">
                  <div className="hidden md:block font-mono text-xs text-gray-500 mb-0.5">#{order.id.slice(0, 8)}</div>
                  <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    <Store className="w-3 h-3 text-gray-400 md:hidden" />
                    {order.retailer?.business_name || 'Unknown Shop'}
                  </div>
                </div>

                {/* Date */}
                <div className="col-span-1 text-sm text-gray-600 flex items-center gap-1.5 mb-1 md:mb-0">
                  <Calendar className="w-3 h-3 text-gray-400 md:hidden" />
                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                </div>

                {/* Amount */}
                <div className="col-span-1 md:text-right font-bold text-gray-900 mb-2 md:mb-0">
                  {formatPrice(order.total_amount)}
                </div>

                {/* Desktop Status */}
                <div className="col-span-1 hidden md:flex justify-center">
                  <Badge variant="outline" className={cn("rounded-md px-2.5 py-0.5 font-medium border-0", getStatusColor(order.status))}>
                    {order.status}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex gap-2 md:justify-end mt-1 md:mt-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => setSelectedOrder(order)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                      </Button>
                    </DialogTrigger>
                    {selectedOrder && selectedOrder.id === order.id && (
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Order Details #{selectedOrder.id.slice(0,8)}</DialogTitle>
                          <DialogDescription>
                            Placed on {format(new Date(selectedOrder.created_at), 'PPP p')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                           {/* Items List */}
                           <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                              {selectedOrder.order_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <div>
                                    <div className="font-medium text-gray-900">{item.product_name}</div>
                                    <div className="text-gray-500 text-xs">Qty: {item.quantity} × {formatPrice(item.price)}</div>
                                  </div>
                                  <div className="font-semibold">{formatPrice(item.total)}</div>
                                </div>
                              ))}
                           </div>
                           
                           <Separator />
                           
                           {/* Summary */}
                           <div className="space-y-1 text-sm">
                              {selectedOrder.gift_wrapping && (
                                <div className="flex justify-between text-purple-600">
                                  <span>Gift Wrapping</span>
                                  <span>+{formatPrice(selectedOrder.gift_wrapping_cost)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold pt-1 text-base">
                                <span>Total Amount</span>
                                <span>{formatPrice(selectedOrder.total_amount)}</span>
                              </div>
                           </div>

                           <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-xs text-gray-600">
                              <div className="flex items-start gap-2">
                                <Store className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>Sold by: <span className="font-semibold text-gray-900">{selectedOrder.retailer?.business_name}</span></span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CreditCard className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>Payment: <span className="font-semibold text-gray-900">{selectedOrder.payment_method}</span></span>
                              </div>
                           </div>
                        </div>
                        <div className="flex justify-end pt-2">
                           <Button onClick={() => navigate(`/order-tracking/${selectedOrder.id}`)} className="w-full sm:w-auto">
                              <Truck className="w-4 h-4 mr-2" /> Track Order Status
                           </Button>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs gap-1 border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
                    onClick={() => navigate(`/order-tracking/${order.id}`)}
                  >
                    <Truck className="h-3 w-3" /> Track
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {orders.length > 0 && (
        <CardFooter className="bg-gray-50/50 border-t p-3 flex justify-center md:justify-end">
            <Button variant="link" size="sm" onClick={() => navigate('/order-history')} className="text-indigo-600 hover:text-indigo-800 text-xs h-auto p-0">
               View Complete Order History
            </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default DigitalShopOrdersCard;