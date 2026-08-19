import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Search, Calendar, Banknote, Percent, Phone, Mail, FileText, ChevronRight, Loader2, Users, Activity, Coins, ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, Clock, MapPin, Building2, Truck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AccessStatusBadge from '@/components/pos/AccessStatusBadge';

const SummaryCards = ({ customers }) => {
    const totalCustomers = customers.length;
    const totalVisits = customers.reduce((acc, curr) => acc + (parseInt(curr.total_purchases) || 0), 0);
    const totalRevenue = customers.reduce((acc, curr) => acc + (parseFloat(curr.total_spent) || 0), 0);
    const activeCustomers = customers.filter(c => c.last_accessed_at).length;
    
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalCustomers}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">Registered profiles</span>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalVisits}</div>
                    <p className="text-xs text-muted-foreground">Lifetime transactions</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">Lifetime value</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Engagement</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                        {activeCustomers}
                    </div>
                    <p className="text-xs text-muted-foreground">Have viewed records online</p>
                </CardContent>
            </Card>
        </div>
    )
}

const CustomerForm = ({ customer, onSuccess }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [formData, setFormData] = useState({ 
        name: '', 
        phone: '', 
        email: '', 
        address: '',
        customer_type: 'retail',
        firm_name: '',
        gstin: '', // Existing gstin
        customer_gstin: '', // New field requested, mapping to same input for simplicity or separating
        customer_state: '',
        customer_state_code: '',
        customer_billing_address: '',
        customer_shipping_address: ''
    });
    
    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                customer_type: customer.customer_type || 'retail',
                firm_name: customer.firm_name || '',
                // Fallback to existing gstin if new field is empty
                customer_gstin: customer.customer_gstin || customer.gstin || '',
                customer_state: customer.customer_state || '',
                customer_state_code: customer.customer_state_code || '',
                customer_billing_address: customer.customer_billing_address || '',
                customer_shipping_address: customer.customer_shipping_address || ''
            });
        } else {
            setFormData({ 
                name: '', 
                phone: '', 
                email: '', 
                address: '',
                customer_type: 'retail',
                firm_name: '',
                customer_gstin: '',
                customer_state: '',
                customer_state_code: '',
                customer_billing_address: '',
                customer_shipping_address: ''
            });
        }
    }, [customer]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSelectChange = (val) => setFormData({ ...formData, customer_type: val });

    const validateForm = () => {
        if (formData.customer_gstin) {
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            // Basic length check first
            if (formData.customer_gstin.length !== 15) {
                toast({ title: "Invalid GSTIN", description: "GSTIN must be exactly 15 alphanumeric characters.", variant: "destructive" });
                return false;
            }
            // Strict regex optional but recommended
            if (!gstinRegex.test(formData.customer_gstin)) {
                toast({ title: "Invalid GSTIN Format", description: "Please enter a valid 15-digit GSTIN (e.g. 27ABCDE1234F1Z5)", variant: "destructive" });
                return false;
            }
        }
        if (formData.customer_state_code) {
            if (!/^\d{2}$/.test(formData.customer_state_code)) {
                toast({ title: "Invalid State Code", description: "State code must be 2 digits (e.g. 27).", variant: "destructive" });
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        const payload = { 
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            customer_type: formData.customer_type,
            firm_name: formData.firm_name,
            gstin: formData.customer_gstin, // Sync legacy field
            customer_gstin: formData.customer_gstin,
            customer_state: formData.customer_state,
            customer_state_code: formData.customer_state_code,
            customer_billing_address: formData.customer_billing_address,
            customer_shipping_address: formData.customer_shipping_address,
            user_id: user.id 
        };
        
        const { error } = customer
            ? await supabase.from('point_of_sale_customers').update(payload).eq('id', customer.id)
            : await supabase.from('point_of_sale_customers').insert(payload);

        if (error) {
            toast({ title: `Error ${customer ? 'updating' : 'creating'} customer`, description: error.message, variant: 'destructive' });
        } else {
            toast({ title: `Customer ${customer ? 'updated' : 'created'} successfully` });
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Customer Type</Label>
                    <Select value={formData.customer_type} onValueChange={handleSelectChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="wholesale">Wholesale</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div><Label>Phone</Label><Input name="phone" value={formData.phone} onChange={handleChange} required /></div>
            </div>

            <div><Label>Contact Name</Label><Input name="name" value={formData.name} onChange={handleChange} required /></div>
            
            {/* GST & Tax Details Section */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Building2 className="h-4 w-4" /> GST & Tax Details
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <Label>Firm Name</Label>
                        <Input name="firm_name" value={formData.firm_name} onChange={handleChange} placeholder="Company Name" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <Label>GSTIN</Label>
                        <Input name="customer_gstin" value={formData.customer_gstin} onChange={handleChange} placeholder="27ABCDE..." maxLength={15} className="uppercase" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Label>State</Label>
                        <Input name="customer_state" value={formData.customer_state} onChange={handleChange} placeholder="Maharashtra" />
                    </div>
                    <div>
                        <Label>State Code</Label>
                        <Input name="customer_state_code" value={formData.customer_state_code} onChange={handleChange} placeholder="27" maxLength={2} />
                    </div>
                </div>
            </div>

            {/* Address Section */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="h-4 w-4" /> Addresses
                </h3>
                <div>
                    <Label>Billing Address</Label>
                    <Input name="customer_billing_address" value={formData.customer_billing_address} onChange={handleChange} placeholder="Full billing address" />
                </div>
                <div>
                    <Label>Shipping Address</Label>
                    <Input name="customer_shipping_address" value={formData.customer_shipping_address} onChange={handleChange} placeholder="Full shipping address (if different)" />
                </div>
            </div>

            <div><Label>Email</Label><Input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
            
            <DialogFooter><Button type="submit">{customer ? 'Update' : 'Create'}</Button></DialogFooter>
        </form>
    );
};

// ... (Rest of component methods like openWhatsApp, WhatsAppButton, CustomerDetailView remain unchanged)
const openWhatsApp = (customer, businessName) => {
    if (!customer?.phone) return;
    let phone = customer.phone.replace(/[^0-9]/g, '');
    if (phone.length === 10) { phone = '91' + phone; } else if (phone.startsWith('0')) { phone = '91' + phone.substring(1); }
    const purchaseHistoryLink = `${window.location.origin}/my-purchases`;
    const message = `Hello ${customer.name || 'Customer'}, greetings from ${businessName}.\n\n You have ${customer.loyalty_points || 0} reward points with us. \n\n View your bills & history: ${purchaseHistoryLink}\n\nThank you for shopping!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    try { localStorage.setItem(`whatsapp_sent_${customer.id}_${new Date().toDateString()}`, 'true'); } catch (e) { console.error("Local storage error", e); }
    window.open(url, '_blank');
};

const WhatsAppButton = ({ customer, businessName, variant = "ghost", size = "icon", showLabel = false }) => {
    const [hasSentToday, setHasSentToday] = useState(false);
    useEffect(() => { const sent = localStorage.getItem(`whatsapp_sent_${customer.id}_${new Date().toDateString()}`); setHasSentToday(!!sent); }, [customer.id]);
    const handleWhatsAppClick = (e) => { e.stopPropagation(); openWhatsApp(customer, businessName); setHasSentToday(true); };
    if (!customer.phone) { return (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant={variant} size={size} disabled className="opacity-50"><MessageCircle className={`h-4 w-4 ${showLabel ? "mr-2" : ""}`} />{showLabel && "WhatsApp"}</Button></TooltipTrigger><TooltipContent><p>No phone number available</p></TooltipContent></Tooltip></TooltipProvider>); }
    if (hasSentToday) { return (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant={variant} size={size} className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100" onClick={handleWhatsAppClick}><MessageCircle className={`h-4 w-4 ${showLabel ? "mr-2" : ""}`} />{showLabel && "Resend"}</Button></TooltipTrigger><TooltipContent><p>Message already sent today</p></TooltipContent></Tooltip></TooltipProvider>); }
    return (<Button variant={variant} size={size} className={`text-green-600 hover:text-green-700 hover:bg-green-50 ${showLabel ? "w-full justify-start" : ""}`} onClick={handleWhatsAppClick} title="Send WhatsApp Message"><MessageCircle className={`h-4 w-4 ${showLabel ? "mr-2" : ""}`} />{showLabel && "WhatsApp Message"}</Button>);
};

const CustomerDetailView = ({ customer, isOpen, onClose, businessName }) => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { if (customer && isOpen) { const fetchSales = async () => { setLoading(true); const { data, error } = await supabase.from('point_of_sale_sales').select('*, sale_items:point_of_sale_sale_items(*, product:point_of_sale_products(name))').eq('customer_id', customer.id).order('created_at', { ascending: false }); if (error) { console.error("Error fetching customer sales:", error); } else { setSales(data || []); } setLoading(false); }; fetchSales(); } }, [customer, isOpen]);
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:w-3/4 lg:w-1/2 p-0 flex flex-col h-full">
                {customer && (
                    <>
                        <SheetHeader className="p-6 border-b shrink-0">
                            <div className="flex justify-between items-start">
                                <div className="space-y-3">
                                    <div>
                                        <SheetTitle className="text-2xl flex items-center gap-2">{customer.name}</SheetTitle>
                                        <SheetDescription className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-1"><span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5"/>{customer.phone || 'N/A'}</span>{customer.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/>{customer.email}</span>}</SheetDescription>
                                        {(customer.firm_name || customer.customer_gstin) && (
                                            <div className="mt-2 text-xs bg-slate-100 p-2 rounded text-slate-700 dark:text-slate-300 dark:bg-slate-800">
                                                <div className="font-semibold">{customer.firm_name}</div>
                                                <div>GSTIN: {customer.customer_gstin || 'N/A'}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3"><WhatsAppButton customer={customer} businessName={businessName} variant="outline" size="sm" showLabel={true} /><div className="flex items-center gap-2"><AccessStatusBadge lastAccessed={customer.last_accessed_at} /></div></div>
                                </div>
                                <div className="text-right"><div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{customer.loyalty_points || 0}</div><p className="text-xs text-muted-foreground uppercase font-semibold">Reward Points</p></div>
                            </div>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                            {loading ? (<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>) : sales.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-8"><FileText className="w-12 h-12 mb-4 opacity-50"/><p className="font-semibold">No Purchase History</p><p className="text-sm">This customer hasn't made any purchases yet.</p></div>) : (<div className="p-4 space-y-4"><AnimatePresence>{sales.map((sale, index) => (<motion.div key={sale.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}><Card className="bg-white dark:bg-slate-900 shadow-sm"><CardHeader className="flex flex-row justify-between items-center p-4"><div><CardTitle className="text-base">Bill #{sale.id.substring(0,8)}</CardTitle><CardDescription className="text-xs">{format(new Date(sale.created_at), 'dd MMM yyyy, h:mm a')}</CardDescription></div><div className="text-right"><p className="font-bold text-lg text-blue-600 dark:text-blue-400">{formatPrice(sale.total_amount)}</p><Badge variant="secondary">{sale.payment_method}</Badge></div></CardHeader><CardContent className="p-4 border-t"><p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Purchased Items</p><ul className="space-y-2">{sale.sale_items.map(item => (<li key={item.id} className="flex justify-between items-center text-sm border-b border-dashed pb-1 last:border-0 last:pb-0"><div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 w-6 h-6 flex items-center justify-center rounded-md">{item.quantity}x</span><span className="font-medium">{item.product?.name || 'Unknown Item'}</span></div><span className="font-medium">{formatPrice(item.total_price)}</span></li>))}</ul></CardContent></Card></motion.div>))}</AnimatePresence></div>)}
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
};

const PosCustomers = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [customers, setCustomers] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'last_purchase_date', direction: 'desc' });
    const [businessName, setBusinessName] = useState("Our Shop");

    const fetchCustomers = useCallback(async () => {
        if (!user) return;
        const { data: profileData } = await supabase.from('profiles').select('business_name').eq('id', user.id).single();
        if (profileData?.business_name) { setBusinessName(profileData.business_name); }
        
        const { data, error } = await supabase.from('point_of_sale_customers').select('*').eq('user_id', user.id);

        if (error) {
            console.error(error);
            toast({ title: 'Error fetching customers', description: error.message, variant: 'destructive' });
        } else {
            setCustomers(data || []);
        }
    }, [user, toast]);

    useEffect(() => { fetchCustomers() }, [fetchCustomers]);

    const handleSuccess = () => {
        setIsFormOpen(false);
        setEditingCustomer(null);
        fetchCustomers();
    };

    const handleEdit = (e, customer) => { e.stopPropagation(); setEditingCustomer(customer); setIsFormOpen(true); };
    const handleDelete = async (e, customerId) => { e.stopPropagation(); if (!window.confirm("Are you sure? This will delete the customer record.")) return; const { error } = await supabase.from('point_of_sale_customers').delete().eq('id', customerId); if (error) toast({ title: 'Error deleting customer', description: error.message, variant: 'destructive' }); else { toast({ title: 'Customer deleted' }); fetchCustomers(); } };
    const handleRowClick = (customer) => { setSelectedCustomer(customer); setIsDetailViewOpen(true); };
    const handleSort = (key) => { let direction = 'asc'; if (sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; } setSortConfig({ key, direction }); };

    const sortedCustomers = useMemo(() => {
        let sortableItems = [...customers];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (sortConfig.key === 'last_accessed_at') { aValue = a.last_accessed_at || ''; bValue = b.last_accessed_at || ''; }
                if (aValue === null || aValue === undefined) aValue = '';
                if (bValue === null || bValue === undefined) bValue = '';
                if (aValue < bValue) { return sortConfig.direction === 'asc' ? -1 : 1; }
                if (aValue > bValue) { return sortConfig.direction === 'asc' ? 1 : -1; }
                return 0;
            });
        }
        return sortableItems;
    }, [customers, sortConfig]);

    const filteredCustomers = sortedCustomers.filter(c => 
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.phone || '').includes(searchTerm) ||
        (c.firm_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const SortIcon = ({ columnKey }) => { if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground opacity-50" />; return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-foreground" /> : <ArrowDown className="ml-2 h-4 w-4 text-foreground" />; };
    const SortableHeader = ({ columnKey, label, className = "" }) => ( <TableHead className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none ${className}`} onClick={() => handleSort(columnKey)}> <div className={`flex items-center ${className.includes("text-right") ? "justify-end" : ""}`}> {label} <SortIcon columnKey={columnKey} /> </div> </TableHead> );

    return (
        <div className="min-h-full pb-20 p-4 sm:p-6 space-y-6">
            <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/60 dark:supports-[backdrop-filter]:bg-slate-950/60 pb-4 pt-2 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-4 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
                     <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingCustomer(null); }}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Add Customer</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>{editingCustomer ? 'Edit' : 'Add'} Customer</DialogTitle></DialogHeader>
                            <CustomerForm customer={editingCustomer} onSuccess={handleSuccess} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            
            <SummaryCards customers={customers} />
            
            <div className="flex items-center gap-2 max-w-sm">
                 <div className="relative w-full">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                     <Input placeholder="Search by name, phone or firm..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                 </div>
            </div>

             <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl">Customer List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHeader columnKey="name" label="Customer Details" className="w-[200px]" />
                                    <SortableHeader columnKey="firm_name" label="Firm / GST" className="hidden sm:table-cell" />
                                    <SortableHeader columnKey="total_purchases" label="Visits" />
                                    <SortableHeader columnKey="loyalty_points" label="Points" />
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No customers found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCustomers.map(c => {
                                        return (
                                            <TableRow key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer" onClick={() => handleRowClick(c)}>
                                                <TableCell>
                                                    <div className="font-medium text-slate-900 dark:text-slate-100">{c.name}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">
                                                    {c.firm_name ? <div className="font-semibold text-slate-700">{c.firm_name}</div> : <span className="text-xs text-slate-400">-</span>}
                                                    {c.customer_gstin && <div className="text-[10px] text-slate-500 font-mono">{c.customer_gstin}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2"><span className="font-semibold">{c.total_purchases || 0}</span></div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5"><Coins className="h-4 w-4 text-yellow-500" /><span className="font-bold text-yellow-600 dark:text-yellow-500">{c.loyalty_points || 0}</span></div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <WhatsAppButton customer={c} businessName={businessName} />
                                                        <Button variant="ghost" size="icon" onClick={(e) => handleEdit(e, c)}><Edit className="h-4 w-4 text-slate-500 hover:text-blue-600" /></Button>
                                                        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, c.id)}><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" /></Button>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <CustomerDetailView customer={selectedCustomer} businessName={businessName} isOpen={isDetailViewOpen} onClose={() => setIsDetailViewOpen(false)} />
        </div>
    );
};

export default PosCustomers;