import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Wallet, User, Phone, CheckCircle2, CreditCard, WrapText as ReceiptText, Calendar, ArrowLeft, ChevronRight, Bell, Send, History, ChevronDown, ChevronUp, Package, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import CreditNotesSection from '@/components/pos/CreditNotesSection';

// --- DIALOG COMPONENT: PAYMENT (Supports FIFO for Customer or Direct Invoice Payment) ---
const CreditPaymentDialog = ({ open, onOpenChange, invoice, customer, onPaymentComplete }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Cash');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            // If paying for specific invoice, prefill balance. If paying for customer (FIFO), prefill total due.
            const initialAmount = invoice 
                ? parseFloat(invoice.balance_due).toFixed(2) 
                : customer ? parseFloat(customer.total_due).toFixed(2) : '';
            setAmount(initialAmount);
            setMethod('Cash');
        }
    }, [open, invoice, customer]);

    const handlePayment = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid amount greater than 0.", variant: "destructive" });
            return;
        }
        
        const payAmount = parseFloat(amount);
        const maxDue = invoice ? invoice.balance_due : customer?.total_due || 0;

        // Allow tiny overpayment margin for floating point issues
        if (payAmount > (parseFloat(maxDue) + 0.10)) {
             toast({ title: "Overpayment", description: "Payment amount cannot exceed the balance due.", variant: "destructive" });
             return;
        }

        setIsSubmitting(true);
        try {
            // 1. Record the Payment Record (General Account Payment or Specific Sale)
            const paymentPayload = {
                user_id: user.id,
                customer_id: customer?.id || null, 
                sale_id: invoice?.id || null, // Null if account-level payment
                amount: payAmount,
                payment_method: method,
                notes: invoice ? `Payment for Invoice #${invoice.id.substring(0,8)}` : 'Account Payment (FIFO)'
            };

            const { data: paymentData, error: payError } = await supabase
                .from('pos_credit_payments')
                .insert(paymentPayload)
                .select();
            
            if (payError) throw payError;

            // 2. Allocate Payment
            if (invoice) {
                // Direct Invoice Payment
                const currentPaid = parseFloat(invoice.amount_paid) || 0;
                const currentBalance = parseFloat(invoice.balance_due) || 0;
                
                const newPaid = currentPaid + payAmount;
                const rawBalance = currentBalance - payAmount;
                const newBalance = rawBalance < 0.10 ? 0 : Number(rawBalance.toFixed(2));
                const newStatus = newBalance === 0 ? 'Paid' : 'Partial'; 

                // Include user_id in filter for RLS safety
                const { error: updateError } = await supabase.from('point_of_sale_sales')
                    .update({
                        amount_paid: newPaid,
                        balance_due: newBalance,
                        payment_status: newStatus
                    })
                    .eq('id', invoice.id)
                    .eq('user_id', user.id);
                
                if (updateError) throw updateError;

            } else {
                // FIFO Allocation (Account Payment)
                // Fetch all pending invoices for this customer, ordered by oldest first
                const { data: pendingInvoices, error: fetchError } = await supabase
                    .from('point_of_sale_sales')
                    .select('*')
                    .eq('customer_id', customer.id)
                    .eq('user_id', user.id) // Ensure we only get sales for this shop
                    .eq('payment_method', 'Credit') 
                    .gt('balance_due', 0.50)
                    .neq('payment_status', 'Paid')
                    .order('created_at', { ascending: true }); // Oldest first

                if (fetchError) throw fetchError;
                
                let remainingPayment = payAmount;

                for (const inv of pendingInvoices) {
                    if (remainingPayment <= 0.01) break; // Use small threshold for float comparison

                    const currentDue = parseFloat(inv.balance_due);
                    const allocation = Math.min(remainingPayment, currentDue);
                    
                    const newPaid = (parseFloat(inv.amount_paid) || 0) + allocation;
                    const rawBalance = currentDue - allocation;
                    const newBalance = rawBalance < 0.10 ? 0 : Number(rawBalance.toFixed(2));
                    const newStatus = newBalance === 0 ? 'Paid' : 'Partial';

                    const updatePayload = {
                        amount_paid: newPaid,
                        balance_due: newBalance,
                        payment_status: newStatus
                    };

                    const { error: allocError } = await supabase.from('point_of_sale_sales')
                        .update(updatePayload)
                        .eq('id', inv.id)
                        .eq('user_id', user.id);

                    if (allocError) throw allocError;
                    
                    remainingPayment -= allocation;
                }
            }

            toast({ title: "Payment Recorded", description: `Successfully received ${formatPrice(payAmount)} via ${method}.` });
            onOpenChange(false);
            onPaymentComplete();
        } catch (error) {
            console.error("Payment processing CRITICAL error:", error);
            toast({ title: "Payment Failed", description: error.message || "Could not update records.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = invoice ? "Receive Payment" : "Receive Account Payment";
    const desc = invoice 
        ? `Record a payment for Invoice #${invoice.id.substring(0,8)}` 
        : `Record a payment for ${customer?.name}. Amount will be applied to oldest bills first.`;

    const balanceDisplay = invoice ? invoice.balance_due : customer?.total_due;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{desc}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Outstanding Balance:</span>
                        <span className="font-bold text-red-600 dark:text-red-400">{formatPrice(balanceDisplay)}</span>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Payment Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input 
                                type="number" 
                                className="pl-7" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        {!invoice && (
                            <p className="text-xs text-muted-foreground">
                                This will automatically pay off oldest invoices first (FIFO).
                            </p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Payment Method</label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="UPI">UPI</SelectItem>
                                <SelectItem value="Card">Card</SelectItem>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handlePayment} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- DIALOG COMPONENT: REMINDER ---
const SendReminderDialog = ({ open, onOpenChange, invoice, customer, onReminderSent }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (open && customer) {
            let defaultMsg = '';
            
            if (invoice) {
                // Single Invoice Context
                const dueDateStr = invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'the earliest';
                defaultMsg = `Dear ${customer.name}, this is a reminder that payment of ${formatPrice(invoice.balance_due)} for Invoice #${invoice.id.substring(0,8)} is pending. Please pay by ${dueDateStr}. Thank you.`;
            } else {
                // Customer Total Balance Context
                defaultMsg = `Dear ${customer.name}, this is a reminder that your total outstanding balance is ${formatPrice(customer.total_due)}. Please clear your dues at the earliest. Thank you.`;
            }
            setMessage(defaultMsg);
        }
    }, [open, invoice, customer]);

    const handleSend = async () => {
        if (!message.trim()) {
            toast({ title: "Empty Message", description: "Please enter a reminder message.", variant: "destructive" });
            return;
        }

        setIsSending(true);
        try {
            // Log local reminder record
            let targetSaleId = invoice?.id;

            if (!targetSaleId) {
                // Fetch oldest pending invoice for this customer to attach reminder to
                const { data: oldest } = await supabase
                    .from('point_of_sale_sales')
                    .select('id')
                    .eq('customer_id', customer.id)
                    .eq('payment_method', 'Credit')
                    .gt('balance_due', 0.50)
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .single();
                
                if (oldest) targetSaleId = oldest.id;
            }
            
            if (!targetSaleId) {
                 toast({ title: "No Pending Invoices", description: "This customer has no pending invoices to attach a reminder to.", variant: "destructive" });
                 return;
            }

            const { error } = await supabase.from('payment_reminders').insert({
                user_id: user.id,
                customer_id: customer.id,
                sale_id: targetSaleId,
                message: message.trim(),
            });

            if (error) throw error;

            // --- TRIGGER FCM PUSH NOTIFICATION ---
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('phone', customer.phone)
                .maybeSingle();

            if (userProfile) {
                const { error: funcError } = await supabase.functions.invoke('send-fcm-notification', {
                    body: JSON.stringify({
                        user_id: userProfile.id,
                        title: "Payment Reminder",
                        body: message.trim(),
                        data: {
                            type: 'payment_reminder',
                            amount: invoice ? invoice.balance_due : customer.total_due
                        },
                        click_action: '/my-purchases' 
                    })
                });
                
                if (funcError) console.warn("Push notification failed:", funcError);
                else toast({ title: "Push Notification Sent", description: "Customer notified via app." });
            }

            toast({ title: "Reminder Recorded", description: "The payment reminder has been recorded." });
            onOpenChange(false);
            if (onReminderSent) onReminderSent();
        } catch (error) {
            console.error(error);
            toast({ title: "Failed to send", description: error.message, variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Send Payment Reminder</DialogTitle>
                    <DialogDescription>
                        Send a reminder to {customer?.name}
                        {invoice ? ` for Invoice #${invoice.id.substring(0,8)}` : ' for total outstanding balance'}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                     <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                            <span className="text-muted-foreground block text-xs uppercase">Total Due</span>
                            <span className="font-bold text-red-600 dark:text-red-400">
                                {invoice ? formatPrice(invoice.balance_due) : formatPrice(customer?.total_due)}
                            </span>
                        </div>
                        {invoice && (
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                <span className="text-muted-foreground block text-xs uppercase">Due Date</span>
                                <span className="font-medium">
                                    {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}
                                </span>
                            </div>
                        )}
                        {!invoice && (
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                <span className="text-muted-foreground block text-xs uppercase">Pending Bills</span>
                                <span className="font-medium">{customer?.pending_count}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Message</label>
                        <Textarea 
                            value={message} 
                            onChange={e => setMessage(e.target.value)} 
                            placeholder="Type your reminder message..."
                            className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">This message can be sent via SMS/WhatsApp integration later.</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>Cancel</Button>
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                        Send Reminder
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- CUSTOMER CARD COMPONENT ---
const CustomerSummaryCard = ({ customer, onClick, onPay, onRemind }) => {
    return (
        <motion.div 
            whileHover={{ scale: 1.01 }}
            className="group h-full"
        >
            <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-300 border-t-4 border-t-orange-500 bg-white dark:bg-slate-900 overflow-hidden">
                <CardContent className="p-5 flex-grow cursor-pointer" onClick={() => onClick(customer)}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-orange-100 dark:bg-orange-900/30 p-2.5 rounded-full">
                            <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {customer.pending_count} Bills
                        </Badge>
                    </div>
                    
                    <div className="space-y-1 mb-4">
                        <h3 className="font-bold text-lg truncate text-slate-900 dark:text-slate-100" title={customer.name}>
                            {customer.name}
                        </h3>
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 mr-1.5" />
                            {customer.phone || 'N/A'}
                        </div>
                        {customer.email && (
                            <div className="flex items-center text-sm text-muted-foreground truncate" title={customer.email}>
                                <Mail className="h-3.5 w-3.5 mr-1.5" />
                                {customer.email}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Outstanding</p>
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatPrice(customer.total_due)}</p>
                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-orange-500 transition-colors" />
                        </div>
                    </div>
                </CardContent>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex gap-3 mt-auto">
                    <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:text-orange-600 dark:hover:text-orange-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemind(customer);
                        }}
                    >
                        <Bell className="w-3.5 h-3.5 mr-2" />
                        Remind
                    </Button>
                    <Button 
                        size="sm" 
                        className="flex-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPay(customer);
                        }}
                    >
                        <Wallet className="w-3.5 h-3.5 mr-2" />
                        Pay
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
};

// --- INVOICE ITEM COMPONENT ---
const InvoiceItem = ({ invoice, reminders, onPay, onRemind }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const lastReminder = reminders.length > 0 ? reminders[0] : null;

    const toggleExpand = async () => {
        if (!isExpanded && products.length === 0) {
            setLoadingProducts(true);
            try {
                const { data, error } = await supabase
                    .from('point_of_sale_sale_items')
                    .select(`
                        id,
                        quantity,
                        unit_price,
                        total_price,
                        product:point_of_sale_products(name)
                    `)
                    .eq('sale_id', invoice.id);
                
                if (error) throw error;
                setProducts(data || []);
            } catch (err) {
                console.error("Error fetching items:", err);
            } finally {
                setLoadingProducts(false);
            }
        }
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden mb-3 hover:border-orange-200 dark:hover:border-orange-800 transition-colors shadow-sm">
            <div 
                className="p-4 cursor-pointer flex flex-col md:flex-row gap-4 justify-between"
                onClick={toggleExpand}
            >
                {/* Left: Info */}
                <div className="flex-grow space-y-2">
                    <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            #{invoice.id.substring(0,8).toUpperCase()}
                        </span>
                        <Badge variant={invoice.payment_status === 'Partial' ? 'secondary' : 'outline'} className={invoice.payment_status === 'Partial' ? 'bg-amber-100 text-amber-800' : ''}>
                            {invoice.payment_status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto md:ml-0">
                             <Calendar className="w-3.5 h-3.5" />
                             {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                         <div className="flex items-center gap-1 text-muted-foreground">
                            <span>Total Bill:</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{formatPrice(invoice.total_amount)}</span>
                         </div>
                    </div>
                    
                    {reminders.length > 0 && (
                        <div className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full mt-1">
                            <History className="w-3 h-3" />
                            <span>Last reminder: {format(new Date(lastReminder.created_at), 'MMM dd')}</span>
                        </div>
                    )}
                </div>

                {/* Right: Actions & Due */}
                <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-3 md:gap-1 min-w-[160px] border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Balance Due</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400 leading-tight">{formatPrice(invoice.balance_due)}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-auto">
                        <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-8 px-2 text-muted-foreground hover:text-orange-600"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemind(invoice);
                            }}
                        >
                            <Bell className="w-4 h-4" />
                        </Button>
                        <Button 
                            size="sm" 
                            className="h-8 text-xs" 
                            onClick={(e) => {
                                e.stopPropagation();
                                onPay(invoice);
                            }}
                        >
                            <Wallet className="w-3.5 h-3.5 mr-1.5" />
                            Pay
                        </Button>
                         <div className="ml-1 text-slate-400">
                             {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                         </div>
                    </div>
                </div>
            </div>

            {/* EXPANDED PRODUCTS VIEW */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                    >
                        <div className="p-4">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                <Package className="w-3.5 h-3.5" /> Included Items
                            </h4>
                            {loadingProducts ? (
                                <div className="py-2 flex items-center text-muted-foreground text-xs">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Loading items...
                                </div>
                            ) : products.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No products found for this invoice.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                                    {products.map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800 last:border-0 border-dashed">
                                            <div className="flex-1 pr-4">
                                                <span className="text-slate-700 dark:text-slate-300">{item.product?.name || 'Unknown Product'}</span>
                                                <span className="text-xs text-muted-foreground ml-2">x{item.quantity}</span>
                                            </div>
                                            <div className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                                                {formatPrice(item.total_price)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- MAIN COMPONENT ---
const PosCredit = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'detail'
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSummaries, setCustomerSummaries] = useState([]);
    const [customerInvoices, setCustomerInvoices] = useState([]);
    const [invoiceReminders, setInvoiceReminders] = useState({}); // Map of sale_id -> reminder[]
    
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Dialog States
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [dialogCustomer, setDialogCustomer] = useState(null); // For dialogs when in summary mode

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // 1. Fetch Customer Summaries
    const fetchCustomerSummaries = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch all credit invoices with outstanding balance
            let query = supabase
                .from('point_of_sale_sales')
                .select(`
                    id,
                    balance_due,
                    customer:point_of_sale_customers(id, name, phone, email)
                `)
                .eq('user_id', user.id)
                .eq('payment_method', 'Credit') 
                .gt('balance_due', 0.50)
                .neq('payment_status', 'Paid');

            const { data, error } = await query;
            if (error) throw error;

            // Group by customer
            const grouped = {};
            
            (data || []).forEach(inv => {
                const custId = inv.customer?.id || 'unknown';
                if (!grouped[custId]) {
                    grouped[custId] = {
                        id: custId,
                        name: inv.customer?.name || 'Unknown Customer',
                        phone: inv.customer?.phone || '',
                        email: inv.customer?.email || '',
                        total_due: 0,
                        pending_count: 0
                    };
                }
                // Careful with floating point addition
                grouped[custId].total_due += inv.balance_due;
                grouped[custId].pending_count += 1;
            });

            const summaryList = Object.values(grouped).filter(c => c.total_due > 0.50);

            // Filter by search term if exists (client-side filtering for aggregation view)
            const filteredList = debouncedSearchTerm 
                ? summaryList.filter(c => 
                    c.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
                    c.phone.includes(debouncedSearchTerm)
                  )
                : summaryList;

            setCustomerSummaries(filteredList);
        } catch (err) {
            console.error("Error fetching credit summaries:", err);
        } finally {
            setLoading(false);
        }
    }, [user, debouncedSearchTerm]);

    // 2. Fetch Invoices for Selected Customer
    const fetchCustomerInvoices = useCallback(async (customerId) => {
        if (!user || !customerId) return;
        setLoading(true);
        try {
            let query = supabase
                .from('point_of_sale_sales')
                .select('*')
                .eq('user_id', user.id)
                .eq('payment_method', 'Credit')
                .eq('customer_id', customerId === 'unknown' ? null : customerId) // handle unknown/null customer
                .gt('balance_due', 0.50)
                .neq('payment_status', 'Paid')
                .order('created_at', { ascending: false });

            const { data: invoices, error } = await query;
            if (error) throw error;

            setCustomerInvoices(invoices || []);

            // Fetch Reminders for these invoices
            if (invoices && invoices.length > 0) {
                const invoiceIds = invoices.map(i => i.id);
                const { data: reminders, error: reminderError } = await supabase
                    .from('payment_reminders')
                    .select('*')
                    .in('sale_id', invoiceIds)
                    .order('created_at', { ascending: false });
                
                if (!reminderError && reminders) {
                    const reminderMap = {};
                    reminders.forEach(r => {
                        if (!reminderMap[r.sale_id]) reminderMap[r.sale_id] = [];
                        reminderMap[r.sale_id].push(r);
                    });
                    setInvoiceReminders(reminderMap);
                }
            } else {
                setInvoiceReminders({});
            }

        } catch (err) {
            console.error("Error fetching customer invoices:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial Load
    useEffect(() => {
        if (viewMode === 'summary') {
            fetchCustomerSummaries();
        }
    }, [fetchCustomerSummaries, viewMode]);

    // Handle Customer Selection (Go to details)
    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        setViewMode('detail');
        fetchCustomerInvoices(customer.id);
    };

    // Handle Back Navigation
    const handleBackToSummary = () => {
        setSelectedCustomer(null);
        setViewMode('summary');
        setCustomerInvoices([]);
        setInvoiceReminders({});
        fetchCustomerSummaries(); // Refresh summary to update totals
    };

    // Handle Summary Card Actions
    const handleCustomerPay = (customer) => {
        setDialogCustomer(customer);
        setSelectedInvoice(null); // Paying entire balance / FIFO
        setPaymentDialogOpen(true);
    };

    const handleCustomerRemind = (customer) => {
        setDialogCustomer(customer);
        setSelectedInvoice(null); // Reminding about total balance
        setReminderDialogOpen(true);
    };

    // Handle Detail List Actions
    const handleInvoicePay = (invoice) => {
        setDialogCustomer(selectedCustomer);
        setSelectedInvoice(invoice);
        setPaymentDialogOpen(true);
    };

    const handleInvoiceRemind = (invoice) => {
        setDialogCustomer(selectedCustomer);
        setSelectedInvoice(invoice);
        setReminderDialogOpen(true);
    };

    // Callback after payment success
    const handlePaymentComplete = () => {
        if (viewMode === 'detail' && selectedCustomer) {
            // Reload specific customer details
            fetchCustomerInvoices(selectedCustomer.id);
        } else {
            // Reload summary list
            fetchCustomerSummaries();
        }
    };

    // Callback after reminder sent
    const handleReminderSent = () => {
        if (viewMode === 'detail' && selectedCustomer) {
            fetchCustomerInvoices(selectedCustomer.id);
        }
        // No visual update needed for summary view reminder
    };

    // Total Outstanding (across all customers in view)
    const totalOutstanding = customerSummaries.reduce((acc, curr) => acc + curr.total_due, 0);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <CreditCard className="h-8 w-8 text-primary" />
                        Credit Management
                    </h1>
                    <p className="text-muted-foreground text-lg">Track pending payments and send reminders.</p>
                </div>
                
                {viewMode === 'summary' && (
                    <div className="w-full md:w-auto relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <Input 
                            placeholder="Search by name or phone..." 
                            className="pl-10 w-full md:w-80 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
            </header>

            {/* --- VIEW MODE: SUMMARY (Customer List) --- */}
            {viewMode === 'summary' && (
                <div className="space-y-8">
                    {/* Summary Stats */}
                    <Card className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 border-l-4 border-l-primary shadow-sm">
                        <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="space-y-1 text-center sm:text-left">
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total Outstanding Credit</p>
                                <p className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{formatPrice(totalOutstanding)}</p>
                            </div>
                            <div className="flex gap-6">
                                <div className="text-center px-6 py-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 min-w-[120px]">
                                    <span className="block font-bold text-2xl text-primary mb-1">{customerSummaries.length}</span>
                                    <span className="text-sm text-muted-foreground font-medium">Customers</span>
                                </div>
                                <div className="text-center px-6 py-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 min-w-[120px]">
                                    <span className="block font-bold text-2xl text-orange-600 mb-1">
                                        {customerSummaries.reduce((acc, c) => acc + c.pending_count, 0)}
                                    </span>
                                    <span className="text-sm text-muted-foreground font-medium">Pending Bills</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Grid */}
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin h-10 w-10 text-primary" />
                                <p className="text-muted-foreground font-medium">Loading credit profiles...</p>
                            </div>
                        ) : customerSummaries.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50"
                            >
                                <CheckCircle2 className="h-20 w-20 text-green-500 mb-6 opacity-20"/>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">All Caught Up!</h3>
                                <p className="text-lg text-muted-foreground max-w-md text-center">There are no pending credit payments at the moment. Great job tracking your sales!</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {customerSummaries.map((customer) => (
                                    <CustomerSummaryCard 
                                        key={customer.id} 
                                        customer={customer} 
                                        onClick={handleCustomerSelect} 
                                        onPay={handleCustomerPay}
                                        onRemind={handleCustomerRemind}
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>

                    {/* New Credit Notes Section */}
                    <div className="block">
                        <CreditNotesSection />
                    </div>
                </div>
            )}

            {/* --- VIEW MODE: DETAIL (Invoices List) --- */}
            {viewMode === 'detail' && selectedCustomer && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    {/* Back Button & Customer Header */}
                    <div className="flex items-center gap-4 mb-2">
                        <Button variant="outline" size="icon" onClick={handleBackToSummary} className="h-10 w-10 rounded-full border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-slate-100">
                                {selectedCustomer.name}
                                <Badge variant="secondary" className="font-normal text-sm px-2.5 py-0.5">{selectedCustomer.phone}</Badge>
                            </h2>
                            <p className="text-sm text-muted-foreground">Managing credit account details</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Side: Customer Overview Card (Sticky) */}
                        <div className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-24">
                            <Card className="shadow-md border-0 ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-800">
                                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Total Due</p>
                                    <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                                        {formatPrice(customerInvoices.reduce((acc, inv) => acc + inv.balance_due, 0))}
                                    </p>
                                </div>
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-muted-foreground text-sm">Pending Invoices</span>
                                            <Badge variant="outline" className="font-semibold">{customerInvoices.length}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-muted-foreground text-sm">Last Purchase</span>
                                            <span className="font-medium text-sm">
                                                {customerInvoices.length > 0 
                                                    ? format(new Date(customerInvoices[0].created_at), 'MMM dd, yyyy') 
                                                    : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3 pt-2">
                                        <Button className="w-full h-11 text-base shadow-sm" onClick={() => handleCustomerPay(selectedCustomer)}>
                                            <Wallet className="w-5 h-5 mr-2" />
                                            Pay Full Account
                                        </Button>
                                        <Button className="w-full h-11 text-base" variant="outline" onClick={() => handleCustomerRemind(selectedCustomer)}>
                                            <Bell className="w-5 h-5 mr-2" />
                                            Send Reminder
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Side: Invoices List */}
                        <div className="lg:col-span-8 xl:col-span-9">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <ReceiptText className="w-5 h-5 text-slate-500" />
                                        Unpaid Invoices
                                    </h3>
                                    <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                                        {customerInvoices.length} Items
                                    </span>
                                </div>
                                
                                <div className="p-6 bg-slate-50/30 dark:bg-slate-900/30 min-h-[400px]">
                                    {loading ? (
                                        <div className="p-12 flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="animate-spin h-8 w-8 text-primary" />
                                            <p className="text-muted-foreground text-sm">Loading invoices...</p>
                                        </div>
                                    ) : customerInvoices.length === 0 ? (
                                        <div className="p-16 text-center">
                                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                                            </div>
                                            <h4 className="text-lg font-medium text-slate-900 dark:text-white">All Clear!</h4>
                                            <p className="text-muted-foreground mt-1">No unpaid invoices for this customer.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {customerInvoices.map((invoice) => (
                                                <InvoiceItem 
                                                    key={invoice.id} 
                                                    invoice={invoice} 
                                                    reminders={invoiceReminders[invoice.id] || []}
                                                    onPay={handleInvoicePay}
                                                    onRemind={handleInvoiceRemind}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Dialog */}
            {paymentDialogOpen && (
                <CreditPaymentDialog 
                    open={paymentDialogOpen} 
                    onOpenChange={setPaymentDialogOpen}
                    invoice={selectedInvoice}
                    customer={dialogCustomer}
                    onPaymentComplete={handlePaymentComplete}
                />
            )}

             {/* Reminder Dialog */}
             {reminderDialogOpen && (
                <SendReminderDialog
                    open={reminderDialogOpen}
                    onOpenChange={setReminderDialogOpen}
                    invoice={selectedInvoice}
                    customer={dialogCustomer}
                    onReminderSent={handleReminderSent}
                />
            )}
        </div>
    );
};

export default PosCredit;