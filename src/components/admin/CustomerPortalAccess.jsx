import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Eye, 
  Users, 
  Activity, 
  Search, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Smartphone, 
  Mail, 
  MapPin, 
  ShoppingBag,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  MoreHorizontal
} from 'lucide-react';
import { format, formatDistanceToNow, subHours, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from 'framer-motion';

const CustomerPortalAccess = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setFilterStatus] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'last_accessed_at', direction: 'desc' });
  const [recentSales, setRecentSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch customers with sales count to calculate "frequency"
      const { data, error } = await supabase
        .from('point_of_sale_customers')
        .select('*, point_of_sale_sales(count)')
        .order('last_accessed_at', { ascending: false });

      if (error) throw error;

      // Transform data to include sales count directly
      const transformedData = data.map(c => ({
        ...c,
        total_purchases_count: c.point_of_sale_sales ? c.point_of_sale_sales[0]?.count : 0
      }));

      setCustomers(transformedData || []);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching portal access data:', error);
      toast({
        title: "Error fetching data",
        description: "Could not load customer access records. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000); // 30 seconds refresh

    return () => clearInterval(interval);
  }, []);

  // Fetch recent sales for the detailed view timeline
  useEffect(() => {
    const fetchCustomerHistory = async () => {
      if (!selectedCustomer) return;
      setSalesLoading(true);
      try {
        const { data, error } = await supabase
          .from('point_of_sale_sales')
          .select('id, created_at, total_amount, payment_method')
          .eq('customer_id', selectedCustomer.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        setRecentSales(data || []);
      } catch (err) {
        console.error("Error fetching sales history", err);
      } finally {
        setSalesLoading(false);
      }
    };

    fetchCustomerHistory();
  }, [selectedCustomer]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // 1. Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.name || '').toLowerCase().includes(lowerTerm) ||
        (c.email || '').toLowerCase().includes(lowerTerm) ||
        (c.phone || '').includes(lowerTerm)
      );
    }

    // 2. Filter
    if (statusFilter !== 'all') {
      const now = new Date();
      result = result.filter(c => {
        if (!c.last_accessed_at) return statusFilter === 'inactive';
        const lastAccess = new Date(c.last_accessed_at);
        const isActive = isAfter(lastAccess, subHours(now, 24));
        return statusFilter === 'active' ? isActive : !isActive;
      });
    }

    // 3. Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Handle special sort keys
        if (sortConfig.key === 'frequency') {
          valA = a.total_purchases_count || 0;
          valB = b.total_purchases_count || 0;
        }

        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [customers, searchTerm, statusFilter, sortConfig]);

  // Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.last_accessed_at && isAfter(new Date(c.last_accessed_at), subHours(new Date(), 24))).length;
    const inactive = total - active;
    const totalAccesses = customers.reduce((sum, c) => sum + (c.total_purchases_count || 0), 0); // Using purchases as proxy for engagement count
    return { total, active, inactive, totalAccesses };
  }, [customers]);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronDown className="ml-1 h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-50" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-1 h-3 w-3 text-blue-500" /> : <ChevronDown className="ml-1 h-3 w-3 text-blue-500" />;
  };

  const getStatusBadge = (timestamp) => {
    if (!timestamp) return <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-200">Never</Badge>;
    const isRecent = isAfter(new Date(timestamp), subHours(new Date(), 24));
    return isRecent 
      ? <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Active (24h)</Badge>
      : <Badge variant="outline" className="text-slate-500 border-slate-200">Inactive</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Portal Access</h1>
          <p className="text-slate-500 mt-1">Monitor customer engagement and portal activity in real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline-block">
            Last updated: {format(lastRefreshed, 'h:mm:ss a')}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchData(true)} 
            disabled={refreshing}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics.total}</div>
            <p className="text-xs text-slate-500 mt-1">Registered profiles</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Active (24h)</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics.active}</div>
            <p className="text-xs text-slate-500 mt-1">Online recently</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Inactive</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics.inactive}</div>
            <p className="text-xs text-slate-500 mt-1">No recent activity</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Engagement</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalAccesses}</div>
            <p className="text-xs text-slate-500 mt-1">Total interactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name, email, or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active (Last 24h)</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || statusFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                title="Clear filters"
              >
                <X className="h-4 w-4 text-slate-500" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-slate-200 shadow-md overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:text-blue-600 transition-colors group"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">Customer <SortIcon column="name" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-blue-600 transition-colors group hidden md:table-cell"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center">Contact Info <SortIcon column="email" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-blue-600 transition-colors group"
                  onClick={() => handleSort('last_accessed_at')}
                >
                  <div className="flex items-center">Last Viewed <SortIcon column="last_accessed_at" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-blue-600 transition-colors group text-right"
                  onClick={() => handleSort('frequency')}
                >
                  <div className="flex items-center justify-end">Visits <SortIcon column="frequency" /></div>
                </TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px] ml-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-8 w-8 text-slate-300" />
                      <p>No customers found matching your criteria.</p>
                      {(searchTerm || statusFilter !== 'all') && (
                        <Button variant="link" onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}>
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id} 
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900">{customer.name}</div>
                      <div className="text-xs text-slate-500 md:hidden">{customer.phone}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700">{customer.email || '-'}</span>
                        <span className="text-xs text-slate-500">{customer.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">
                          {customer.last_accessed_at 
                            ? formatDistanceToNow(new Date(customer.last_accessed_at), { addSuffix: true }) 
                            : 'Never'}
                        </span>
                        {customer.last_accessed_at && (
                          <span className="text-xs text-slate-400">
                            {format(new Date(customer.last_accessed_at), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {customer.total_purchases_count || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(customer.last_accessed_at)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail Modal/Drawer */}
      <Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent className="w-[90%] sm:w-[540px] overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader className="mb-6 border-b pb-4">
                <SheetTitle className="text-2xl">{selectedCustomer.name}</SheetTitle>
                <SheetDescription>Customer Profile & Activity Log</SheetDescription>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getStatusBadge(selectedCustomer.last_accessed_at)}
                  <Badge variant="outline" className="bg-slate-50">
                    ID: {selectedCustomer.id.slice(0, 8)}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="space-y-8">
                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <Smartphone className="h-4 w-4 text-slate-400" />
                      {selectedCustomer.phone || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {selectedCustomer.email || 'N/A'}
                    </div>
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {selectedCustomer.address || 'No address provided'}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Total Purchases</p>
                      <p className="text-xl font-bold text-slate-900">{selectedCustomer.total_purchases_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Loyalty Points</p>
                      <p className="text-xl font-bold text-yellow-600 flex items-center gap-1">
                        {selectedCustomer.loyalty_points || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Last Purchase</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedCustomer.last_purchase_date 
                          ? format(new Date(selectedCustomer.last_purchase_date), 'MMM d, yyyy') 
                          : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Total Saved</p>
                      <p className="text-sm font-semibold text-green-600">
                        ₹{selectedCustomer.total_discount || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Timeline */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Recent Activity
                  </h3>
                  
                  <div className="relative border-l border-slate-200 ml-3 space-y-6 pb-2">
                    {/* Last Viewed Node */}
                    {selectedCustomer.last_accessed_at && (
                      <div className="mb-6 ml-6 relative">
                        <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                          <Eye className="h-2.5 w-2.5 text-blue-600" />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">Portal Accessed</span>
                          <span className="text-xs text-slate-500">
                            {format(new Date(selectedCustomer.last_accessed_at), 'PPpp')}
                          </span>
                          <span className="text-xs text-slate-400 mt-0.5">
                            {formatDistanceToNow(new Date(selectedCustomer.last_accessed_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Sales History Nodes */}
                    {salesLoading ? (
                      <div className="ml-6 space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : recentSales.length > 0 ? (
                      recentSales.map((sale) => (
                        <div key={sale.id} className="mb-6 ml-6 relative">
                          <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-100 ring-4 ring-white">
                            <ShoppingBag className="h-2.5 w-2.5 text-green-600" />
                          </span>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">Purchase Made</span>
                            <span className="text-xs text-slate-500">
                              Amount: ₹{sale.total_amount} • {sale.payment_method}
                            </span>
                            <span className="text-xs text-slate-400 mt-0.5">
                              {format(new Date(sale.created_at), 'PP p')}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="ml-6 text-sm text-slate-500 italic">No purchase history available.</div>
                    )}
                  </div>
                </div>
              </div>
              <SheetFooter className="mt-8">
                <Button className="w-full sm:w-auto" onClick={() => setSelectedCustomer(null)}>Close Details</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CustomerPortalAccess;