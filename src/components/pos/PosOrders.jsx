import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Package, User, Phone, MapPin, CheckCircle, XCircle, Search, Calendar, Filter, ArrowUpDown, ExternalLink, IndianRupee, Clock, ShoppingBag, Gift, MessageSquare, StickyNote } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { usePosData } from '@/contexts/PosDataContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PosOrders = () => {
    const { toast } = useToast();
    const { businessId, refreshData: refreshPosData, hasPermission } = usePosData();
    
    // Data State
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    // Default filter set to 'Pending' as requested
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [dateRange, setDateRange] = useState('30days'); // 'today', '7days', '30days', 'all'
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    // UI State
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState('');
    const [isConfirmingMove, setIsConfirmingMove] = useState(false);

    const fetchOrders = useCallback(async () => {
        if (!businessId) return;
        setIsLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('digital_shop_orders')
                .select(`
                    *,
                    customer:profiles!digital_shop_orders_customer_id_fkey(id, business_name, phone, street_address, city, pincode, contact_person)
                `)
                .eq('retailer_id', businessId)
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;
            setOrders(data || []);

        } catch (error) {
            console.error('Error fetching orders:', error);
            toast({
                title: 'Error Loading Orders',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [businessId, toast]);

    useEffect(() => {
        if (!hasPermission('orders')) return;

        fetchOrders();
        
        let channel;
        try {
            const channelName = `digital-orders-changes-${businessId}-${Date.now()}`;
            channel = supabase
                .channel(channelName)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_shop_orders', filter: `retailer_id=eq.${businessId}` }, () => {
                    fetchOrders();
                })
                .subscribe((status, err) => {
                    if (status === 'CHANNEL_ERROR') console.error('Orders channel error:', err);
                });
        } catch (error) {
            console.error('Subscription error:', error);
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [fetchOrders, businessId, hasPermission]);

    // Filtering Logic
    const filteredOrders = useMemo(() => {
        let filtered = [...orders];

        // 1. Search (Customer Name, Phone, Order ID)
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            filtered = filtered.filter(o => 
                (o.id && o.id.toLowerCase().includes(lowerQ)) ||
                (o.customer_phone && o.customer_phone.includes(searchQuery)) ||
                (o.customer?.business_name && o.customer.business_name.toLowerCase().includes(lowerQ)) ||
                (o.shipping_address?.name && o.shipping_address.name.toLowerCase().includes(lowerQ))
            );
        }

        // 2. Status Filter
        if (statusFilter !== 'All') {
            filtered = filtered.filter(o => o.status === statusFilter);
        }

        // 3. Date Range
        const now = new Date();
        if (dateRange !== 'all') {
            let start;
            if (dateRange === 'today') start = startOfDay(now);
            else if (dateRange === '7days') start = subDays(now, 7);
            else if (dateRange === '30days') start = subDays(now, 30);
            
            if (start) {
                filtered = filtered.filter(o => new Date(o.created_at) >= start);
            }
        }

        // 4. Sort
        filtered.sort((a, b) => {
            const valA = sortConfig.key === 'total_amount' ? Number(a.total_amount) : new Date(a.created_at).getTime();
            const valB = sortConfig.key === 'total_amount' ? Number(b.total_amount) : new Date(b.total_amount).getTime();
            
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });

        return filtered;
    }, [orders, searchQuery, statusFilter, dateRange, sortConfig]);

    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        setIsDetailsOpen(true);
    };

    const updateOrderStatus = async (newStatus) => {
        if (!selectedOrder) return;
        
        try {
            const { error } = await supabase
                .from('digital_shop_orders')
                .update({ status: newStatus })
                .eq('id', selectedOrder.id);

            if (error) throw error;

            toast({ title: 'Status Updated', description: `Order marked as ${newStatus}` });
            
            // Optimistic Update
            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o));
            setSelectedOrder(prev => ({ ...prev, status: newStatus }));
            
            if (newStatus === 'Cancelled' || newStatus === 'Rejected') {
                setIsDetailsOpen(false);
            }
        } catch (error) {
            console.error('Update status error', error);
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        }
    };

    const handleMoveToSales = async () => {
        if (!selectedOrder) return;
        setIsConfirmingMove(true);

        try {
             const { data: sale, error } = await supabase.rpc('move_digital_order_to_pos_sales', {
                p_digital_order_id: selectedOrder.id
            });

            if (error) throw error;

            toast({ title: 'Success', description: 'Order moved to POS Sales successfully.' });
            
            // Optimistic update
            const updatedOrder = { ...selectedOrder, is_moved_to_sales: true, status: 'Completed' };
            setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
            setSelectedOrder(updatedOrder);
            refreshPosData(); 
            
        } catch (error) {
            toast({ title: 'Error moving order', description: error.message, variant: 'destructive' });
        } finally {
            setIsConfirmingMove(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
            case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
            case 'Completed': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
            case 'Cancelled': 
            case 'Rejected': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            default: return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
        }
    };

    const getCustomerName = (order) => {
        if (order.shipping_address?.name) return order.shipping_address.name;
        if (order.customer?.contact_person) return order.customer.contact_person;
        if (order.customer?.business_name) return order.customer.business_name;
        return 'Walk-in Customer';
    };

    // Access Control Check
    if (!hasPermission('orders')) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
                <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p>You do not have permission to view orders.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4 p-2 sm:p-0">
            {/* Header / Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-indigo-600" />
                        Orders
                    </h1>
                    <p className="text-sm text-muted-foreground">{filteredOrders.length} orders found</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search customer, ID..." 
                            className="pl-9 h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] h-10">
                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Processing">Processing</SelectItem>
                            <SelectItem value="Ready">Ready</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[130px] h-10">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="7days">Last 7 Days</SelectItem>
                            <SelectItem value="30days">Last 30 Days</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Orders Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center flex-grow py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                    <p className="text-muted-foreground">Loading orders...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-grow py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <Package className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">No Orders Found</h3>
                    <p className="text-slate-500 max-w-sm text-center">
                        {statusFilter === 'Pending' 
                            ? "No pending orders! Try changing the status filter to see other orders." 
                            : "Try adjusting your search filters or date range."}
                    </p>
                </div>
            ) : (
                <ScrollArea className="flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                        <AnimatePresence>
                            {filteredOrders.map(order => (
                                <motion.div
                                    key={order.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => handleViewDetails(order)}
                                >
                                    <Card className="cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all duration-200 group border-slate-200 dark:border-slate-800">
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className={`font-medium ${getStatusColor(order.status)}`}>
                                                            {order.status}
                                                        </Badge>
                                                        {order.is_moved_to_sales && (
                                                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">POS</Badge>
                                                        )}
                                                    </div>
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                                        #{order.id.substring(0, 8).toUpperCase()}
                                                    </CardTitle>
                                                </div>
                                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {formatPrice(order.total_amount)}
                                                </span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-2">
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    <span className="truncate">
                                                        {getCustomerName(order)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    <span>{format(new Date(order.created_at), 'MMM dd, h:mm a')}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Package className="w-4 h-4 text-slate-400" />
                                                    <span>{Array.isArray(order.order_items) ? order.order_items.length : 0} Items</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-900/10 transition-colors">
                                            <span className="text-xs text-muted-foreground">View Details</span>
                                            <ExternalLink className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            )}

            {/* Order Details Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
                    {selectedOrder && (
                        <>
                            <div className="p-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                <DialogHeader>
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <DialogTitle className="text-xl flex items-center gap-2">
                                                Order #{selectedOrder.id.substring(0, 8).toUpperCase()}
                                                <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                                            </DialogTitle>
                                            <DialogDescription className="mt-1.5 flex items-center gap-3">
                                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {format(new Date(selectedOrder.created_at), 'PPP p')}</span>
                                            </DialogDescription>
                                        </div>
                                        {/* Status Update Dropdown */}
                                        <div className="flex flex-col items-end gap-2">
                                            <Select 
                                                value={selectedOrder.status} 
                                                onValueChange={(val) => updateOrderStatus(val)}
                                                disabled={selectedOrder.is_moved_to_sales || selectedOrder.status === 'Cancelled' || selectedOrder.status === 'Rejected'}
                                            >
                                                <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-slate-800">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Pending">Pending</SelectItem>
                                                    <SelectItem value="Processing">Processing</SelectItem>
                                                    <SelectItem value="Ready">Ready</SelectItem>
                                                    <SelectItem value="Completed">Completed</SelectItem>
                                                    <SelectItem value="Cancelled" className="text-red-500">Cancel Order</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </DialogHeader>
                            </div>

                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-6">
                                    {/* Customer Info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Customer</h4>
                                            <div className="flex items-center gap-2 font-medium">
                                                <User className="w-4 h-4 text-indigo-500" />
                                                {getCustomerName(selectedOrder)}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                {selectedOrder.customer_phone || 'No Phone'}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Delivery Details</h4>
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                                <span className="break-words">
                                                    {selectedOrder.shipping_address ? (
                                                        <>
                                                            {selectedOrder.shipping_address.street || selectedOrder.shipping_address.address},<br/>
                                                            {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.pincode}
                                                        </>
                                                    ) : 'Store Pickup / N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gift Wrapping & Special Instructions */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Special Instructions */}
                                        <div className={`p-4 rounded-xl border ${selectedOrder.shipping_address?.notes ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <MessageSquare className={`w-4 h-4 ${selectedOrder.shipping_address?.notes ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                                                <h4 className={`text-sm font-semibold uppercase tracking-wider ${selectedOrder.shipping_address?.notes ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>
                                                    Special Instructions
                                                </h4>
                                            </div>
                                            <p className={`text-sm ${selectedOrder.shipping_address?.notes ? 'text-amber-900 dark:text-amber-100' : 'text-slate-500 italic'}`}>
                                                {selectedOrder.shipping_address?.notes || "No special instructions provided"}
                                            </p>
                                        </div>

                                        {/* Gift Wrapping */}
                                        <div className={`p-4 rounded-xl border ${selectedOrder.gift_wrapping ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Gift className={`w-4 h-4 ${selectedOrder.gift_wrapping ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                                                <h4 className={`text-sm font-semibold uppercase tracking-wider ${selectedOrder.gift_wrapping ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>
                                                    Gift Wrapping
                                                </h4>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-sm font-medium ${selectedOrder.gift_wrapping ? 'text-blue-900 dark:text-blue-100' : 'text-slate-500'}`}>
                                                    {selectedOrder.gift_wrapping ? "Included" : "Not Selected"}
                                                </span>
                                                {selectedOrder.gift_wrapping && (
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300">
                                                        +{formatPrice(selectedOrder.gift_wrapping_cost || 0)}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Order Items</h4>
                                        <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-medium">Item</th>
                                                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                                                        <th className="px-4 py-2 text-right font-medium">Price</th>
                                                        <th className="px-4 py-2 text-right font-medium">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {Array.isArray(selectedOrder.order_items) && selectedOrder.order_items.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-3">
                                                                <div className="font-medium text-slate-900 dark:text-slate-200">{item.name || item.product_name}</div>
                                                                {item.variant_name && <div className="text-xs text-slate-500">{item.variant_name}</div>}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                                                            <td className="px-4 py-3 text-right">{formatPrice(item.unit_price || item.price)}</td>
                                                            <td className="px-4 py-3 text-right font-medium">{formatPrice((item.unit_price || item.price) * item.quantity)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Totals */}
                                    <div className="flex justify-end">
                                        <div className="w-full sm:w-1/2 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Payment Method</span>
                                                <span className="font-medium">{selectedOrder.payment_method}</span>
                                            </div>
                                            <div className="border-t border-dashed border-slate-200 dark:border-slate-700 my-2"></div>
                                            <div className="flex justify-between items-center text-lg font-bold">
                                                <span>Total Amount</span>
                                                <span className="text-indigo-600">{formatPrice(selectedOrder.total_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-end">
                                {!selectedOrder.is_moved_to_sales && selectedOrder.status !== 'Cancelled' && selectedOrder.status !== 'Rejected' && (
                                    <>
                                        <Button 
                                            variant="outline"
                                            className="border-red-200 hover:bg-red-50 text-red-600"
                                            onClick={() => updateOrderStatus('Rejected')}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" /> Reject
                                        </Button>
                                        <Button 
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                            onClick={handleMoveToSales}
                                            disabled={isConfirmingMove}
                                        >
                                            {isConfirmingMove ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                            Move to POS & Finalize
                                        </Button>
                                    </>
                                )}
                                {selectedOrder.is_moved_to_sales && (
                                    <Button disabled variant="secondary" className="cursor-not-allowed opacity-80">
                                        <CheckCircle className="w-4 h-4 mr-2" /> Order Completed & Moved
                                    </Button>
                                )}
                                <Button variant="ghost" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PosOrders;