import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from "@/components/ui/use-toast";
import { 
  Loader2, RefreshCw, AlertCircle, ShoppingBag, Droplet, 
  Bell, Plus, ChevronDown, CheckCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import WaterOrderCard from '@/components/pos/WaterOrderCard';
import WaterOrderFilters from '@/components/pos/WaterOrderFilters';
import WaterOrderStats from '@/components/pos/WaterOrderStats';
import WaterOrderDetails from '@/components/pos/WaterOrderDetails';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';

const WaterOrdersDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [filters, setFilters] = useState({
    status: 'all',
    area: 'all',
    search: '',
    date: undefined,
    priority: 'all'
  });
  
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });

  const debouncedSearch = useDebounce(filters.search, 300);
  const abortControllerRef = useRef(null);
  const autoRefreshInterval = useRef(null);
  const isMounted = useRef(false);

  // Extract unique areas
  const uniqueAreas = useMemo(() => {
    const areas = new Set();
    orders.forEach(order => {
        if (order.water_delivery_areas?.name) {
            areas.add(order.water_delivery_areas.name);
        }
    });
    return Array.from(areas).sort();
  }, [orders]);

  // Fetch Data Logic
  const fetchOrders = async (showLoading = true) => {
    if (!user) return;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) setLoading(true);
      setIsRefreshing(true);
      setError(null);

      // 1. Get Settings
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

      // 2. Fetch My Assigned Orders
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

      // Merge results
      const allOrders = [...(myOrdersRes.data || []), ...(areaOrdersRes.data || [])];
      const uniqueOrders = Array.from(new Map(allOrders.map(item => [item.id, item])).values());
      
      uniqueOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (isMounted.current) {
        setOrders(uniqueOrders);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error("Error fetching water orders:", error);
      if (isMounted.current && showLoading) {
         setError("Failed to sync orders.");
      }
    } finally {
      if (isMounted.current) {
        if (showLoading) setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    if (user) {
      fetchOrders(true);
      
      const subscription = supabase
        .channel('water_orders_dashboard_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'water_orders' }, () => {
            fetchOrders(false);
            toast({ title: "Updated", description: "Orders list refreshed.", duration: 2000 });
        })
        .subscribe();

      return () => {
        isMounted.current = false;
        supabase.removeChannel(subscription);
        if (abortControllerRef.current) abortControllerRef.current.abort();
      };
    }
  }, [user]);

  // Auto Refresh Logic
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshInterval.current = setInterval(() => {
        fetchOrders(false);
      }, 30000); // 30 seconds
    } else {
      clearInterval(autoRefreshInterval.current);
    }
    return () => clearInterval(autoRefreshInterval.current);
  }, [autoRefresh]);

  // Actions
  const handleUpdateStatus = async (orderId, newStatus) => {
      if (updatingOrderId) return;
      setUpdatingOrderId(orderId);
      
      try {
          const updates = { 
             status: newStatus, 
             updated_at: new Date().toISOString() 
          };
          
          if (newStatus === 'confirmed') updates.seller_id = user.id;

          // Optimistic
          const previousOrders = [...orders];
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
          if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, ...updates }));

          const { error } = await supabase.from('water_orders').update(updates).eq('id', orderId);

          if (error) {
              setOrders(previousOrders); // Revert
              throw error;
          }
          
          toast({
              title: "Status Updated",
              description: <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Order marked as {newStatus}</span>,
              variant: "default"
          });

      } catch (err) {
          toast({ title: "Failed", description: "Could not update order.", variant: "destructive" });
          fetchOrders(false);
      } finally {
          setUpdatingOrderId(null);
      }
  };

  const processedOrders = useMemo(() => {
    let result = [...orders];

    if (filters.status !== 'all') {
        result = result.filter(o => {
            const status = o.status ? o.status.toLowerCase() : 'pending';
            return status === filters.status || (filters.status === 'confirmed' && ['accepted', 'confirmed', 'processing'].includes(status));
        });
    }

    if (filters.area !== 'all') {
        result = result.filter(o => o.water_delivery_areas?.name === filters.area);
    }

    if (filters.date) {
        const filterDateStr = filters.date.toDateString();
        result = result.filter(o => new Date(o.created_at).toDateString() === filterDateStr);
    }
    
    if (filters.priority === 'urgent') {
        result = result.filter(o => o.is_urgent);
    }

    if (debouncedSearch) {
        const lowerSearch = debouncedSearch.toLowerCase();
        result = result.filter(o => 
            o.id.toLowerCase().includes(lowerSearch) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(lowerSearch)) ||
            (o.customer_phone && o.customer_phone.includes(lowerSearch))
        );
    }

    result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (sortConfig.key === 'total_price') {
            valA = Number(valA);
            valB = Number(valB);
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        if (sortConfig.key === 'created_at') {
             valA = new Date(a.created_at || 0).getTime();
             valB = new Date(b.created_at || 0).getTime();
             return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        
        return 0;
    });

    return result;
  }, [orders, filters, debouncedSearch, sortConfig]);

  const newOrderCount = orders.filter(o => (o.status || 'pending') === 'pending').length;

  return (
    <div className="min-h-full bg-slate-50/50 pb-20">
      
      {/* 1. Premium Header (Sticky) */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
                  <Droplet className="w-6 h-6 fill-current" />
               </div>
               <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Water Orders</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 hidden sm:block">Real-time delivery management</p>
               </div>
               
               {newOrderCount > 0 && (
                 <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200 animate-pulse hover:bg-blue-200">
                    {newOrderCount} New
                 </Badge>
               )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
               {/* Auto Refresh Toggle (Desktop) */}
               <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
                  <Switch 
                     id="auto-refresh" 
                     checked={autoRefresh}
                     onCheckedChange={setAutoRefresh}
                     className="data-[state=checked]:bg-green-500"
                  />
                  <Label htmlFor="auto-refresh" className="text-xs font-medium text-slate-600 cursor-pointer">Auto Refresh</Label>
               </div>

               <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-blue-600">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
               </Button>
               
               <Button 
                   variant="outline" 
                   size="icon" 
                   onClick={() => fetchOrders(true)}
                   className={isRefreshing ? "animate-spin text-blue-600 border-blue-200" : "text-slate-600"}
               >
                   <RefreshCw className="w-4 h-4" />
               </Button>

               <Button className="hidden sm:flex bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md shadow-blue-500/20 border-0 rounded-lg h-9">
                  <Plus className="w-4 h-4 mr-1.5" /> New Order
               </Button>
            </div>
         </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* 2. Mini Insights Panel */}
          <WaterOrderStats orders={orders} />

          {/* 3. Sticky Smart Filters */}
          <WaterOrderFilters 
              filters={filters}
              onFilterChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
              areas={uniqueAreas}
              sortConfig={sortConfig}
              onSortChange={(key) => setSortConfig(prev => ({ 
                 key, 
                 direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' 
              }))}
          />

          {/* 4. Orders Grid */}
          <div className="min-h-[400px]">
             {loading && orders.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-32 animate-in fade-in">
                     <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                     <p className="text-slate-500 font-medium">Syncing orders...</p>
                 </div>
             ) : processedOrders.length === 0 ? (
                 <div className="text-center py-24 bg-white/60 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 shadow-sm mx-auto max-w-lg">
                     <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <ShoppingBag className="h-10 w-10 text-slate-300" />
                     </div>
                     <h3 className="text-xl font-bold text-slate-900">No orders found</h3>
                     <p className="text-slate-500 mt-2">Adjust your filters or wait for new requests.</p>
                     <Button variant="link" onClick={() => setFilters({ status: 'all', area: 'all', search: '', date: undefined, priority: 'all' })} className="mt-2 text-blue-600">
                         Clear All Filters
                     </Button>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     {processedOrders.map(order => (
                         <WaterOrderCard 
                             key={order.id}
                             order={order}
                             onUpdateStatus={handleUpdateStatus}
                             onViewDetails={(o) => { setSelectedOrder(o); setIsDetailsOpen(true); }}
                             isUpdating={updatingOrderId === order.id}
                         />
                     ))}
                 </div>
             )}
          </div>
      </div>

      {/* Details Modal */}
      <WaterOrderDetails 
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          order={selectedOrder}
          onStatusUpdate={handleUpdateStatus}
          currentUserId={user?.id}
          isUpdating={!!updatingOrderId && updatingOrderId === selectedOrder?.id}
      />
      
      {/* Mobile Floating Action (Optional) */}
      <div className="fixed bottom-6 right-6 md:hidden z-50">
         <Button className="h-14 w-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/40 flex items-center justify-center" onClick={() => fetchOrders(true)}>
             <RefreshCw className={isRefreshing ? "animate-spin w-6 h-6" : "w-6 h-6"} />
         </Button>
      </div>

    </div>
  );
};

export default WaterOrdersDashboard;