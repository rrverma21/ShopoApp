import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient'; // Fixed import to use custom client
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw, AlertCircle, ShoppingBag, Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';

import WaterOrderCard from '@/components/pos/WaterOrderCard';
import WaterOrderFilters from '@/components/pos/WaterOrderFilters';
import WaterOrderSorting from '@/components/pos/WaterOrderSorting';
import WaterOrderDetails from '@/components/pos/WaterOrderDetails';
import { useDebounce } from '@/hooks/useDebounce';

const WaterOrdersPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null); // Track which order is updating
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [filters, setFilters] = useState({
    status: 'all',
    area: 'all',
    search: ''
  });
  
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });

  const debouncedSearch = useDebounce(filters.search, 300);
  const abortControllerRef = useRef(null);
  const isMounted = useRef(false);

  // Extract unique areas from orders for filter dropdown
  const uniqueAreas = useMemo(() => {
    const areas = new Set();
    orders.forEach(order => {
        if (order.water_delivery_areas?.name) {
            areas.add(order.water_delivery_areas.name);
        }
    });
    return Array.from(areas).sort();
  }, [orders]);

  const fetchOrders = async (showLoading = true) => {
    if (!user) return;
    
    // Abort previous request if active
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) setLoading(true);
      setError(null);
      setIsRefreshing(true);

      // 1. Get Settings for Areas
      // We need to know which areas this seller serves to show them relevant pending orders
      const { data: settings, error: settingsError } = await supabase
        .from('pos_retailer_settings')
        .select('water_delivery_areas')
        .eq('user_id', user.id)
        .single();
    
      if (settingsError && settingsError.code !== 'PGRST116') {
         console.warn("Could not fetch retailer settings:", settingsError);
      }

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

      // 3. Fetch Pending Orders in My Areas (If any areas)
      // These are "Marketplace" orders that are available to pick up
      let areaOrdersPromise = Promise.resolve({ data: [] });
      
      if (myAreas.length > 0) {
        areaOrdersPromise = supabase
            .from('water_orders')
            .select(selectStr)
            .in('delivery_area_id', myAreas)
            .eq('status', 'pending')
            .is('seller_id', null) // Only fetch unassigned ones to avoid duplicates/conflicts
            .order('created_at', { ascending: false });
      }

      const [myOrdersRes, areaOrdersRes] = await Promise.all([myOrdersPromise, areaOrdersPromise]);

      if (myOrdersRes.error) throw myOrdersRes.error;
      if (areaOrdersRes.error) throw areaOrdersRes.error;

      // Merge results
      const allOrders = [...(myOrdersRes.data || []), ...(areaOrdersRes.data || [])];
      
      // Deduplicate by ID (Safety check)
      const uniqueOrders = Array.from(new Map(allOrders.map(item => [item.id, item])).values());
      
      // Sort desc by created_at (default)
      uniqueOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (isMounted.current) {
        setOrders(uniqueOrders);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error("Error fetching water orders:", error);
      if (isMounted.current) {
        setError("Failed to load orders. Please check your connection.");
        // Only show toast on manual refresh to avoid spamming on mount
        if (!showLoading) {
            toast({
                title: "Network Error",
                description: "Could not fetch latest orders.",
                variant: "destructive"
            });
        }
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
      
      // Real-time subscription to keep list updated
      const subscription = supabase
        .channel('water_orders_page_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'water_orders'
          },
          (payload) => {
              // Refresh on any change to water orders (simple but effective)
              fetchOrders(false);
          }
        )
        .subscribe();

      return () => {
        isMounted.current = false;
        supabase.removeChannel(subscription);
        if (abortControllerRef.current) abortControllerRef.current.abort();
      };
    }
  }, [user]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (key) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Client-side filtering and sorting
  const processedOrders = useMemo(() => {
    let result = [...orders];

    // Status Filter
    if (filters.status !== 'all') {
        result = result.filter(o => {
            const status = o.status ? o.status.toLowerCase() : 'pending';
            if (filters.status === 'confirmed' && ['accepted', 'confirmed'].includes(status)) return true;
            return status === filters.status;
        });
    }

    // Area Filter
    if (filters.area !== 'all') {
        result = result.filter(o => o.water_delivery_areas?.name === filters.area);
    }

    // Search
    if (debouncedSearch) {
        const lowerSearch = debouncedSearch.toLowerCase();
        result = result.filter(o => 
            o.id.toLowerCase().includes(lowerSearch) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(lowerSearch)) ||
            (o.customer_phone && o.customer_phone.includes(lowerSearch))
        );
    }

    // Sorting
    result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Handle specific sort keys
        if (sortConfig.key === 'is_urgent') {
             valA = a.is_urgent ? 1 : 0;
             valB = b.is_urgent ? 1 : 0;
        } else if (sortConfig.key === 'status') {
             valA = a.status || '';
             valB = b.status || '';
        } else if (sortConfig.key === 'created_at') {
             valA = new Date(a.created_at || 0).getTime();
             valB = new Date(b.created_at || 0).getTime();
        }

        // Comparison
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return result;
  }, [orders, filters.status, filters.area, debouncedSearch, sortConfig]);


  const handleUpdateStatus = async (orderId, newStatus) => {
      if (updatingOrderId) return; // Prevent concurrent updates
      
      setUpdatingOrderId(orderId);
      
      try {
          const updates = { 
             status: newStatus, 
             updated_at: new Date().toISOString() 
          };
          
          // If confirming (accepting), claim the order
          if (newStatus === 'confirmed') {
              updates.seller_id = user.id;
          }

          // Optimistic update
          const previousOrders = [...orders];
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
          if (selectedOrder && selectedOrder.id === orderId) {
              setSelectedOrder(prev => ({ ...prev, ...updates }));
          }

          const { error } = await supabase
             .from('water_orders')
             .update(updates)
             .eq('id', orderId);

          if (error) {
              // Revert optimistic update on error
              setOrders(previousOrders);
              if (selectedOrder && selectedOrder.id === orderId) {
                  const prevOrder = previousOrders.find(o => o.id === orderId);
                  if (prevOrder) setSelectedOrder(prevOrder);
              }
              throw error;
          }

          toast({
              title: "Success",
              description: `Order marked as ${newStatus}.`,
              variant: "default",
              className: "bg-green-50 border-green-200 text-green-800"
          });

      } catch (err) {
          console.error("Update status error:", err);
          toast({
              title: "Update Failed",
              description: err.message || "Could not update order status.",
              variant: "destructive"
          });
          // Refresh data to ensure consistency
          fetchOrders(false);
      } finally {
          setUpdatingOrderId(null);
      }
  };

  const handleCancelOrder = async (orderId, reason = '') => {
    // Custom logic for cancellation if needed (e.g. logging reason)
    handleUpdateStatus(orderId, 'cancelled');
  };

  const handleViewDetails = (order) => {
      setSelectedOrder(order);
      setIsDetailsOpen(true);
  };

  return (
    <div className="pb-20 min-h-full bg-slate-50/50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Droplet className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    Water Orders
                </h1>
                <p className="text-slate-500 mt-1 text-sm sm:text-base">Manage delivery requests and track status.</p>
            </div>
            <Button 
                variant="outline" 
                onClick={() => fetchOrders(true)} 
                disabled={isRefreshing}
                className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
            >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh List
            </Button>
        </div>

        {/* Filters & Sorting */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center justify-between sticky top-16 z-10 lg:static">
            <WaterOrderFilters 
                filters={filters}
                onFilterChange={handleFilterChange}
                areas={uniqueAreas}
            />
            <div className="hidden lg:block w-px h-8 bg-slate-100 mx-2"></div>
            <WaterOrderSorting 
                sortConfig={sortConfig}
                onSortChange={handleSortChange}
            />
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                    <p className="text-slate-500 font-medium">Loading orders...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-red-100 shadow-sm">
                    <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800">Something went wrong</h3>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <Button onClick={() => fetchOrders(true)} variant="outline">Try Again</Button>
                </div>
            ) : processedOrders.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-xl border border-dashed border-slate-200 shadow-sm">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                         <ShoppingBag className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No orders found</h3>
                    <p className="text-slate-500 mt-1 max-w-md mx-auto">
                        {filters.search || filters.status !== 'all' || filters.area !== 'all' 
                            ? "Try adjusting your filters or search terms."
                            : "New orders will appear here when customers place them."}
                    </p>
                    {(filters.status !== 'all' || filters.area !== 'all' || filters.search) && (
                        <Button variant="link" onClick={() => setFilters({ status: 'all', area: 'all', search: '' })} className="mt-2 text-blue-600">
                            Clear Filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {processedOrders.map(order => (
                        <WaterOrderCard 
                            key={order.id}
                            order={order}
                            onMarkDelivered={handleUpdateStatus}
                            onCancelOrder={handleCancelOrder}
                            onViewDetails={handleViewDetails}
                            isUpdating={updatingOrderId === order.id}
                        />
                    ))}
                </div>
            )}
        </div>
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

export default WaterOrdersPage;