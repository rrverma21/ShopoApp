import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice, formatDateToDDMMYYYY } from '@/lib/utils';
import { DollarSign, Users, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SellerPayouts = () => {
    const [unsettledOrders, setUnsettledOrders] = useState([]);
    const [settlementHistory, setSettlementHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const { toast } = useToast();
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: unsettledData, error: unsettledError } = await supabase.rpc('get_unsettled_orders_for_payout');
        if (unsettledError) {
            toast({ title: "Error fetching unsettled orders", description: unsettledError.message, variant: 'destructive' });
        } else {
            setUnsettledOrders(unsettledData || []);
        }

        const { data: historyData, error: historyError } = await supabase
            .from('seller_settlements')
            .select('*, seller:seller_id(business_name), admin:settled_by(contact_person)')
            .order('settlement_date', { ascending: false });

        if (historyError) {
            toast({ title: "Error fetching settlement history", description: historyError.message, variant: 'destructive' });
        } else {
            setSettlementHistory(historyData || []);
        }

        setLoading(false);
    }, [toast]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sellersWithUnsettledOrders = useMemo(() => {
        const sellers = {};
        if (!unsettledOrders) return [];
        unsettledOrders.forEach(order => {
            if (!sellers[order.seller_id]) {
                sellers[order.seller_id] = {
                    sellerId: order.seller_id,
                    sellerName: order.seller_name,
                    totalAmount: 0,
                    orderCount: 0,
                    orders: []
                };
            }
            sellers[order.seller_id].totalAmount += parseFloat(order.total_amount);
            sellers[order.seller_id].orderCount += 1;
            sellers[order.seller_id].orders.push(order);
        });
        return Object.values(sellers);
    }, [unsettledOrders]);

    const handleSettle = async (sellerId) => {
        const ordersToSettle = unsettledOrders.filter(o => 
            o.seller_id === sellerId &&
            new Date(o.order_created_at) >= new Date(startDate) &&
            new Date(o.order_created_at) <= new Date(endDate + 'T23:59:59.999Z')
        );

        if (ordersToSettle.length === 0) {
            toast({ title: "No orders to settle", description: "There are no unsettled paid orders for this seller in the selected date range.", variant: 'destructive' });
            return;
        }

        const orderIds = ordersToSettle.map(o => o.order_id);
        
        const { error } = await supabase.rpc('create_seller_settlement', {
            p_seller_id: sellerId,
            p_start_date: startDate,
            p_end_date: endDate,
            p_order_ids: orderIds
        });

        if (error) {
            toast({ title: "Settlement Failed", description: error.message, variant: 'destructive' });
        } else {
            toast({ title: "Settlement Successful!", description: `Payout for ${selectedSeller.sellerName} has been recorded.` });
            setSelectedSeller(null);
            fetchData();
        }
    };

    if (loading) {
        return <div className="p-8">Loading payout data...</div>;
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold gradient-text">Seller Payouts</h1>
            </div>

            <Tabs defaultValue="pending">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">
                        <DollarSign className="mr-2 h-4 w-4" /> Pending Settlements
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <FileText className="mr-2 h-4 w-4" /> Settlement History
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="pending">
                    <Card className="glass-effect mt-4">
                        <CardHeader>
                            <CardTitle>Unsettled Orders</CardTitle>
                            <CardDescription>Review paid orders that are pending settlement. Select a seller to view details and process payout.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {sellersWithUnsettledOrders.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sellersWithUnsettledOrders.map(seller => (
                                    <motion.div
                                        key={seller.sellerId}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Card 
                                            className="hover:shadow-lg transition-shadow cursor-pointer"
                                            onClick={() => setSelectedSeller(seller)}
                                        >
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-xl">
                                                    <Users className="h-5 w-5 text-primary" />
                                                    {seller.sellerName}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-2xl font-bold">{formatPrice(seller.totalAmount)}</p>
                                                <p className="text-sm text-slate-500">{seller.orderCount} unsettled orders</p>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                                </div>
                             ) : (
                                <p className="text-center py-10 text-slate-500">No pending settlements. Great job!</p>
                             )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="history">
                    <Card className="glass-effect mt-4">
                        <CardHeader>
                            <CardTitle>Completed Settlements</CardTitle>
                            <CardDescription>A log of all past seller payouts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {settlementHistory.length > 0 ? (
                                <div className="space-y-4">
                                    {settlementHistory.map(item => (
                                        <div key={item.id} className="p-4 border rounded-lg bg-slate-50/50">
                                            <div className="flex flex-wrap justify-between items-center gap-2">
                                                <p className="font-semibold">{item.seller.business_name}</p>
                                                <p className="text-lg font-bold">{formatPrice(item.total_amount)}</p>
                                            </div>
                                            <div className="text-sm text-slate-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                                <span>Settled on: {formatDateToDDMMYYYY(item.settlement_date)}</span>
                                                <span>Orders: {item.order_count}</span>
                                                <span>Period: {formatDateToDDMMYYYY(item.start_date)} - {formatDateToDDMMYYYY(item.end_date)}</span>
                                                <span>By: {item.admin?.contact_person || 'Admin'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-10 text-slate-500">No settlement history yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <AnimatePresence>
            {selectedSeller && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedSeller(null)}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b">
                            <h2 className="text-2xl font-bold">Settle Payout for {selectedSeller.sellerName}</h2>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
                                <div className="flex-1">
                                    <Label htmlFor="start-date">Start Date</Label>
                                    <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="end-date">End Date</Label>
                                    <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            
                            <SettlementDetails 
                                sellerId={selectedSeller.sellerId} 
                                orders={unsettledOrders}
                                startDate={startDate}
                                endDate={endDate}
                                onSettle={handleSettle}
                            />
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedSeller(null)}>Close</Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};


const SettlementDetails = ({ sellerId, orders, startDate, endDate, onSettle }) => {
    const filteredOrders = useMemo(() => {
        return orders.filter(o => 
            o.seller_id === sellerId &&
            new Date(o.order_created_at) >= new Date(startDate) &&
            new Date(o.order_created_at) <= new Date(endDate + 'T23:59:59.999Z')
        );
    }, [sellerId, orders, startDate, endDate]);

    const totalToSettle = useMemo(() => {
        return filteredOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    }, [filteredOrders]);

    return (
        <div>
            <div className="bg-slate-100 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-600">Total to Settle for Period</p>
                        <p className="text-2xl font-bold">{formatPrice(totalToSettle)}</p>
                        <p className="text-xs text-slate-500">{filteredOrders.length} orders</p>
                    </div>
                    <Button onClick={() => onSettle(sellerId)} disabled={filteredOrders.length === 0} size="lg">
                        <DollarSign className="mr-2 h-5 w-5" /> Settle Now
                    </Button>
                </div>
            </div>

            <h3 className="font-semibold mb-2">Orders in this settlement ({filteredOrders.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {filteredOrders.length > 0 ? filteredOrders.map(order => (
                    <div key={order.order_id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                        <div>
                            <p>Order #{order.order_id.substring(0,8)}</p>
                            <p className="text-xs text-slate-500">{formatDateToDDMMYYYY(order.order_created_at)}</p>
                        </div>
                        <p className="font-semibold">{formatPrice(order.total_amount)}</p>
                    </div>
                )) : (
                    <p className="text-sm text-center text-slate-500 py-4">No orders in selected date range.</p>
                )}
            </div>
        </div>
    );
};

export default SellerPayouts;