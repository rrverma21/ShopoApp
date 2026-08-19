import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, CheckCircle, ShoppingBag, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const MyPosOrdersPage = () => {
    const { user } = useAuth();
    
    const getStatusInfo = (status) => {
        switch (status) {
            case 'Pending': return { icon: <Package className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
            case 'Preparing': return { icon: <ShoppingBag className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' };
            case 'Ready for Pickup': return { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' };
            case 'Out for Delivery': return { icon: <Truck className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' };
            case 'Completed': return { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' };
            case 'Cancelled': return { icon: <XCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
            default: return { icon: <Package className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
        }
    };
    
    const fetchOrders = async (customerId) => {
        if (!customerId) return [];

        const { data, error } = await supabase
            .from('digital_shop_orders')
            .select(`
                id,
                created_at,
                total_amount,
                status,
                order_items,
                retailer:profiles!digital_shop_orders_retailer_id_fkey(id, business_name, avatar_url)
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching digital shop orders:', error);
            toast({
                title: 'Error',
                description: `Could not fetch your shop orders: ${error.message}`,
                variant: 'destructive',
            });
            throw error;
        }
        
        // Map data to a common format
        return data.map(order => ({
            id: order.id,
            created_at: order.created_at,
            total_amount: order.total_amount,
            status: order.status,
            order_type: 'Online',
            retailer: order.retailer,
            sale_items: order.order_items?.map(item => ({
                quantity: item.quantity,
                total_price: item.unit_price,
                product: {
                    name: item.name,
                    image_url: item.image_url
                }
            })) || []
        }));
    };
    
    const { data: orders = [], isLoading: loading } = useQuery({
        queryKey: ['myShopOrders', user?.id],
        queryFn: () => fetchOrders(user?.id),
        enabled: !!user?.id,
    });


    return (
        <>
            <Helmet>
                <title>My Shop Orders | B2B Nexus</title>
                <meta name="description" content="View your orders from local shops on B2B Nexus." />
            </Helmet>
            <div className="container mx-auto px-4 py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <h1 className="text-3xl font-bold mb-2 gradient-text">My Local Shop Orders</h1>
                    <p className="text-muted-foreground mb-8">Track your purchases from nearby businesses.</p>
                </motion.div>
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader><div className="h-6 w-3/4 bg-muted rounded"></div></CardHeader>
                                <CardContent><div className="h-20 w-full bg-muted rounded mt-2"></div></CardContent>
                            </Card>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20 rounded-lg bg-background"
                    >
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h2 className="text-xl font-semibold">No Orders Yet</h2>
                        <p className="text-muted-foreground">You haven't placed any orders from local shops.</p>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => {
                             const statusInfo = getStatusInfo(order.status);
                             return (
                                <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                                        <CardHeader className="flex flex-row items-center justify-between bg-muted/50">
                                            <div>
                                                <CardTitle className="text-base md:text-lg">Order #{order.id.substring(0, 8)}</CardTitle>
                                                <CardDescription>
                                                    {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {order.order_type && <Badge variant="outline">{order.order_type}</Badge>}
                                                <Badge className={`${statusInfo.color} flex items-center gap-1.5`}>
                                                    {statusInfo.icon}
                                                    <span>{order.status}</span>
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 md:p-6">
                                            <div className="mb-4">
                                                <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Items</h4>
                                                <div className="space-y-3">
                                                    {order.sale_items.map((item, index) => (
                                                        <div key={index} className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-3">
                                                                <img src={item.product?.image_url || 'https://placehold.co/400x400/E2E8F0/A0AEC0?text=Image'} alt={item.product?.name} className="w-12 h-12 object-cover rounded-md"/>
                                                                <div>
                                                                    <span className="font-medium">{item.product?.name || 'Product'}</span>
                                                                    <div className="text-xs text-muted-foreground">{item.quantity} x {formatPrice(item.total_price)}</div>
                                                                </div>
                                                            </div>
                                                            <span className="font-semibold text-foreground">{formatPrice(item.total_price * item.quantity)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="border-t pt-4 flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <img src={order.retailer?.avatar_url || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=Logo'} alt={order.retailer?.business_name} className="w-6 h-6 rounded-full"/>
                                                    <span className="font-semibold">{order.retailer?.business_name || 'Local Shop'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Total:</span>{' '}
                                                    <span className="font-bold text-lg text-foreground">{formatPrice(order.total_amount)}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                             )
                        })}
                    </div>
                )}
            </div>
        </>
    );
};

export default MyPosOrdersPage;