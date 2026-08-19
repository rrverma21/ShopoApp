import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Upload, Eye, Star, FileText } from 'lucide-react';
import { generateInvoice } from '@/lib/invoiceGenerator';
import { formatDateToDDMMYYYY } from '@/lib/utils';
import ReviewDialog from '@/components/reviews/ReviewDialog';
import StarRating from '@/components/reviews/StarRating';
import FloatingNotepad from '@/components/pos/FloatingNotepad';
import FloatingNotepadToggle from '@/components/pos/FloatingNotepadToggle';
import { useNavigate } from 'react-router-dom';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    
    // Floating Notepad State
    const [isNotepadOpen, setIsNotepadOpen] = useState(false);
    const [notepadCount, setNotepadCount] = useState(0);

    useEffect(() => {
        const updateCount = () => {
            try {
                const savedNotes = localStorage.getItem('floatingNotepadNotes');
                if (savedNotes) {
                    const notes = JSON.parse(savedNotes);
                    setNotepadCount(notes.length);
                } else {
                    setNotepadCount(0);
                }
            } catch(e) { setNotepadCount(0); }
        };
        
        updateCount();
        const interval = setInterval(updateCount, 2000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                seller:profiles!orders_seller_id_fkey(business_name, qr_code_url),
                order_items(*, products(name)),
                order_payment_receipts!order_payment_receipts_order_id_fkey(*),
                reviews(id, rating)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

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
    }, [user]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handlePaymentUploaded = () => {
        fetchOrders();
    };

    const handleReviewSubmitted = () => {
        fetchOrders();
    };

    return (
        <div className="pb-20">
            <Helmet>
                <title>My Orders - ShopoApp</title>
                <meta name="description" content="View your order history and track your purchases on ShopoApp." />
            </Helmet>
            <main className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 gradient-text">My Orders</h1>
                {loading ? (
                    <div className="text-center py-10">Loading your orders...</div>
                ) : (
                    <OrderTabs orders={orders} onPaymentUploaded={handlePaymentUploaded} onReviewSubmitted={handleReviewSubmitted} />
                )}
                
                {/* Floating Notepad */}
                <FloatingNotepadToggle isOpen={isNotepadOpen} onToggle={() => setIsNotepadOpen(true)} noteCount={notepadCount} />
                <FloatingNotepad isOpen={isNotepadOpen} onClose={() => setIsNotepadOpen(false)} />
            </main>
        </div>
    );
};

const OrderTabs = ({ orders, onPaymentUploaded, onReviewSubmitted }) => {
    const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    const getOrdersByStatus = (status) => {
        return orders.filter(order => order.status === status);
    };

    return (
        <Tabs defaultValue="Pending">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 flex-wrap h-auto">
                {orderStatuses.map(status => (
                    <TabsTrigger key={status} value={status} className="flex-grow">
                        {status} ({getOrdersByStatus(status).length})
                    </TabsTrigger>
                ))}
            </TabsList>
            {orderStatuses.map(status => (
                <TabsContent key={status} value={status}>
                    <OrderList orders={getOrdersByStatus(status)} onPaymentUploaded={onPaymentUploaded} onReviewSubmitted={onReviewSubmitted} />
                </TabsContent>
            ))}
        </Tabs>
    );
};

const OrderList = ({ orders, onPaymentUploaded, onReviewSubmitted }) => {
    if (orders.length === 0) {
        return <p className="text-center text-slate-500 py-10">No orders in this category.</p>;
    }
    
    return (
        <div className="space-y-4 mt-4">
            {orders.map(order => (
                <OrderCard key={order.id} order={order} onPaymentUploaded={onPaymentUploaded} onReviewSubmitted={onReviewSubmitted} />
            ))}
        </div>
    );
};

const OrderCard = ({ order, onPaymentUploaded, onReviewSubmitted }) => {
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const navigate = useNavigate();

    const handleInvoiceDownload = () => {
        // Legacy Invoice generation
        generateInvoice(order);
    };

    const handleViewGSTInvoice = () => {
        if (order.gst_invoice_id) {
            navigate(`/pos/invoice/${order.gst_invoice_id}`);
        }
    };

    const formatPrice = (price) => {
        if (price == null) return 'Rs. 0.00';
        const formatted = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price);
        return `Rs. ${formatted}`;
    };

    const receipt = order.order_payment_receipts && order.order_payment_receipts.length > 0 ? order.order_payment_receipts[0] : null;
    const subtotal = order.total_amount - (order.shipping_charge || 0);
    const existingReview = order.reviews && order.reviews.length > 0 ? order.reviews[0] : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="glass-effect">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle>Order #{order.id.substring(0, 8)}</CardTitle>
                        <div className="text-sm text-slate-500">
                            {formatDateToDDMMYYYY(order.created_at)}
                        </div>
                    </div>
                    <div className="text-sm text-slate-600 font-medium">
                        Sold by: <span className="font-bold text-slate-800">{order.seller?.business_name}</span>
                    </div>
                    {/* GST Invoice Badge */}
                    {order.has_gst_invoice && (
                        <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                INV: {order.gst_invoice_number}
                            </span>
                        </div>
                    )}
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

                    <div className="border-t pt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="text-right">
                            {order.shipping_charge > 0 && (
                                <>
                                    <div className="text-sm text-slate-500">Subtotal: {formatPrice(subtotal)}</div>
                                    <div className="text-sm text-slate-500">Shipping: {formatPrice(order.shipping_charge)}</div>
                                </>
                            )}
                            <div className="font-bold text-lg">Total: {formatPrice(order.total_amount)}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                                order.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                                order.payment_status === 'Pending Verification' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                                {order.payment_status}
                            </span>
                            {order.payment_status === 'Unpaid' && (
                                <PayNowModal order={order} onPaymentUploaded={onPaymentUploaded} />
                            )}
                            {receipt && <ViewReceiptDialog receipt={receipt} />}
                            
                            {/* GST Invoice Button if available, else Legacy Invoice */}
                            {order.has_gst_invoice ? (
                                <Button onClick={handleViewGSTInvoice} variant="outline" size="sm" className="border-blue-200 hover:bg-blue-50 text-blue-700">
                                    <FileText className="mr-2 h-4 w-4" />
                                    GST Invoice
                                </Button>
                            ) : (
                                <Button onClick={handleInvoiceDownload} variant="outline" size="sm">
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Invoice
                                </Button>
                            )}
                            
                            {order.status === 'Delivered' && (
                                existingReview ? (
                                    <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
                                        <span className="text-xs text-yellow-700 font-medium">You rated:</span>
                                        <StarRating rating={existingReview.rating} size="sm" readOnly />
                                    </div>
                                ) : (
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        onClick={() => setIsReviewOpen(true)}
                                        className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    >
                                        <Star className="mr-2 h-3.5 w-3.5" /> Rate Shop
                                    </Button>
                                )
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ReviewDialog 
                isOpen={isReviewOpen} 
                onClose={() => setIsReviewOpen(false)}
                targetId={order.seller_id}
                targetName={order.seller?.business_name}
                orderId={order.id}
                type="shop"
                onReviewSubmitted={onReviewSubmitted}
            />
        </motion.div>
    );
};

const PayNowModal = ({ order, onPaymentUploaded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [receiptFile, setReceiptFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const { user } = useAuth();

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!receiptFile) {
            toast({ title: "No file selected", description: "Please select a receipt file to upload.", variant: "destructive" });
            return;
        }
        setUploading(true);

        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('order-receipts')
            .upload(filePath, receiptFile);

        if (uploadError) {
            toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from('order-receipts').getPublicUrl(filePath);

        const { data: receiptData, error: dbError } = await supabase
            .from('order_payment_receipts')
            .insert({
                order_id: order.id,
                receipt_url: publicUrl,
                status: 'pending'
            })
            .select('id')
            .single();

        if (dbError) {
            toast({ title: "Database Error", description: dbError.message, variant: "destructive" });
            setUploading(false);
            return;
        }

        const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({ payment_status: 'Pending Verification', payment_receipt_id: receiptData.id })
            .eq('id', order.id);

        if (orderUpdateError) {
            toast({ title: "Order Update Error", description: orderUpdateError.message, variant: "destructive" });
        } else {
            toast({ title: "Receipt Uploaded!", description: "Your payment receipt has been submitted for verification." });
            onPaymentUploaded();
            setIsOpen(false);
        }

        setUploading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="btn-primary">Pay Now</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Complete Your Payment</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <p className="text-sm text-slate-600">
                        Please scan the QR code below to make the payment. After paying, upload the receipt.
                    </p>
                    {order.seller?.qr_code_url ? (
                        <div className="flex justify-center">
                            <img src={order.seller.qr_code_url} alt="Seller QR Code" className="w-48 h-48 border rounded-lg" />
                        </div>
                    ) : (
                        <p className="text-center font-semibold text-red-500">QR Code not available for this seller.</p>
                    )}
                    <div>
                        <Label htmlFor="receipt">Upload Payment Receipt</Label>
                        <Input id="receipt" type="file" onChange={handleFileChange} accept="image/*,.pdf" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" onClick={handleUpload} disabled={uploading || !receiptFile}>
                        {uploading ? 'Uploading...' : <><Upload className="mr-2 h-4 w-4" /> Submit for Verification</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ViewReceiptDialog = ({ receipt }) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" /> View Receipt
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Payment Receipt</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <a href={receipt.receipt_url} target="_blank" rel="noopener noreferrer">
                        <img src={receipt.receipt_url} alt="Payment Receipt" className="w-full h-auto rounded-lg border" />
                    </a>
                    <div className="mt-4 text-sm">
                        <p>Status: <span className={`font-semibold ${
                            receipt.status === 'approved' ? 'text-green-600' :
                            receipt.status === 'rejected' ? 'text-red-600' :
                            'text-yellow-600'
                        }`}>{receipt.status}</span></p>
                        {receipt.reviewed_at && <p>Reviewed At: {formatDateToDDMMYYYY(receipt.reviewed_at)}</p>}
                        {receipt.notes && <p>Notes: {receipt.notes}</p>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OrdersPage;