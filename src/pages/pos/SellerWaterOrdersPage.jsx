import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Droplet, RefreshCw, AlertCircle, ShoppingBag, Clock, CheckCircle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import WaterOrderCard from '@/components/pos/WaterOrderCard';
import WaterOrderDetails from '@/components/pos/WaterOrderDetails';

const SellerWaterOrdersPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const fetchOrders = async (showLoading = true) => {
    if (!user) return;
    
    try {
      if (showLoading) setLoading(true);
      setIsRefreshing(true);

      // 1. Get Seller Settings for Delivery Areas
      const { data: settings } = await supabase
        .from('pos_retailer_settings')
        .select('water_delivery_areas')
        .eq('user_id', user.id)
        .single();
      
      const myAreas = settings?.water_delivery_areas || [];
      const selectStr = `
        *,
        water_products (name, image_url),
        water_delivery_areas (name)
      `;

      // 2. Fetch My Assigned Orders (All statuses)
      const myOrdersPromise = supabase
        .from('water_orders')
        .select(selectStr)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      // 3. Fetch Pending Orders in My Areas (Unassigned)
      let areaOrdersPromise = Promise.resolve({ data: [] });
      if (myAreas.length > 0) {
        areaOrdersPromise = supabase
            .from('water_orders')
            .select(selectStr)
            .in('delivery_area_id', myAreas)
            .eq('status', 'pending')
            .is('seller_id', null)
            .order('created_at', { ascending: false });
      }

      const [myOrdersRes, areaOrdersRes] = await Promise.all([myOrdersPromise, areaOrdersPromise]);

      if (myOrdersRes.error) throw myOrdersRes.error;
      if (areaOrdersRes.error) throw areaOrdersRes.error;

      // Merge and Deduplicate
      const allOrders = [...(myOrdersRes.data || []), ...(areaOrdersRes.data || [])];
      const uniqueOrders = Array.from(new Map(allOrders.map(item => [item.id, item])).values());
      
      // Sort desc by created_at
      uniqueOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setOrders(uniqueOrders);

    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders.",
        variant: "destructive"
      });
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);
    
    const subscription = supabase
      .channel('seller_water_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_orders' }, () => {
        fetchOrders(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (updatingOrderId) return;
    setUpdatingOrderId(orderId);

    try {
        const updates = { 
           status: newStatus, 
           updated_at: new Date().toISOString() 
        };
        
        // If accepting, assign to self
        if (newStatus === 'confirmed') {
            updates.seller_id = user.id;
        }

        // Optimistic Update
        const previousOrders = [...orders];
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));

        const { error } = await supabase
           .from('water_orders')
           .update(updates)
           .eq('id', orderId);

        if (error) {
            setOrders(previousOrders); // Revert
            throw error;
        }

        toast({
            title: "Success",
            description: `Order marked as ${newStatus}.`,
            variant: "default",
            className: "bg-green-50 border-green-200 text-green-800"
        });

    } catch (err) {
        console.error("Update failed:", err);
        toast({
            title: "Update Failed",
            description: "Could not update order status.",
            variant: "destructive"
        });
        fetchOrders(false);
    } finally {
        setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = (orderId) => handleUpdateStatus(orderId, 'cancelled');

  const groupedOrders = React.useMemo(() => {
    const groups = {
      pending: [],
      confirmed: [],
      delivered: []
    };

    orders.forEach(order => {
      const status = (order.status || 'pending').toLowerCase();
      if (status === 'pending') {
        groups.pending.push(order);
      } else if (['confirmed', 'accepted'].includes(status)) {
        groups.confirmed.push(order);
      } else if (['delivered', 'completed', 'cancelled', 'rejected'].includes(status)) {
        groups.delivered.push(order);
      }
    });

    return groups;
  }, [orders]);

  const renderSection = (title, icon, items, variant) => {
    if (items.length === 0) return null;

    let badgeColor = "bg-slate-100 text-slate-700";
    if (variant === 'pending') badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (variant === 'confirmed') badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
    if (variant === 'delivered') badgeColor = "bg-green-100 text-green-800 border-green-200";

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 sticky top-16 z-10 bg-slate-50/95 backdrop-blur py-2 border-b border-slate-200/50">
          <div className={`p-2 rounded-lg ${variant === 'pending' ? 'bg-yellow-50 text-yellow-600' : variant === 'confirmed' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
            {icon}
          </div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <Badge variant="secondary" className={`${badgeColor} ml-auto sm:ml-2`}>
            {items.length}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map(order => (
            <WaterOrderCard
              key={order.id}
              order={order}
              onMarkDelivered={handleUpdateStatus}
              onCancelOrder={handleCancelOrder}
              onViewDetails={(o) => { setSelectedOrder(o); setIsDetailsOpen(true); }}
              isUpdating={updatingOrderId === order.id}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-20 min-h-full bg-slate-50/50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Droplet className="w-8 h-8 text-blue-600 fill-blue-100" />
                    Water Orders Dashboard
                </h1>
                <p className="text-slate-500 mt-1">Manage delivery requests and track order status efficiently.</p>
            </div>
            <Button 
                variant="outline" 
                onClick={() => fetchOrders(true)} 
                disabled={isRefreshing}
                className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
        </div>

        {/* Content */}
        {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Loading dashboard...</p>
            </div>
        ) : orders.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                     <ShoppingBag className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No orders yet</h3>
                <p className="text-slate-500 mt-2 max-w-md mx-auto">
                    Requests from customers in your area will appear here. Check back soon!
                </p>
            </div>
        ) : (
            <div className="space-y-10">
                {/* 1. Pending Orders (Top Priority) */}
                {renderSection(
                    "Pending Orders", 
                    <Clock className="w-5 h-5" />, 
                    groupedOrders.pending, 
                    'pending'
                )}

                {/* 2. Confirmed Orders */}
                {renderSection(
                    "Confirmed Orders", 
                    <CheckCircle className="w-5 h-5" />, 
                    groupedOrders.confirmed, 
                    'confirmed'
                )}

                {/* 3. Delivered/Completed */}
                {renderSection(
                    "Delivered & History", 
                    <Truck className="w-5 h-5" />, 
                    groupedOrders.delivered, 
                    'delivered'
                )}
            </div>
        )}
      </div>

      <WaterOrderDetails 
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          order={selectedOrder}
          onStatusUpdate={handleUpdateStatus}
          currentUserId={user?.id}
          isUpdating={!!updatingOrderId && updatingOrderId === selectedOrder?.id}
      />
    </div>
  );
};

export default SellerWaterOrdersPage;