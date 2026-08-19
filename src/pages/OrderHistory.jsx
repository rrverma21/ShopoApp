import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatPrice, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Search, ShoppingBag, ArrowRight, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('digital_shop_orders')
          .select('*')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error("Error fetching order history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const filteredOrders = orders.filter(o => 
      filter === 'all' ? true : o.status.toLowerCase() === filter
  );

  const getStatusColor = (status) => {
      switch(status?.toLowerCase()) {
          case 'delivered': return "bg-green-100 text-green-700 hover:bg-green-200";
          case 'shipped': return "bg-blue-100 text-blue-700 hover:bg-blue-200";
          case 'processing': return "bg-indigo-100 text-indigo-700 hover:bg-indigo-200";
          case 'cancelled': return "bg-red-100 text-red-700 hover:bg-red-200";
          default: return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg text-gray-900">My Orders</h1>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
         
         {/* Filters */}
         <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
             {['All', 'Pending', 'Processing', 'Shipped', 'Delivered'].map(status => (
                 <Button
                    key={status}
                    variant={filter === status.toLowerCase() ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full text-xs h-8 px-4"
                    onClick={() => setFilter(status.toLowerCase())}
                 >
                    {status}
                 </Button>
             ))}
         </div>

         {loading ? (
             <div className="text-center py-12 text-gray-400">Loading orders...</div>
         ) : filteredOrders.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-center">
                 <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag className="w-10 h-10 text-gray-300" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900">No Orders Found</h3>
                 <p className="text-gray-500 text-sm mt-1 mb-6">Looks like you haven't placed any orders yet.</p>
                 <Button onClick={() => navigate('/local-shops')}>Browse Shops</Button>
             </div>
         ) : (
             <div className="grid gap-4">
                 {filteredOrders.map(order => (
                     <Card 
                        key={order.id} 
                        className="rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-gray-100"
                        onClick={() => navigate(`/order-tracking/${order.id}`)}
                     >
                         <CardContent className="p-0">
                             <div className="p-4 flex flex-col gap-4">
                                 <div className="flex justify-between items-start">
                                     <div className="flex gap-3">
                                         <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                             <Package className="w-6 h-6 text-gray-400" />
                                         </div>
                                         <div>
                                             <div className="font-bold text-gray-900 text-sm">Order #{order.id.slice(0,8)}</div>
                                             <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                 <Calendar className="w-3 h-3" />
                                                 {format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}
                                             </div>
                                         </div>
                                     </div>
                                     <Badge className={cn("rounded-md border-none px-2.5 py-0.5", getStatusColor(order.status))}>
                                         {order.status}
                                     </Badge>
                                 </div>

                                 <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                     <div className="text-sm">
                                         <span className="text-gray-500">{order.order_items?.length || 0} items for </span>
                                         <span className="font-bold text-gray-900">{formatPrice(order.total_amount)}</span>
                                     </div>
                                     <div className="flex items-center text-xs font-bold text-blue-600">
                                         Track Order <ArrowRight className="w-3 h-3 ml-1" />
                                     </div>
                                 </div>
                             </div>
                         </CardContent>
                     </Card>
                 ))}
             </div>
         )}

      </div>
    </div>
  );
};

export default OrderHistory;