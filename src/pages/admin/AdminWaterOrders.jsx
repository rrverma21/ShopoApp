import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Droplet, TrendingUp, ShoppingCart, CheckCircle, Clock, ArrowLeft, Eye, Store } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

import WaterOrderFilters from '@/components/admin/water/WaterOrderFilters';
import SellerWiseSummary from '@/components/admin/water/SellerWiseSummary';
import WaterOrderDetailsModal from '@/components/admin/water/WaterOrderDetailsModal';
import WaterOrdersExport from '@/components/admin/water/WaterOrdersExport';

const AdminWaterOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    seller: 'all'
  });

  // Calculate top-level stats
  const stats = useMemo(() => {
    return {
        total: orders.length,
        pending: orders.filter(o => (o.status || '').toLowerCase() === 'pending').length,
        accepted: orders.filter(o => ['accepted', 'confirmed'].includes((o.status || '').toLowerCase())).length,
        completed: orders.filter(o => ['delivered', 'completed'].includes((o.status || '').toLowerCase())).length,
        revenue: orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0)
    };
  }, [orders]);

  // Extract unique sellers for filter dropdown
  const uniqueSellers = useMemo(() => {
    const sellers = new Map();
    orders.forEach(o => {
        if (o.seller_id && o.seller) {
            sellers.set(o.seller_id, { id: o.seller_id, name: o.seller.business_name || 'Unknown' });
        }
    });
    return Array.from(sellers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
        // Search Filter
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = !filters.search || 
            order.id.toLowerCase().includes(searchLower) ||
            (order.customer_name || '').toLowerCase().includes(searchLower) ||
            (order.customer_phone || '').includes(searchLower) ||
            (order.seller?.business_name || '').toLowerCase().includes(searchLower);

        // Status Filter
        const statusLower = (order.status || 'pending').toLowerCase();
        let matchesStatus = true;
        if (filters.status !== 'all') {
            if (filters.status === 'confirmed') matchesStatus = ['accepted', 'confirmed'].includes(statusLower);
            else if (filters.status === 'delivered') matchesStatus = ['delivered', 'completed'].includes(statusLower);
            else matchesStatus = statusLower === filters.status;
        }

        // Seller Filter
        const matchesSeller = filters.seller === 'all' || order.seller_id === filters.seller;

        return matchesSearch && matchesStatus && matchesSeller;
    });
  }, [orders, filters]);
  
  const sellerSummaryData = useMemo(() => {
    const map = {};
    orders.forEach(order => {
        const sid = order.seller_id;
        if(!map[sid]) {
             map[sid] = {
                 sellerName: order.seller?.business_name || 'Unknown',
                 totalOrders: 0,
                 pending: 0,
                 confirmed: 0,
                 delivered: 0,
                 cancelled: 0,
                 revenue: 0,
                 completionRate: 0
             }
        }
        map[sid].totalOrders++;
        map[sid].revenue += Number(order.total_price || 0);
        const st = (order.status || '').toLowerCase();
        if(st === 'pending') map[sid].pending++;
        else if(['confirmed', 'accepted'].includes(st)) map[sid].confirmed++;
        else if(['delivered', 'completed'].includes(st)) map[sid].delivered++;
        else if(st === 'cancelled') map[sid].cancelled++;
    });
    
    return Object.values(map).map(s => ({
        ...s,
        completionRate: s.totalOrders ? Math.round((s.delivered / s.totalOrders) * 100) : 0
    }));
  }, [orders]);


  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setIsRefreshing(true);

      const { data, error } = await supabase
        .from('water_orders')
        .select(`
            *,
            seller:seller_id ( id, business_name, contact_person, phone ),
            water_delivery_areas ( name ),
            water_products ( name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      
    } catch (error) {
      console.error("Error fetching admin water orders:", error);
      toast({
          title: "Error fetching data",
          description: error.message,
          variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);

    const channel = supabase
      .channel('admin_water_orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'water_orders' },
        (payload) => {
           fetchOrders(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleViewDetails = (order) => {
      setSelectedOrder(order);
      setIsDetailsOpen(true);
  };

  const getStatusBadgeVariant = (status) => {
    const s = (status || '').toLowerCase();
    if (['pending'].includes(s)) return 'warning';
    if (['accepted', 'confirmed', 'processing'].includes(s)) return 'info';
    if (['delivered', 'completed'].includes(s)) return 'success';
    if (['cancelled', 'rejected'].includes(s)) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex justify-start">
        <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 transition-all duration-200 flex items-center gap-2 font-medium text-sm md:text-base group"
        >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:-translate-x-1" />
            Admin Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Droplet className="w-8 h-8 text-blue-600" />
              Water Order Management
           </h1>
           <p className="text-slate-500 mt-1">Real-time overview of all water delivery operations.</p>
        </div>
        <div className="flex items-center gap-3">
           <WaterOrdersExport orders={filteredOrders} sellerSummary={sellerSummaryData} />
           <Button 
                variant="outline" 
                onClick={() => fetchOrders(true)} 
                disabled={isRefreshing}
                className="gap-2"
           >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
           </Button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Total Orders</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                  <Clock className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Pending</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.pending}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                  <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Accepted</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.accepted}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                  <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Completed</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.completed}</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                  <h3 className="text-2xl font-bold text-slate-900">₹{stats.revenue.toLocaleString()}</h3>
              </div>
          </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-lg">
              <TabsTrigger value="list" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">All Orders List</TabsTrigger>
              <TabsTrigger value="summary" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Seller Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
              <WaterOrderFilters 
                  filters={filters} 
                  setFilters={setFilters} 
                  uniqueSellers={uniqueSellers}
              />
              
              {loading ? (
                  <div className="flex justify-center py-20 bg-white rounded-xl border border-slate-200">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Order Details</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                            No orders found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-slate-50">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900 truncate w-32" title={order.id}>#{order.id.substring(0, 8)}...</span>
                                <span className="text-xs text-slate-500">{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900">{order.customer_name}</span>
                                <span className="text-xs text-slate-500">{order.customer_phone}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Store className="w-3 h-3 text-slate-400" />
                                <span className="text-sm text-slate-700 font-medium">
                                  {order.seller?.business_name || 'Unknown Seller'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-700">{order.water_products?.name || 'Water Can'}</span>
                                <span className="text-xs text-slate-500">Qty: {order.quantity}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-slate-900">₹{order.total_price}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(order.status)} className="capitalize">
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleViewDetails(order)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
          </TabsContent>

          <TabsContent value="summary">
               <SellerWiseSummary orders={orders} />
          </TabsContent>
      </Tabs>

      <WaterOrderDetailsModal 
          order={selectedOrder}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
};

export default AdminWaterOrders;