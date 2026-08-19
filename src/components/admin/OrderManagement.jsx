import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
// ... imports
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, FileDown, Eye, Check, X } from 'lucide-react';
import { generateInvoice } from '@/lib/invoiceGenerator';
import PlaceOrderForm from '@/components/admin/PlaceOrderForm';
import { formatDateToDDMMYYYY, getPaymentStatusColor } from '@/lib/utils';

// ... (component logic same as before, changes only in root className)

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPlaceOrderOpen, setIsPlaceOrderOpen] = useState(false);
    const { user } = useAuth();
    
    const userRole = user?.profile?.role;
    const isAdmin = userRole === 'admin';
    const isSalesman = userRole === 'salesman';
    const isSeller = userRole === 'seller';

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('orders')
            .select(`
                *,
                client:profiles!orders_user_id_fkey(business_name, street_address, city, pincode),
                creator:profiles!orders_created_by_fkey(contact_person),
                seller:profiles!orders_seller_id_fkey(business_name, qr_code_url),
                order_items(*, products(name)),
                order_payment_receipts!order_payment_receipts_order_id_fkey(*)
            `)
            .order('created_at', { ascending: false });

        if (isSalesman) {
            query = query.eq('created_by', user.id);
        } else if (isSeller) {
            query = query.eq('seller_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching orders:', error);
            toast({
                title: "Error fetching orders",
                description: error.message,
                variant: 'destructive'
            });
        } else {
            setOrders(data);
        }
        setLoading(false);
    }, [isSalesman, isSeller, user?.id]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    
    const handleOrderPlaced = () => {
        setIsPlaceOrderOpen(false);
        fetchOrders();
    };

    const handleStatusChange = async (orderId, newStatus) => {
        const currentOrder = orders.find(o => o.id === orderId);
        
        if (newStatus === 'Shipped' && currentOrder.status !== 'Shipped') {
            const { error: shipError } = await supabase.rpc('ship_order_and_update_stock', { p_order_id: orderId });
            if (shipError) {
                toast({
                    title: `Error updating stock`,
                    description: shipError.message,
                    variant: 'destructive',
                });
                return; 
            } else {
                 toast({
                    title: `Order status updated and stock deducted!`,
                });
            }
        } else {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) {
                toast({
                    title: `Failed to update status`,
                    description: error.message,
                    variant: 'destructive',
                });
                return;
            } else {
                toast({
                    title: `Order status updated to ${newStatus}`,
                });
            }
        }
        
        fetchOrders();
    };
    
    const handlePaymentStatusChange = async (orderId, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ payment_status: newStatus })
            .eq('id', orderId);

        if (error) {
            toast({
                title: `Failed to update payment status`,
                description: error.message,
                variant: 'destructive',
            });
        } else {
            toast({
                title: `Payment status updated to ${newStatus}`,
            });
            fetchOrders();
        }
    };

    const handleReceiptVerification = async (receiptId, newStatus) => {
        const { error } = await supabase
            .from('order_payment_receipts')
            .update({ status: newStatus, reviewed_by: user.id, reviewed_at: new Date() })
            .eq('id', receiptId);

        if (error) {
            toast({ title: "Update Failed", description: error.message, variant: 'destructive' });
            return;
        }

        if (newStatus === 'approved') {
            const orderToUpdate = orders.find(o => o.order_payment_receipts.some(r => r.id === receiptId));
            if (orderToUpdate) {
                await handlePaymentStatusChange(orderToUpdate.id, 'Paid');
            }
        }
        
        toast({ title: `Receipt ${newStatus}` });
        fetchOrders();
    };

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold gradient-text">Order Management</h1>
                {(isAdmin || isSalesman) && (
                    <Dialog open={isPlaceOrderOpen} onOpenChange={setIsPlaceOrderOpen}>
                        <DialogTrigger asChild>
                            <Button className="btn-primary w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" /> Place New Order
                            </Button>
                        </DialogTrigger>
                         <DialogContent className="w-[95vw] max-w-4xl h-[90vh] flex flex-col p-0">
                            <PlaceOrderForm 
                                isOpen={isPlaceOrderOpen} 
                                onClose={() => setIsPlaceOrderOpen(false)} 
                                onOrderPlaced={handleOrderPlaced} 
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            
            <OrderTabs 
                orders={orders}
                loading={loading}
                onStatusChange={handleStatusChange}
                onPaymentStatusChange={handlePaymentStatusChange}
                onReceiptVerification={handleReceiptVerification}
                canEdit={isAdmin || isSeller}
                canVerifyReceipt={isAdmin || isSeller}
                isSalesman={isSalesman}
            />
        </div>
    );
};

// ... (OrderTabs, OrderList, OrderCard, ReceiptVerificationDialog, StatusChanger components remain the same)
const OrderTabs = ({ orders, loading, onStatusChange, onPaymentStatusChange, onReceiptVerification, canEdit, canVerifyReceipt, isSalesman }) => {
    const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    const getOrdersByStatus = (status) => {
        return orders.filter(order => order.status === status);
    };

    if (loading) {
        return <div className="text-center py-10">Loading orders...</div>;
    }

    return (
        <Tabs defaultValue="Pending">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 flex-wrap h-auto">
                {orderStatuses.map(status => (
                    <TabsTrigger key={status} value={status} className="flex-grow text-xs sm:text-sm">
                        {status} ({getOrdersByStatus(status).length})
                    </TabsTrigger>
                ))}
            </TabsList>
            {orderStatuses.map(status => (
                <TabsContent key={status} value={status}>
                    <OrderList 
                        orders={getOrdersByStatus(status)}
                        onStatusChange={onStatusChange}
                        onPaymentStatusChange={onPaymentStatusChange}
                        onReceiptVerification={onReceiptVerification}
                        canEdit={canEdit}
                        canVerifyReceipt={canVerifyReceipt}
                        isSalesman={isSalesman}
                    />
                </TabsContent>
            ))}
        </Tabs>
    );
};

const OrderList = ({ orders, onStatusChange, onPaymentStatusChange, onReceiptVerification, canEdit, canVerifyReceipt, isSalesman }) => {
    if (orders.length === 0) {
        return <p className="text-center text-slate-500 py-10">No orders in this category.</p>;
    }
    
    return (
        <div className="space-y-4 mt-4">
            {orders.map(order => (
                <OrderCard 
                    key={order.id} 
                    order={order} 
                    onStatusChange={onStatusChange} 
                    onPaymentStatusChange={onPaymentStatusChange}
                    onReceiptVerification={onReceiptVerification}
                    canEdit={canEdit}
                    canVerifyReceipt={canVerifyReceipt}
                    isSalesman={isSalesman}
                />
            ))}
        </div>
    );
};

const OrderCard = ({ order, onStatusChange, onPaymentStatusChange, onReceiptVerification, canEdit, canVerifyReceipt, isSalesman }) => {
    const handleInvoiceDownload = () => {
        generateInvoice(order);
    };
    
    const formatPrice = (price) => {
        if (price == null) return 'Rs. 0.00';
        const formatted = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price);
        return `Rs. ${formatted}`;
    };

    const isUnregistered = !order.user_id;
    const receipt = order.order_payment_receipts && order.order_payment_receipts.length > 0 ? order.order_payment_receipts[0] : null;
    const subtotal = order.total_amount - (order.shipping_charge || 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="glass-effect">
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg">Order #{order.id.substring(0, 8)}</CardTitle>
                        <div className="text-xs sm:text-sm text-slate-500">
                           {formatDateToDDMMYYYY(order.created_at)}
                        </div>
                    </div>
                     <div className="text-xs sm:text-sm text-slate-600 font-medium flex flex-col gap-1 mt-1">
                        <span>
                            For: <span className="font-bold text-slate-800">{isUnregistered ? `${order.shipping_address?.businessName} (Unregistered)` : order.client?.business_name}</span>
                        </span>
                         {order.creator && <span>Placed by: <span className="font-semibold">{order.creator.contact_person}</span></span>}
                         {order.seller && <span>Sold by: <span className="font-semibold">{order.seller.business_name}</span></span>}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <h4 className="font-semibold mb-2">Shipping Address</h4>
                            <div className="text-sm text-slate-600">
                                <p>{order.shipping_address?.businessName}</p>
                                <p>{order.shipping_address?.contactPerson}</p>
                                <p>{order.shipping_address?.phone}</p>
                                <p>{order.shipping_address?.streetAddress}, {order.shipping_address?.city}, {order.shipping_address?.pincode}</p>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <h4 className="font-semibold mb-2">Items</h4>
                            <div className="text-sm space-y-1">
                                {order.order_items.map(item => (
                                    <div key={item.id} className="flex justify-between">
                                        <span>{item.products?.name || 'Product not found'} x {item.quantity}</span>
                                        <span>{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                         <div className="text-right sm:text-left">
                            {order.shipping_charge > 0 && (
                                <>
                                    <div className="text-sm text-slate-500">Subtotal: {formatPrice(subtotal)}</div>
                                    <div className="text-sm text-slate-500">Shipping: {formatPrice(order.shipping_charge)}</div>
                                </>
                            )}
                            <div className="font-bold text-lg">Total: {formatPrice(order.total_amount)}</div>
                        </div>
                        
                         <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
                            {canEdit && (
                                <StatusChanger
                                    label="Order Status"
                                    currentValue={order.status}
                                    options={['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']}
                                    onChange={(newStatus) => onStatusChange(order.id, newStatus)}
                                />
                            )}
                            {canEdit ? (
                                <StatusChanger
                                    label="Payment"
                                    currentValue={order.payment_status}
                                    options={['Unpaid', 'Paid', 'Pending Verification']}
                                    onChange={(newStatus) => onPaymentStatusChange(order.id, newStatus)}
                                />
                            ) : isSalesman && (
                                <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-slate-100">
                                    <span className="text-sm font-medium">Payment:</span>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                                        {order.payment_status}
                                    </span>
                                </div>
                            )}
                            {canVerifyReceipt && receipt && receipt.status === 'pending' && (
                                <ReceiptVerificationDialog receipt={receipt} onVerify={onReceiptVerification} />
                            )}
                             <Button onClick={handleInvoiceDownload} variant="outline" size="sm" className="w-full sm:w-auto">
                                <FileDown className="mr-2 h-4 w-4" />
                                Invoice
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const ReceiptVerificationDialog = ({ receipt, onVerify }) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 w-full sm:w-auto">
                    <Eye className="mr-2 h-4 w-4" />
                    Verify Receipt
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Verify Payment Receipt</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <a href={receipt.receipt_url} target="_blank" rel="noopener noreferrer">
                        <img src={receipt.receipt_url} alt="Payment Receipt" className="w-full h-auto rounded-lg border" />
                    </a>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="destructive" onClick={() => onVerify(receipt.id, 'rejected')}>
                            <X className="mr-2 h-4 w-4" /> Reject
                        </Button>
                        <Button className="btn-primary" onClick={() => onVerify(receipt.id, 'approved')}>
                            <Check className="mr-2 h-4 w-4" /> Approve
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const StatusChanger = ({ label, currentValue, options, onChange }) => (
    <div className="flex items-center gap-2">
        <span className="text-sm font-medium hidden sm:inline">{label}:</span>
        <Select value={currentValue} onValueChange={onChange}>
            <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
                {options.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
);

export default OrderManagement;