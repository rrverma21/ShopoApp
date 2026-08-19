import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import CustomDatePicker from '@/components/CustomDatePicker';
import SupplierModal from '@/components/retailer/suppliers/SupplierModal';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Plus, Trash2, CalendarPlus as CalendarIcon, Loader2, Save, DownloadCloud, Search, Settings, List, DollarSign, CreditCard, Activity, Edit, Barcode, AlertTriangle, Camera, X, Send, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { format, getMonth, getYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import BillDetailsModal from '@/components/pos/BillDetailsModal';
import VariantSelectorModal from '@/components/pos/VariantSelectorModal';
import ProductListModal from '@/components/pos/ProductListModal';
import BarcodeScannerModal from '@/components/pos/BarcodeScannerModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useRegion } from '@/contexts/RegionContext';
import { formatCurrency } from '@/utils/currencyFormatter';

const PurchaseBillsDashboard = ({ user }) => {
    const { toast } = useToast();
    const { currentRegion, regionConfig } = useRegion();
    const [rawBills, setRawBills] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterYear, setFilterYear] = useState('all');
    const [filterSupplier, setFilterSupplier] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [updateAmountPaid, setUpdateAmountPaid] = useState('');
    const [updateStatus, setUpdateStatus] = useState('');
    const [updatePaymentMode, setUpdatePaymentMode] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedDetailsBillId, setSelectedDetailsBillId] = useState(null);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
    const months = [
        { value: '0', label: 'January' }, { value: '1', label: 'February' },
        { value: '2', label: 'March' }, { value: '3', label: 'April' },
        { value: '4', label: 'May' }, { value: '5', label: 'June' },
        { value: '6', label: 'July' }, { value: '7', label: 'August' },
        { value: '8', label: 'September' }, { value: '9', label: 'October' },
        { value: '10', label: 'November' }, { value: '11', label: 'December' }
    ];

    const fetchDashboardBills = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const query = supabase
                .from('purchase_bills')
                .select('id, bill_no, bill_date, total_amount, amount_paid, balance_due, payment_status, suppliers(name)')
                .eq('user_id', user.id)
                .neq('status', 'draft')
                .order('bill_date', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            
            const processedData = (data || []).map(b => ({
                ...b,
                amount_paid: b.amount_paid || 0,
                balance_due: b.balance_due !== null ? b.balance_due : (b.total_amount - (b.amount_paid || 0)),
                payment_status: b.payment_status || (b.total_amount <= (b.amount_paid || 0) ? 'Paid' : 'Unpaid')
            }));

            setRawBills(processedData);
        } catch (err) {
            console.error('Error fetching dashboard bills:', err);
            toast({ title: 'Error', description: 'Failed to load purchase bills.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchDashboardBills();
    }, [fetchDashboardBills]);

    const uniqueSuppliers = React.useMemo(() => {
        const counts = rawBills.reduce((acc, bill) => {
            const name = bill.suppliers?.name;
            if (name) acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(counts).sort().map(name => ({ name, count: counts[name] }));
    }, [rawBills]);

    const filteredBills = React.useMemo(() => {
        return rawBills.filter(b => {
            if (filterYear !== 'all' && getYear(new Date(b.bill_date)) !== parseInt(filterYear)) return false;
            if (filterMonth !== 'all' && getMonth(new Date(b.bill_date)) !== parseInt(filterMonth)) return false;
            if (filterSupplier !== 'all' && b.suppliers?.name !== filterSupplier) return false;
            
            if (filterStatus !== 'all') {
                const isPaid = b.payment_status === 'Paid';
                if (filterStatus === 'Paid' && !isPaid) return false;
                if (filterStatus === 'Pending' && isPaid) return false;
            }

            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matchBillNo = b.bill_no?.toLowerCase().includes(searchLower);
                const matchSupplier = b.suppliers?.name?.toLowerCase().includes(searchLower);
                const matchAmount = b.total_amount?.toString().includes(searchLower);
                const matchDateStr = format(new Date(b.bill_date), 'MMM dd, yyyy').toLowerCase().includes(searchLower);
                const matchDateRaw = b.bill_date?.includes(searchLower);
                if (!matchBillNo && !matchSupplier && !matchAmount && !matchDateStr && !matchDateRaw) return false;
            }
            return true;
        });
    }, [rawBills, filterYear, filterMonth, filterSupplier, filterStatus, searchTerm]);

    const summary = React.useMemo(() => {
        return filteredBills.reduce((acc, bill) => {
            acc.totalAmount += Number(bill.total_amount || 0);
            acc.totalPaid += Number(bill.amount_paid || 0);
            acc.totalDue += Number(bill.balance_due || 0);
            if (bill.payment_status === 'Paid') acc.paidCount++;
            else acc.pendingCount++;
            return acc;
        }, { totalAmount: 0, totalPaid: 0, totalDue: 0, paidCount: 0, pendingCount: 0 });
    }, [filteredBills]);

    const openUpdateModal = (bill) => {
        setSelectedBill(bill);
        setUpdateAmountPaid(bill.amount_paid?.toString() || '0');
        setUpdateStatus(bill.payment_status || 'Unpaid');
        setUpdatePaymentMode(bill.payment_mode || '');
        setIsUpdateModalOpen(true);
    };

    const handleUpdatePayment = async () => {
        if (!selectedBill) return;
        if (!updatePaymentMode) {
            toast({ title: "Validation Error", description: "Please select a payment mode.", variant: "destructive" });
            return;
        }
        setIsUpdating(true);
        try {
            const amountPaidNum = parseFloat(updateAmountPaid) || 0;
            const balanceDueNum = Math.max(0, selectedBill.total_amount - amountPaidNum);
            let finalStatus = updateStatus;
            if (amountPaidNum >= selectedBill.total_amount) finalStatus = 'Paid';

            const { error } = await supabase.from('purchase_bills').update({
                amount_paid: amountPaidNum,
                balance_due: balanceDueNum,
                payment_status: finalStatus,
                payment_mode: updatePaymentMode
            }).eq('id', selectedBill.id);

            if (error) throw error;
            
            toast({ title: 'Success', description: 'Payment details updated successfully.' });
            setIsUpdateModalOpen(false);
            setUpdatePaymentMode('');
            fetchDashboardBills();
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to update payment.', variant: 'destructive' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRowClick = (billId) => {
        setSelectedDetailsBillId(billId);
        setIsDetailsModalOpen(true);
    };

    return (
        <div className="space-y-4 sm:space-y-6 relative">
            <div className="space-y-3 sm:space-y-4 bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search by bill number, supplier, date..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-10 bg-white dark:bg-slate-950 h-11 sm:h-10 w-full shadow-sm text-base"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Clear search">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                    <div className="space-y-1.5 flex-1 min-w-full sm:min-w-[200px]">
                        <Label className="text-xs text-slate-500 font-medium">Supplier</Label>
                        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                            <SelectTrigger className="bg-white dark:bg-slate-950 h-11 sm:h-9 shadow-sm"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Suppliers</SelectItem>
                                {uniqueSuppliers.map(s => (<SelectItem key={s.name} value={s.name}>{s.name} ({s.count})</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-full sm:min-w-[140px]">
                        <Label className="text-xs text-slate-500 font-medium">Status</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="bg-white dark:bg-slate-950 h-11 sm:h-9 shadow-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Paid">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-full sm:min-w-[140px]">
                        <Label className="text-xs text-slate-500 font-medium">Year</Label>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                            <SelectTrigger className="bg-white dark:bg-slate-950 h-11 sm:h-9 shadow-sm"><SelectValue placeholder="All Years" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Years</SelectItem>
                                {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-full sm:min-w-[140px]">
                        <Label className="text-xs text-slate-500 font-medium">Month</Label>
                        <Select value={filterMonth} onValueChange={setFilterMonth}>
                            <SelectTrigger className="bg-white dark:bg-slate-950 h-11 sm:h-9 shadow-sm"><SelectValue placeholder="All Months" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
                                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto mt-auto">
                        <Button variant="secondary" className="flex-1 sm:flex-none h-11 sm:h-9 border-slate-200 dark:border-slate-700 shadow-sm" onClick={() => { setFilterStatus('all'); setFilterMonth('all'); setFilterYear('all'); setFilterSupplier('all'); setSearchTerm(''); }}>
                            Reset Filters
                        </Button>
                    </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-1">
                    Showing <span className="text-slate-900 dark:text-slate-100">{filteredBills.length}</span> of {rawBills.length} bills
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-100 dark:border-red-900/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">Pending Bills</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{summary.pendingCount}</h3>
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/50 p-2 sm:p-3 rounded-full"><Activity className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" /></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-100 dark:border-green-900/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">Paid Bills</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{summary.paidCount}</h3>
                        </div>
                        <div className="bg-green-100 dark:bg-green-900/50 p-2 sm:p-3 rounded-full"><CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" /></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-100 dark:border-blue-900/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Total Paid</p>
                            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(summary.totalPaid, currentRegion)}</h3>
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 sm:p-3 rounded-full"><DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" /></div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 border-purple-100 dark:border-purple-900/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400">Total Due</p>
                            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(summary.totalDue, currentRegion)}</h3>
                        </div>
                        <div className="bg-purple-100 dark:bg-purple-900/50 p-2 sm:p-3 rounded-full"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" /></div>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-lg sm:rounded-xl border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[500px] w-full">
                    <div className="min-w-[1024px]">
                        <Table>
                            <TableHeader className="bg-white dark:bg-slate-950 border-b sticky top-0 z-10 shadow-sm">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[160px] font-bold text-slate-800 dark:text-slate-200 py-4 text-left">Bill No</TableHead>
                                    <TableHead className="w-[120px] font-bold text-slate-800 dark:text-slate-200 py-4 text-left">Date</TableHead>
                                    <TableHead className="w-[250px] font-bold text-slate-800 dark:text-slate-200 py-4 text-left">Supplier</TableHead>
                                    <TableHead className="w-[140px] font-bold text-slate-800 dark:text-slate-200 py-4 text-right">Total Amount</TableHead>
                                    <TableHead className="w-[140px] font-bold text-slate-800 dark:text-slate-200 py-4 text-right">Paid Amount</TableHead>
                                    <TableHead className="w-[140px] font-bold text-slate-800 dark:text-slate-200 py-4 text-right">Balance Due</TableHead>
                                    <TableHead className="w-[120px] font-bold text-slate-800 dark:text-slate-200 py-4 text-center">Status</TableHead>
                                    <TableHead className="w-[100px] font-bold text-slate-800 dark:text-slate-200 py-4 text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center">
                                            <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-2" />
                                            <p className="text-sm text-slate-500">Loading bills...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBills.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center text-slate-500">
                                            <List className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                                            <p className="text-base font-medium text-slate-700 dark:text-slate-300">No purchase bills found matching your criteria.</p>
                                            <p className="text-sm mt-1">Try adjusting or resetting your filters.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBills.map((bill) => (
                                        <TableRow key={bill.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800" onClick={() => handleRowClick(bill.id)}>
                                            <TableCell className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[160px] text-left py-4 text-sm">{bill.bill_no}</TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400 whitespace-nowrap text-left py-4 text-sm">{format(new Date(bill.bill_date), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300 truncate max-w-[250px] text-left py-4 text-sm">{bill.suppliers?.name || 'Unknown'}</TableCell>
                                            <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100 py-4 text-sm">{formatCurrency(bill.total_amount, currentRegion)}</TableCell>
                                            <TableCell className="text-right text-green-600 dark:text-green-400 font-medium py-4 text-sm">{formatCurrency(bill.amount_paid, currentRegion)}</TableCell>
                                            <TableCell className="text-right text-red-600 dark:text-red-400 font-medium py-4 text-sm">{formatCurrency(bill.balance_due, currentRegion)}</TableCell>
                                            <TableCell className="text-center py-4">
                                                <span className={cn(
                                                    "inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold border min-w-[80px]",
                                                    bill.payment_status === 'Paid' 
                                                        ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50" 
                                                        : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50"
                                                )}>
                                                    {bill.payment_status === 'Paid' ? 'Paid' : 'Pending'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openUpdateModal(bill); }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 h-8 w-8">
                                                                <Edit className="w-4 h-4" />
                                                                <span className="sr-only">Update Payment</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Update Payment Status</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="md:hidden space-y-3 p-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                            <p className="text-sm text-slate-500">Loading bills...</p>
                        </div>
                    ) : filteredBills.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <List className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                            <p className="text-base font-medium text-slate-700 dark:text-slate-300">No purchase bills found</p>
                            <p className="text-sm mt-1">Try adjusting your filters</p>
                        </div>
                    ) : (
                        filteredBills.map((bill) => (
                            <Card key={bill.id} className="border-l-4" style={{ borderLeftColor: bill.payment_status === 'Paid' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)' }} onClick={() => handleRowClick(bill.id)}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{bill.bill_no}</div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{format(new Date(bill.bill_date), 'MMM dd, yyyy')}</div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 mt-1 truncate">{bill.suppliers?.name || 'Unknown'}</div>
                                        </div>
                                        <span className={cn(
                                            "inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap min-w-[70px]",
                                            bill.payment_status === 'Paid' 
                                                ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50" 
                                                : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50"
                                        )}>
                                            {bill.payment_status === 'Paid' ? 'Paid' : 'Pending'}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Total Amount</div>
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(bill.total_amount, currentRegion)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Paid</div>
                                            <div className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(bill.amount_paid, currentRegion)}</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Balance Due</div>
                                            <div className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(bill.balance_due, currentRegion)}</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="flex-1 h-11"
                                            onClick={(e) => { e.stopPropagation(); openUpdateModal(bill); }}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Update Payment
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">Update Payment Details</DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed">
                            Update the payment status and amount paid for Bill No: <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedBill?.bill_no}</span>
                        </DialogDescription>
                    </DialogHeader>
                    {selectedBill && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-lg border">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Total Amount</p>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-1">{formatCurrency(selectedBill.total_amount, currentRegion)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Current Balance</p>
                                    <p className="font-semibold text-red-600 dark:text-red-400 text-sm sm:text-base mt-1">{formatCurrency(selectedBill.balance_due, currentRegion)}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="amount_paid" className="text-sm sm:text-base">Amount Paid ({regionConfig.currency.symbol})</Label>
                                <Input id="amount_paid" type="number" min="0" max={selectedBill.total_amount} step="0.01" value={updateAmountPaid} onChange={(e) => setUpdateAmountPaid(e.target.value)} className="bg-white dark:bg-slate-950 h-11 sm:h-10 text-base" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm sm:text-base">Payment Status</Label>
                                <Select value={updateStatus} onValueChange={setUpdateStatus}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950 h-11 sm:h-10"><SelectValue placeholder="Select Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Paid">Paid</SelectItem>
                                        <SelectItem value="Unpaid">Pending / Unpaid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-sm sm:text-base">Payment Mode <span className="text-red-500">*</span></Label>
                                <Select value={updatePaymentMode} onValueChange={setUpdatePaymentMode}>
                                    <SelectTrigger className="bg-white dark:bg-slate-950 h-11 sm:h-10"><SelectValue placeholder="Select Payment Mode" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="UPI">UPI</SelectItem>
                                        <SelectItem value="Cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setIsUpdateModalOpen(false)} className="w-full sm:w-auto h-11 sm:h-10">Cancel</Button>
                        <Button type="button" onClick={handleUpdatePayment} disabled={isUpdating} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white h-11 sm:h-10">
                            {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BillDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} billId={selectedDetailsBillId} onUpdatePayment={openUpdateModal} />
        </div>
    );
};

const MobileBillItemCard = ({ row, updateRow, removeRow, handleProductSearchChange, handleProductSelect, setIsProductListModalOpen, discountType, rowsLength, desktopPopoverRef, mobilePopoverRef, currentRegion, regionConfig }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const qty = parseFloat(row.quantity) || 0;
    const rate = parseFloat(row.rate) || 0;
    const discount = parseFloat(row.discount) || 0;
    const grossAmount = qty * rate;
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = (grossAmount * discount) / 100;
    } else {
        discountAmount = discount;
    }
    
    const amount = grossAmount - discountAmount;

    const handleProductSelectInternal = (product) => {
        handleProductSelect(row.id, product);
        setIsPopoverOpen(false);
    };

    return (
        <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-11 text-sm bg-[#FFFFFF] border-slate-300 text-slate-900 hover:bg-slate-50 dark:bg-[#FFFFFF] dark:border-slate-300 dark:text-slate-900 dark:hover:bg-slate-50">
                                    <span className="truncate">{row.productSearch || "Select Product"}</span>
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                                ref={mobilePopoverRef}
                                className="w-80 p-0 z-[100] bg-[#FFFFFF] border-slate-200 shadow-xl dark:bg-[#FFFFFF] dark:border-slate-200 rounded-md" 
                                align="start"
                                side="bottom"
                                sideOffset={4}
                                onInteractOutside={(e) => e.preventDefault()}
                                onOpenAutoFocus={(e) => e.preventDefault()}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-2 space-y-2 bg-[#FFFFFF] rounded-md">
                                    <Input 
                                        placeholder="Search products..." 
                                        value={row.productSearch} 
                                        onChange={(e) => handleProductSearchChange(e.target.value, row.id)} 
                                        className="h-11 text-base bg-[#FFFFFF] border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500 dark:bg-[#FFFFFF] dark:border-slate-300 dark:text-slate-900 dark:placeholder:text-slate-500" 
                                        autoFocus
                                    />
                                    <div className="max-h-60 overflow-y-auto space-y-1 bg-[#FFFFFF] border border-slate-100 dark:border-slate-200 rounded-md">
                                        {row.productsList.length === 0 ? (
                                            <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-500">
                                                {row.productSearch ? 'No products found' : 'Start typing to search'}
                                            </div>
                                        ) : (
                                            row.productsList.map(p => (
                                                <Button 
                                                    key={p.id} 
                                                    variant="ghost" 
                                                    className="w-full justify-start h-11 text-sm text-slate-900 bg-[#FFFFFF] border-b border-slate-100 last:border-0 rounded-none hover:bg-blue-600 hover:text-white dark:text-slate-900 dark:bg-[#FFFFFF] dark:hover:bg-blue-600 dark:hover:text-white transition-colors" 
                                                    onClick={() => handleProductSelectInternal(p)}
                                                >
                                                    {p.name} {p.variants?.length > 0 && `(${p.variants.length} variants)`}
                                                </Button>
                                            ))
                                        )}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        className="w-full h-11 font-medium bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200 dark:bg-slate-100 dark:border-slate-300 dark:text-slate-900 dark:hover:bg-slate-200" 
                                        onClick={() => {
                                            setIsProductListModalOpen(true);
                                            setIsPopoverOpen(false);
                                        }}
                                    >
                                        <List className="w-4 h-4 mr-2" /> Browse All
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        {row.variant_name && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Variant: {row.variant_name}</div>
                        )}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="min-w-[44px] min-h-[44px] shrink-0"
                    >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Quantity</Label>
                        <Input type="number" min="0" value={row.quantity} onChange={(e) => updateRow(row.id, 'quantity', e.target.value)} placeholder="Qty" className="h-11 text-base" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Rate ({regionConfig.currency.symbol})</Label>
                        <Input type="number" min="0" step="0.01" value={row.rate} onChange={(e) => updateRow(row.id, 'rate', e.target.value)} placeholder="Rate" className="h-11 text-base" />
                    </div>
                </div>

                {isExpanded && (
                    <div className="space-y-3 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Brand</Label>
                                <Input value={row.brand} onChange={(e) => updateRow(row.id, 'brand', e.target.value)} placeholder="Brand" className="h-11 text-base" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">SKU</Label>
                                <Input value={row.sku} readOnly placeholder="SKU" className="bg-slate-50 dark:bg-slate-800/50 h-11 text-base" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Batch No</Label>
                                <Input value={row.batchNo} onChange={(e) => updateRow(row.id, 'batchNo', e.target.value)} placeholder="Batch" className="h-11 text-base" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Expiry Date</Label>
                                <CustomDatePicker date={row.expiryDate} onDateChange={(date) => updateRow(row.id, 'expiryDate', date)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">{regionConfig.tax.name} %</Label>
                                <Input type="number" min="0" step="0.01" value={row.gst} onChange={(e) => updateRow(row.id, 'gst', e.target.value)} placeholder={regionConfig.tax.name} className="h-11 text-base" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">MRP ({regionConfig.currency.symbol})</Label>
                                <Input type="number" min="0" step="0.01" value={row.mrp} onChange={(e) => updateRow(row.id, 'mrp', e.target.value)} placeholder="MRP" className="h-11 text-base" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">{discountType === 'percentage' ? 'Discount (%)' : `Discount (${regionConfig.currency.symbol})`}</Label>
                            <Input 
                                type="number" 
                                min="0" 
                                max={discountType === 'percentage' ? 100 : undefined}
                                step="0.01" 
                                value={row.discount} 
                                onChange={(e) => updateRow(row.id, 'discount', e.target.value)} 
                                placeholder={discountType === 'percentage' ? 'Enter %' : `Enter ${regionConfig.currency.symbol}`}
                                className="h-11 text-base"
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                        <div className="text-xs text-slate-500">Line Total</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(amount, currentRegion)}</div>
                    </div>
                    <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => removeRow(row.id)} 
                        disabled={rowsLength === 1}
                        className="min-w-[44px] min-h-[44px]"
                    >
                        <Trash2 className="w-5 h-5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const PurchaseBillEntry = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentRegion, regionConfig } = useRegion();
  
  const [supplierSearch, setSupplierSearch] = useState('');
  const debouncedSupplierSearch = useDebounce(supplierSearch, 300);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductListModalOpen, setIsProductListModalOpen] = useState(false);
  
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(new Date());
  const [roundOffAmount, setRoundOffAmount] = useState('0');
  const [discountType, setDiscountType] = useState('percentage');
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const barcodeInputRef = useRef(null);
  
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantModalProduct, setVariantModalProduct] = useState(null);
  const [openPopoverRowId, setOpenPopoverRowId] = useState(null);
  
  const desktopPopoverRef = useRef(null);
  const mobilePopoverRef = useRef(null);
  
  const createEmptyRow = () => ({
    id: Date.now().toString() + Math.random().toString(),
    productSearch: '',
    selectedProduct: null,
    productsList: [],
    brand: '',
    sku: '',
    quantity: '',
    batchNo: '',
    expiryDate: null,
    gst: 0,
    mrp: 0,
    rate: '',
    discount: '0',
    variant_id: null,
    variant_name: null,
  });

  const [rows, setRows] = useState([createEmptyRow()]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [isAllBillsModalOpen, setIsAllBillsModalOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [currentBillId, setCurrentBillId] = useState(null);
  const [isDraftsLoading, setIsDraftsLoading] = useState(false);
  
  const [isBatchWarningOpen, setIsBatchWarningOpen] = useState(false);
  const [pendingSaveParams, setPendingSaveParams] = useState(null);

  const searchTimeout = useRef(null);

  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (saveError) {
      setSaveError(null);
    }
  }, [selectedSupplier, billNo]);

  const fetchSuppliers = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase
        .from('suppliers')
        .select('id, name')
        .eq('seller_id', user.id)
        .order('name', { ascending: true })
        .limit(50);
        
      if (debouncedSupplierSearch) {
        query = query.ilike('name', `%${debouncedSupplierSearch}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  }, [user, debouncedSupplierSearch]);

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers]);

  const handleSuppliersChange = () => fetchSuppliers();

  const handleBillNoBlur = async () => {
    if (!billNo || !selectedSupplier) return;
    try {
      let query = supabase.from('purchase_bills').select('id').eq('supplier_id', selectedSupplier.id).eq('bill_no', billNo);
      if (currentBillId) query = query.neq('id', currentBillId);
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) {
        toast({ title: "Duplicate Bill No", description: "This Bill No. already exists for the selected supplier.", variant: "destructive" });
        setBillNo('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addRow = () => setRows([...rows, createEmptyRow()]);
  const removeRow = (id) => setRows(rows.filter(r => r.id !== id));
  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const fetchProductsForRow = async (search, rowId) => {
      if (!user) return;
      try {
          let query = supabase.from('point_of_sale_products').select(`id, name, sku, stock_level, selling_price, cost_price, tax_rate, category, variants`).eq('user_id', user.id).eq('archived', false).limit(50);
          if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
          const { data, error } = await query;
          if (error) throw error;
          setRows(prev => prev.map(r => r.id === rowId ? { ...r, productsList: data || [] } : r));
      } catch (err) {
          console.error('[Product Search] Error fetching POS products:', err);
          toast({ title: 'Search Error', description: 'Failed to search products. Please try again.', variant: 'destructive' });
      }
  };

  const handleProductSearchChange = (val, rowId) => {
      updateRow(rowId, 'productSearch', val);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => fetchProductsForRow(val, rowId), 300);
  };

  const addProductToRow = (rowId, product, variantId = null, variantName = null, quantity = 1) => {
    const brandName = product.category || 'N/A';
    const defaultMrp = product.selling_price || 0;
    const defaultGst = product.tax_rate || 0;
    const defaultRate = product.cost_price || 0;
    
    setRows(prev => prev.map(r => {
      if (r.id === rowId) {
        const displayName = variantName ? `${product.name} - ${variantName}` : product.name;
        return {
          ...r,
          selectedProduct: product,
          productSearch: displayName,
          brand: brandName,
          sku: product.sku || '',
          mrp: defaultMrp,
          gst: defaultGst,
          rate: defaultRate.toString(),
          quantity: quantity.toString(),
          variant_id: variantId,
          variant_name: variantName,
          discount: '0'
        };
      }
      return r;
    }));
    
    if (variantName) {
      toast({ title: 'Success', description: `Variant ${variantName} added successfully` });
    } else {
      toast({ title: 'Product Added', description: `${product.name} added to bill` });
    }
  };

  const handleProductSelect = (rowId, product) => {
      if (product.variants && product.variants.length > 0) {
          setVariantModalProduct(product);
          setVariantModalProduct({ ...product, targetRowId: rowId });
          setIsVariantModalOpen(true);
          return;
      }
      addProductToRow(rowId, product);
  };

  const handleVariantConfirm = (selectedVariant, selectedQuantity) => {
      if (!variantModalProduct) return;
      const rowId = variantModalProduct.targetRowId;
      if (!rowId) return;
      
      addProductToRow(rowId, variantModalProduct, selectedVariant.id, selectedVariant.name, selectedQuantity);
      setIsVariantModalOpen(false);
      setVariantModalProduct(null);
      
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
  };

  const searchProductByBarcode = async (codeToSearch) => {
    if (!codeToSearch.trim()) return;
    setIsSearching(true);
    setBarcodeInput('');
    try {
      const barcode = codeToSearch.trim();
      let { data, error } = await supabase.from('point_of_sale_products').select('*').eq('barcode', barcode).eq('user_id', user.id).eq('archived', false).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      let foundVariant = null;
      if (!data) {
        try {
          const { data: jsonbData, error: jsonbError } = await supabase.from('point_of_sale_products').select('*').eq('user_id', user.id).eq('archived', false).contains('variants', `[{"barcode": "${barcode}"}]`).maybeSingle();
          if (jsonbError && jsonbError.code !== 'PGRST116') console.warn('Variant search error:', jsonbError);
          if (jsonbData) {
              data = jsonbData;
              foundVariant = (jsonbData.variants || []).find(v => v.barcode === barcode || v.sku === barcode);
          }
        } catch (vJsonErr) {
            console.warn('Fallback variant search failed (JSONB):', vJsonErr);
        }
      }
      if (!data) {
        toast({ title: 'Product Not Found', description: `No product or variant found with barcode: ${barcode}`, variant: 'destructive' });
        return;
      }
      setRows(prevRows => {
          const newRows = [...prevRows];
          const lastRow = newRows[newRows.length - 1];
          if (foundVariant) {
            const targetRowId = lastRow.selectedProduct ? (Date.now().toString() + Math.random().toString()) : lastRow.id;
            if (lastRow.selectedProduct) newRows.push({ ...createEmptyRow(), id: targetRowId });
            setTimeout(() => addProductToRow(targetRowId, data, foundVariant.id, foundVariant.name, 1), 0);
          } else if (data.variants && data.variants.length > 0) {
            setVariantModalProduct({ ...data, targetRowId: lastRow.id });
            setIsVariantModalOpen(true);
          } else {
            if (lastRow.selectedProduct) {
              const newRowId = Date.now().toString() + Math.random().toString();
              const newRow = { ...createEmptyRow(), id: newRowId };
              newRows.push(newRow);
              setTimeout(() => addProductToRow(newRowId, data), 0);
            } else {
              setTimeout(() => addProductToRow(lastRow.id, data), 0);
            }
          }
          return newRows;
      });
    } catch (err) {
      console.error('Error searching product by barcode:', err);
      toast({ title: 'Search Error', description: 'Failed to search product. Please try again.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    }
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    await searchProductByBarcode(barcodeInput);
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  };

  const handleScanSuccess = (code) => {
    setIsScannerOpen(false);
    searchProductByBarcode(code);
  };

  const fetchDrafts = async () => {
    if (!user) return;
    setIsDraftsLoading(true);
    try {
      const { data, error } = await supabase.from('purchase_bills').select('id, bill_no, bill_date, supplier_id, suppliers(name), items').eq('user_id', user.id).eq('status', 'draft').order('created_at', { ascending: false });
      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error('Error fetching drafts:', err);
      toast({ title: 'Error', description: 'Failed to load drafts.', variant: 'destructive' });
    } finally {
      setIsDraftsLoading(false);
    }
  };

  useEffect(() => {
    if (isDraftsModalOpen) fetchDrafts();
  }, [isDraftsModalOpen, user]);

  const loadDraft = async (draft) => {
    setIsLoading(true);
    try {
      const supplier = await supabase.from('suppliers').select('id, name').eq('id', draft.supplier_id).single();
      if (supplier.data) setSelectedSupplier(supplier.data);
      setBillNo(draft.bill_no);
      setBillDate(new Date(draft.bill_date));
      setCurrentBillId(draft.id);
      
      const items = draft.items || [];
      if (items.length === 0) {
        setRows([createEmptyRow()]);
        toast({ title: 'Draft Loaded', description: 'Draft loaded but contains no items.' });
        setIsDraftsModalOpen(false);
        setIsLoading(false);
        return;
      }
      
      const newRows = [];
      const missingProducts = [];
      
      for (const item of items) {
        try {
          const { data: product, error } = await supabase.from('point_of_sale_products').select('*').eq('id', item.product_id).eq('user_id', user.id).maybeSingle();
          if (error && error.code !== 'PGRST116') console.error('Error fetching product:', error);
          if (!product) { missingProducts.push(item.product_name || 'Unknown Product'); continue; }
          const newRow = {
            id: Date.now().toString() + Math.random().toString(),
            productSearch: item.variant_name ? `${product.name} - ${item.variant_name}` : product.name,
            selectedProduct: product,
            productsList: [],
            brand: product.category || 'N/A',
            sku: product.sku || '',
            quantity: (item.quantity || 0).toString(),
            batchNo: item.batch_no || '',
            expiryDate: item.expiry_date ? new Date(item.expiry_date) : null,
            gst: item.gst_percentage || 0,
            mrp: product.selling_price || 0,
            rate: (item.rate || 0).toString(),
            discount: (item.discount || 0).toString(),
            variant_id: item.variant_id || null,
            variant_name: item.variant_name || null
          };
          newRows.push(newRow);
        } catch (err) {
          console.error('Error processing draft item:', err);
          missingProducts.push(item.product_name || 'Unknown Product');
        }
      }
      
      setRows(newRows.length > 0 ? newRows : [createEmptyRow()]);
      let message = 'Draft loaded successfully.';
      if (missingProducts.length > 0) {
        message = `Draft loaded. Warning: ${missingProducts.length} product(s) not found and were skipped: ${missingProducts.join(', ')}`;
        toast({ title: 'Draft Loaded with Warnings', description: message, variant: 'default' });
      } else {
        toast({ title: 'Draft Loaded', description: message });
      }
      setIsDraftsModalOpen(false);
    } catch (err) {
      console.error('Error loading draft:', err);
      toast({ title: 'Error', description: 'Failed to load draft.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
      if (!user || !selectedSupplier || !billNo) {
          toast({ title: "Validation Error", description: "Supplier and Bill No. are required to save draft.", variant: "destructive" });
          return;
      }
      setIsSaving(true);
      try {
          const draftData = {
              user_id: user.id,
              supplier_id: selectedSupplier.id,
              bill_no: billNo,
              bill_date: format(billDate, 'yyyy-MM-dd'),
              status: 'draft',
              items: rows.filter(r => r.selectedProduct).map(r => ({
                  product_id: r.selectedProduct.id,
                  product_name: r.selectedProduct.name,
                  quantity: parseInt(r.quantity) || 0,
                  batch_no: r.batchNo,
                  expiry_date: r.expiryDate ? format(r.expiryDate, 'yyyy-MM-dd') : null,
                  gst_percentage: r.gst,
                  rate: parseFloat(r.rate) || 0,
                  discount: parseFloat(r.discount) || 0,
                  variant_id: r.variant_id,
                  variant_name: r.variant_name
              }))
          };
          if (currentBillId) {
              const { error } = await supabase.from('purchase_bills').update(draftData).eq('id', currentBillId);
              if (error) throw error;
              toast({ title: "Draft Updated", description: "Your draft has been updated successfully." });
          } else {
              const { data, error } = await supabase.from('purchase_bills').insert([draftData]).select().single();
              if (error) throw error;
              setCurrentBillId(data.id);
              toast({ title: "Draft Saved", description: "Your draft has been saved successfully." });
          }
      } catch (err) {
          console.error('Error saving draft:', err);
          toast({ title: "Error", description: "Failed to save draft.", variant: "destructive" });
      } finally {
          setIsSaving(false);
      }
  };

  const calculateTotals = () => {
      let subtotal = 0;
      let sgstTotal = 0;
      let cgstTotal = 0;
      let totalDiscountAmount = 0;
      rows.forEach(row => {
          if (!row.selectedProduct || !row.quantity || !row.rate) return;
          const qty = parseFloat(row.quantity) || 0;
          const rate = parseFloat(row.rate) || 0;
          const discount = parseFloat(row.discount) || 0;
          const gst = parseFloat(row.gst) || 0;
          const grossAmount = qty * rate;
          let discountAmount = 0;
          if (discountType === 'percentage') discountAmount = (grossAmount * discount) / 100;
          else discountAmount = discount;
          
          const amountAfterDiscount = grossAmount - discountAmount;
          const gstAmount = (amountAfterDiscount * gst) / 100;
          const sgst = gstAmount / 2;
          const cgst = gstAmount / 2;
          subtotal += amountAfterDiscount;
          totalDiscountAmount += discountAmount;
          sgstTotal += sgst;
          cgstTotal += cgst;
      });
      const roundOff = parseFloat(roundOffAmount) || 0;
      const grandTotal = subtotal + sgstTotal + cgstTotal + roundOff;
      return { subtotal, sgstTotal, cgstTotal, roundOff, grandTotal, totalDiscountAmount };
  };

  const checkDuplicateBill = async (supplier_id, bill_no) => {
      try {
          let query = supabase.from('purchase_bills').select('id').eq('supplier_id', supplier_id).eq('bill_no', bill_no);
          if (currentBillId) query = query.neq('id', currentBillId);
          const { data, error } = await query;
          if (error) return { isDuplicate: false, error: 'Failed to check for duplicates. Please try again.' };
          if (data && data.length > 0) return { isDuplicate: true, error: 'Bill with this number already exists for this supplier' };
          return { isDuplicate: false, error: null };
      } catch (err) {
          return { isDuplicate: false, error: 'Unexpected error during duplicate check. Please try again.' };
      }
  };

  const handleFinalSave = async () => {
      if (!user) {
          toast({ title: "Validation Error", description: "User not authenticated.", variant: "destructive" });
          return;
      }
      if (!selectedSupplier) {
          toast({ title: "Validation Error", description: "Please select a supplier.", variant: "destructive" });
          setSaveError("Please select a supplier");
          return;
      }
      if (!billNo || billNo.trim() === '') {
          toast({ title: "Validation Error", description: "Bill No. is required.", variant: "destructive" });
          setSaveError("Bill No. is required");
          return;
      }

      const duplicateCheck = await checkDuplicateBill(selectedSupplier.id, billNo);
      if (duplicateCheck.error) {
          setSaveError(duplicateCheck.error);
          toast({ title: "Duplicate Bill Detected", description: duplicateCheck.error, variant: "destructive" });
          return;
      }

      const validRows = rows.filter(r => r.selectedProduct && r.quantity && r.rate);
      if (validRows.length === 0) {
          toast({ title: "Validation Error", description: "At least one product with quantity and rate is required.", variant: "destructive" });
          setSaveError("At least one product with quantity and rate is required");
          return;
      }

      const missingBatchRows = validRows.filter(r => !r.batchNo || !r.expiryDate);
      if (missingBatchRows.length > 0) {
          setPendingSaveParams({ validRows });
          setIsBatchWarningOpen(true);
          return;
      }
      await performFinalSave({ validRows });
  };

  const performFinalSave = async ({ validRows }) => {
      setIsSaving(true);
      setSaveError(null);
      try {
          const totals = calculateTotals();
          const billData = {
              user_id: user.id,
              supplier_id: selectedSupplier.id,
              bill_no: billNo,
              bill_date: format(billDate, 'yyyy-MM-dd'),
              status: 'finalized',
              subtotal: totals.subtotal,
              sgst_total: totals.sgstTotal,
              cgst_total: totals.cgstTotal,
              total_amount: totals.grandTotal,
              round_off_amount: totals.roundOff,
              payment_status: 'Unpaid',
              amount_paid: 0,
              balance_due: totals.grandTotal,
              items: validRows.map(r => ({
                  product_id: r.selectedProduct.id,
                  product_name: r.selectedProduct.name,
                  quantity: parseInt(r.quantity) || 0,
                  batch_no: r.batchNo || null,
                  expiry_date: r.expiryDate ? format(r.expiryDate, 'yyyy-MM-dd') : null,
                  gst_percentage: parseFloat(r.gst) || 0,
                  rate: parseFloat(r.rate) || 0,
                  discount: parseFloat(r.discount) || 0,
                  variant_id: r.variant_id || null,
                  variant_name: r.variant_name || null
              }))
          };

          let billId = currentBillId;
          if (billId) {
              const { error } = await supabase.from('purchase_bills').update(billData).eq('id', billId);
              if (error) throw error;
          } else {
              const { data, error } = await supabase.from('purchase_bills').insert([billData]).select().single();
              if (error) throw error;
              billId = data.id;
          }

          const itemsData = validRows.map(r => {
              const qty = parseFloat(r.quantity) || 0;
              const rate = parseFloat(r.rate) || 0;
              const discount = parseFloat(r.discount) || 0;
              const gst = parseFloat(r.gst) || 0;
              const grossAmount = qty * rate;
              let discountAmount = 0;
              if (discountType === 'percentage') discountAmount = (grossAmount * discount) / 100;
              else discountAmount = discount;
              const amountAfterDiscount = grossAmount - discountAmount;
              return {
                  bill_id: billId,
                  product_id: r.selectedProduct.id,
                  quantity: qty,
                  batch_no: r.batchNo || null,
                  expiry_date: r.expiryDate ? format(r.expiryDate, 'yyyy-MM-dd') : null,
                  gst_percentage: gst,
                  rate: rate,
                  discount: discount,
                  amount: amountAfterDiscount,
                  variant_id: r.variant_id || null,
                  variant_name: r.variant_name || null
              };
          });

          const { error: itemsError } = await supabase.from('purchase_bill_items').delete().eq('bill_id', billId);
          if (itemsError) throw itemsError;

          const { error: insertError } = await supabase.from('purchase_bill_items').insert(itemsData);
          if (insertError) throw insertError;

          for (const row of validRows) {
              const qty = parseFloat(row.quantity) || 0;
              if (row.variant_id) {
                  const { data: product, error: fetchError } = await supabase.from('point_of_sale_products').select('variants').eq('id', row.selectedProduct.id).single();
                  if (fetchError) continue;
                  if (product?.variants) {
                      const updatedVariants = product.variants.map(v => {
                          if (v.id === row.variant_id) return { ...v, stock: (v.stock || 0) + qty };
                          return v;
                      });
                      await supabase.from('point_of_sale_products').update({ variants: updatedVariants }).eq('id', row.selectedProduct.id);
                  }
              } else {
                  const { data: currentProduct, error: fetchError } = await supabase.from('point_of_sale_products').select('stock_level').eq('id', row.selectedProduct.id).single();
                  if (fetchError) continue;
                  const newStock = (currentProduct.stock_level || 0) + qty;
                  await supabase.from('point_of_sale_products').update({ stock_level: newStock }).eq('id', row.selectedProduct.id);
              }
              const { error: batchError } = await supabase.from('products_batches').insert([{
                  product_id: row.selectedProduct.id,
                  batch_no: row.batchNo || null,
                  expiry_date: row.expiryDate ? format(row.expiryDate, 'yyyy-MM-dd') : null,
                  quantity: qty,
                  variant_id: row.variant_id || null,
                  variant_name: row.variant_name || null
              }]);
          }
          
          toast({ title: "Success", description: "Purchase bill saved successfully and stock updated." });
          setBillNo('');
          setSelectedSupplier(null);
          setBillDate(new Date());
          setRoundOffAmount('0');
          setDiscountType('percentage');
          setRows([createEmptyRow()]);
          setCurrentBillId(null);
          setSaveError(null);
          setIsAllBillsModalOpen(true);
      } catch (err) {
          const errorMessage = err.message || "Failed to save bill. Please check console for details.";
          setSaveError(errorMessage);
          toast({ title: "Save Failed", description: errorMessage, variant: "destructive" });
      } finally {
          setIsSaving(false);
      }
  };

  const handleBatchWarningConfirm = () => {
      setIsBatchWarningOpen(false);
      if (pendingSaveParams) {
          performFinalSave(pendingSaveParams);
          setPendingSaveParams(null);
      }
  };

  const totals = calculateTotals();

  return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b shadow-sm">
              <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                      <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">Purchase Bill Entry</h1>
                      {selectedSupplier && (
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">
                              {selectedSupplier.name} • {format(billDate, 'MMM dd, yyyy')}
                          </p>
                      )}
                  </div>
                  <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsDraftsModalOpen(true)} className="h-9 sm:h-9 min-w-[44px] sm:min-w-0">
                          <DownloadCloud className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Load Draft</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsAllBillsModalOpen(true)} className="h-9 sm:h-9 min-w-[44px] sm:min-w-0">
                          <List className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">View All Bills</span>
                      </Button>
                  </div>
              </div>
          </div>

          <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-32 sm:pb-6">
              {saveError && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Save Error</AlertTitle>
                      <AlertDescription>{saveError}</AlertDescription>
                  </Alert>
              )}

              <Card className="border-0 sm:border shadow-sm">
                  <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                      <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                          <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                              <Label htmlFor="barcode-input" className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                  <Barcode className="w-5 h-5" />
                                  Scan Product Barcode
                              </Label>
                              <div className="relative">
                                  <Input
                                      ref={barcodeInputRef}
                                      id="barcode-input"
                                      type="text"
                                      value={barcodeInput}
                                      onChange={(e) => setBarcodeInput(e.target.value)}
                                      placeholder="Scan barcode or enter manually..."
                                      className="text-base sm:text-lg font-mono bg-white dark:bg-slate-950 pr-14 h-12 sm:h-12 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500"
                                      autoComplete="off"
                                  />
                                  {isSearching ? (
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                      </div>
                                  ) : (
                                      <TooltipProvider>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50 h-10 w-10 min-w-[44px] min-h-[44px]"
                                                      onClick={() => setIsScannerOpen(true)}
                                                  >
                                                      <Camera className="w-5 h-5" />
                                                      <span className="sr-only">Open Camera Scanner</span>
                                                  </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Open Camera Scanner</TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  )}
                              </div>
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                  Press Enter or click outside to search. The scanner stays active for continuous scanning.
                              </p>
                          </form>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                          <div className="space-y-2">
                              <Label className="text-sm sm:text-base">Supplier <span className="text-red-500">*</span></Label>
                              <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}>
                                  <PopoverTrigger asChild>
                                      <Button 
                                          variant="outline" 
                                          className={cn(
                                              "w-full justify-between h-11 sm:h-10 text-sm sm:text-base bg-[#FFFFFF] border-slate-300 text-slate-900 hover:bg-slate-50 dark:bg-[#FFFFFF] dark:border-slate-300 dark:text-slate-900 dark:hover:bg-slate-50",
                                              saveError && !selectedSupplier && "border-red-500 focus:ring-red-500"
                                          )}
                                      >
                                          <span className="truncate">{selectedSupplier ? selectedSupplier.name : "Select Supplier"}</span>
                                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                  </PopoverTrigger>
                                  <PopoverContent 
                                      className="w-[320px] sm:w-[400px] p-0 z-[100] bg-[#FFFFFF] border-slate-200 shadow-xl dark:bg-[#FFFFFF] dark:border-slate-200 rounded-md overflow-hidden flex flex-col"
                                      align="start"
                                  >
                                      <div className="p-2 border-b border-slate-100 dark:border-slate-200 bg-[#FFFFFF] dark:bg-[#FFFFFF]">
                                          <div className="relative">
                                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                              <Input 
                                                  placeholder="Search suppliers..." 
                                                  value={supplierSearch} 
                                                  onChange={(e) => setSupplierSearch(e.target.value)} 
                                                  className="pl-9 h-10 text-sm bg-[#FFFFFF] border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-[#FFFFFF] dark:border-slate-300 dark:text-slate-900 dark:placeholder:text-slate-500 shadow-sm" 
                                              />
                                          </div>
                                      </div>
                                      <div className="max-h-60 overflow-y-auto bg-[#FFFFFF] dark:bg-[#FFFFFF] p-1.5 custom-scrollbar">
                                          {suppliers.length === 0 ? (
                                              <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-500">
                                                  {supplierSearch ? 'No suppliers found' : 'Start typing to search'}
                                              </div>
                                          ) : (
                                              suppliers.map(s => (
                                                  <Button 
                                                      key={s.id} 
                                                      variant="ghost" 
                                                      className="w-full justify-start h-auto min-h-[40px] px-3 py-2.5 mb-1 text-sm text-slate-900 bg-[#FFFFFF] border border-transparent rounded-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 dark:text-slate-900 dark:bg-[#FFFFFF] dark:hover:bg-blue-50 dark:hover:text-blue-700 dark:hover:border-blue-100 transition-colors flex items-center" 
                                                      onClick={() => { 
                                                          setSelectedSupplier(s); 
                                                          setIsSupplierPopoverOpen(false); 
                                                      }}
                                                  >
                                                      <span className="truncate font-medium">{s.name}</span>
                                                  </Button>
                                              ))
                                          )}
                                      </div>
                                      <div className="p-2 border-t border-slate-100 dark:border-slate-200 bg-[#FFFFFF] dark:bg-[#FFFFFF]">
                                          <Button 
                                              variant="default" 
                                              className="w-full h-10 font-medium bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 shadow-sm transition-colors" 
                                              onClick={() => { 
                                                  setIsSupplierModalOpen(true); 
                                                  setIsSupplierPopoverOpen(false); 
                                              }}
                                          >
                                              <Plus className="w-4 h-4 mr-2" /> Add New Supplier
                                          </Button>
                                      </div>
                                  </PopoverContent>
                              </Popover>
                          </div>
                          <div className="space-y-2">
                              <Label className="text-sm sm:text-base">Bill No <span className="text-red-500">*</span></Label>
                              <Input 
                                  placeholder="Enter bill number" 
                                  value={billNo} 
                                  onChange={(e) => setBillNo(e.target.value)} 
                                  onBlur={handleBillNoBlur} 
                                  className={cn(
                                      "h-11 sm:h-10 text-base",
                                      saveError && !billNo && "border-red-500 focus:ring-red-500"
                                  )}
                              />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-sm sm:text-base">Bill Date</Label>
                              <CustomDatePicker date={billDate} onDateChange={setBillDate} />
                          </div>
                          <div className="space-y-2">
                              <Label className="text-sm sm:text-base">Discount Type</Label>
                              <Select value={discountType} onValueChange={setDiscountType}>
                                  <SelectTrigger className="bg-white dark:bg-slate-950 h-11 sm:h-10">
                                      <SelectValue placeholder="Select discount type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                                      <SelectItem value="flat">Flat Amount</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>

                      <div className="hidden md:block border rounded-lg overflow-hidden">
                          <div className="overflow-x-auto overflow-y-auto max-h-[500px] w-full">
                              <div className="min-w-[1024px]">
                                  <Table>
                                      <TableHeader className="bg-white dark:bg-slate-950 border-b sticky top-0 z-10 shadow-sm">
                                          <TableRow>
                                              <TableHead className="min-w-[200px]">Product</TableHead>
                                              <TableHead className="min-w-[120px]">Brand</TableHead>
                                              <TableHead className="min-w-[100px]">SKU</TableHead>
                                              <TableHead className="min-w-[100px]">Qty</TableHead>
                                              <TableHead className="min-w-[120px]">Batch No</TableHead>
                                              <TableHead className="min-w-[140px]">Expiry</TableHead>
                                              <TableHead className="min-w-[100px]">{regionConfig.tax.name} %</TableHead>
                                              <TableHead className="min-w-[100px]">MRP</TableHead>
                                              <TableHead className="min-w-[100px]">Rate</TableHead>
                                              <TableHead className="min-w-[100px]">{discountType === 'percentage' ? 'Discount (%)' : `Discount (${regionConfig.currency.symbol})`}</TableHead>
                                              <TableHead className="min-w-[120px]">Amount</TableHead>
                                              <TableHead className="w-[60px]"></TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {rows.map((row) => {
                                              const qty = parseFloat(row.quantity) || 0;
                                              const rate = parseFloat(row.rate) || 0;
                                              const discount = parseFloat(row.discount) || 0;
                                              const grossAmount = qty * rate;
                                              let discountAmount = 0;
                                              if (discountType === 'percentage') discountAmount = (grossAmount * discount) / 100;
                                              else discountAmount = discount;
                                              const amount = grossAmount - discountAmount;
                                              return (
                                                  <TableRow key={row.id}>
                                                      <TableCell>
                                                          <Popover open={openPopoverRowId === row.id} onOpenChange={(isOpen) => setOpenPopoverRowId(isOpen ? row.id : null)}>
                                                              <PopoverTrigger asChild>
                                                                  <Button variant="outline" className="w-full justify-between bg-[#FFFFFF] border-slate-300 text-slate-900 hover:bg-slate-50 dark:bg-[#FFFFFF] dark:border-slate-300 dark:text-slate-900 dark:hover:bg-slate-50">
                                                                      {row.productSearch || "Select Product"}
                                                                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                  </Button>
                                                              </PopoverTrigger>
                                                              <PopoverContent ref={desktopPopoverRef} className="w-80 p-0 z-[100] bg-[#FFFFFF] border-slate-200 shadow-xl dark:bg-[#FFFFFF] dark:border-slate-200 rounded-md" align="start" side="bottom" sideOffset={4} onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()}>
                                                                  <div className="p-2 space-y-2 bg-[#FFFFFF] rounded-md">
                                                                      <Input placeholder="Search products..." value={row.productSearch} onChange={(e) => handleProductSearchChange(e.target.value, row.id)} autoFocus className="h-11 text-base bg-[#FFFFFF] border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500 dark:bg-[#FFFFFF] dark:border-slate-300 dark:text-slate-900 dark:placeholder:text-slate-500" />
                                                                      <div className="max-h-60 overflow-y-auto space-y-1 bg-[#FFFFFF] border border-slate-100 dark:border-slate-200 rounded-md">
                                                                          {row.productsList.length === 0 ? (
                                                                              <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-500">{row.productSearch ? 'No products found' : 'Start typing to search'}</div>
                                                                          ) : (
                                                                              row.productsList.map(p => (
                                                                                  <Button key={p.id} variant="ghost" className="w-full justify-start h-11 text-sm text-slate-900 bg-[#FFFFFF] border-b border-slate-100 last:border-0 rounded-none hover:bg-blue-600 hover:text-white dark:text-slate-900 dark:bg-[#FFFFFF] dark:hover:bg-blue-600 dark:hover:text-white transition-colors" onClick={() => { handleProductSelect(row.id, p); setOpenPopoverRowId(null); }}>
                                                                                      {p.name} {p.variants?.length > 0 && `(${p.variants.length} variants)`}
                                                                                  </Button>
                                                                              ))
                                                                          )}
                                                                      </div>
                                                                      <Button variant="outline" className="w-full h-11 font-medium bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200 dark:bg-slate-100 dark:border-slate-300 dark:text-slate-900 dark:hover:bg-slate-200" onClick={() => { setIsProductListModalOpen(true); setOpenPopoverRowId(null); }}>
                                                                          <List className="w-4 h-4 mr-2" /> Browse All
                                                                      </Button>
                                                                  </div>
                                                              </PopoverContent>
                                                          </Popover>
                                                      </TableCell>
                                                      <TableCell><Input value={row.brand} onChange={(e) => updateRow(row.id, 'brand', e.target.value)} placeholder="Brand" /></TableCell>
                                                      <TableCell><Input value={row.sku} readOnly placeholder="SKU" className="bg-slate-50 dark:bg-slate-800/50" /></TableCell>
                                                      <TableCell><Input type="number" min="0" value={row.quantity} onChange={(e) => updateRow(row.id, 'quantity', e.target.value)} placeholder="Qty" /></TableCell>
                                                      <TableCell><Input value={row.batchNo} onChange={(e) => updateRow(row.id, 'batchNo', e.target.value)} placeholder="Batch" /></TableCell>
                                                      <TableCell>
                                                          <CustomDatePicker date={row.expiryDate} onDateChange={(date) => updateRow(row.id, 'expiryDate', date)} />
                                                      </TableCell>
                                                      <TableCell><Input type="number" min="0" step="0.01" value={row.gst} onChange={(e) => updateRow(row.id, 'gst', e.target.value)} placeholder={regionConfig.tax.name} /></TableCell>
                                                      <TableCell><Input type="number" min="0" step="0.01" value={row.mrp} onChange={(e) => updateRow(row.id, 'mrp', e.target.value)} placeholder="MRP" /></TableCell>
                                                      <TableCell><Input type="number" min="0" step="0.01" value={row.rate} onChange={(e) => updateRow(row.id, 'rate', e.target.value)} placeholder="Rate" /></TableCell>
                                                      <TableCell>
                                                          <Input type="number" min="0" max={discountType === 'percentage' ? 100 : undefined} step="0.01" value={row.discount} onChange={(e) => updateRow(row.id, 'discount', e.target.value)} placeholder={discountType === 'percentage' ? 'Enter discount %' : `Enter discount ${regionConfig.currency.symbol}`} className="h-9" />
                                                      </TableCell>
                                                      <TableCell className="font-semibold">{formatCurrency(amount, currentRegion)}</TableCell>
                                                      <TableCell>
                                                          <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
                                                              <Trash2 className="w-4 h-4 text-red-500" />
                                                          </Button>
                                                      </TableCell>
                                                  </TableRow>
                                              );
                                          })}
                                      </TableBody>
                                  </Table>
                              </div>
                          </div>
                      </div>

                      <div className="md:hidden space-y-3">
                          {rows.map((row) => (
                              <MobileBillItemCard 
                                  key={row.id}
                                  row={row}
                                  updateRow={updateRow}
                                  removeRow={removeRow}
                                  handleProductSearchChange={handleProductSearchChange}
                                  handleProductSelect={handleProductSelect}
                                  setIsProductListModalOpen={setIsProductListModalOpen}
                                  discountType={discountType}
                                  rowsLength={rows.length}
                                  desktopPopoverRef={desktopPopoverRef}
                                  mobilePopoverRef={mobilePopoverRef}
                                  currentRegion={currentRegion}
                                  regionConfig={regionConfig}
                              />
                          ))}
                      </div>

                      <Button variant="outline" onClick={addRow} className="w-full h-11 sm:h-10">
                          <Plus className="w-4 h-4 mr-2" /> Add Row
                      </Button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-2">
                              <Label className="text-sm sm:text-base">Round Off Amount</Label>
                              <Input type="number" step="0.01" value={roundOffAmount} onChange={(e) => setRoundOffAmount(e.target.value)} placeholder="0.00" className="h-11 sm:h-10 text-base" />
                          </div>
                          <Card className="bg-slate-50 dark:bg-slate-800/50">
                              <CardContent className="pt-4 sm:pt-6 space-y-2">
                                  <div className="flex justify-between text-sm sm:text-base"><span>Subtotal:</span><span className="font-semibold">{formatCurrency(totals.subtotal, currentRegion)}</span></div>
                                  <div className="flex justify-between text-xs sm:text-sm text-slate-600 dark:text-slate-400"><span>Total Discount:</span><span>{formatCurrency(totals.totalDiscountAmount, currentRegion)}</span></div>
                                  <div className="flex justify-between text-sm sm:text-base"><span>Total Tax:</span><span className="font-semibold">{formatCurrency(totals.sgstTotal + totals.cgstTotal, currentRegion)}</span></div>
                                  <div className="flex justify-between text-sm sm:text-base"><span>Round Off:</span><span className="font-semibold">{formatCurrency(totals.roundOff, currentRegion)}</span></div>
                                  <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2"><span>Grand Total:</span><span>{formatCurrency(totals.grandTotal, currentRegion)}</span></div>
                              </CardContent>
                          </Card>
                      </div>

                      <div className="hidden sm:flex gap-3 sm:gap-4">
                          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving} className="h-11 sm:h-10 border-slate-400 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 font-medium">
                              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                              Save as Draft
                          </Button>
                          <Button onClick={handleFinalSave} disabled={isSaving} className="flex-1 h-11 sm:h-10 bg-[#FF6B35] hover:bg-[#E55A24] text-white shadow-md font-semibold">
                              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                              {isSaving ? 'Saving...' : 'Save Bill'}
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          </div>

          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t shadow-lg z-20">
              <div className="p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                          <div className="text-slate-500 dark:text-slate-400">Subtotal</div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totals.subtotal, currentRegion)}</div>
                      </div>
                      <div className="text-center">
                          <div className="text-slate-500 dark:text-slate-400">Tax</div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totals.sgstTotal + totals.cgstTotal, currentRegion)}</div>
                      </div>
                      <div className="text-center">
                          <div className="text-slate-500 dark:text-slate-400">Total</div>
                          <div className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totals.grandTotal, currentRegion)}</div>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving} className="h-12 border-slate-400 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 font-medium">
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                          Draft
                      </Button>
                      <Button onClick={handleFinalSave} disabled={isSaving} className="h-12 bg-[#FF6B35] hover:bg-[#E55A24] text-white shadow-md font-semibold">
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                          {isSaving ? 'Saving...' : 'Save Bill'}
                      </Button>
                  </div>
              </div>
          </div>

          <Dialog open={isBatchWarningOpen} onOpenChange={setIsBatchWarningOpen}>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto">
                  <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          Missing Batch Information
                      </DialogTitle>
                      <DialogDescription className="text-sm leading-relaxed">
                          Some products are missing batch numbers or expiry dates. This may affect inventory tracking. Do you want to continue without this information?
                      </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                      <Button variant="outline" onClick={() => setIsBatchWarningOpen(false)} className="w-full sm:w-auto h-11 sm:h-10">Cancel</Button>
                      <Button onClick={handleBatchWarningConfirm} className="w-full sm:w-auto h-11 sm:h-10 bg-[#3B82F6] hover:bg-blue-600 text-white shadow-md transition-all active:scale-95 border-none">Continue Anyway</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>

          <Dialog open={isDraftsModalOpen} onOpenChange={setIsDraftsModalOpen}>
              <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-3xl max-h-[80vh] overflow-y-auto mx-auto">
                  <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl">Load Draft Bill</DialogTitle>
                      <DialogDescription className="text-sm">
                          Select a draft to continue editing. Drafts are automatically saved bills that haven't been finalized yet.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                      {isDraftsLoading ? (
                          <div className="flex flex-col items-center justify-center py-12">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                              <p className="text-sm text-slate-500">Loading drafts...</p>
                          </div>
                      ) : drafts.length === 0 ? (
                          <div className="text-center py-12 text-slate-500">
                              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                              <p className="text-base font-medium text-slate-700 dark:text-slate-300">No saved drafts found</p>
                              <p className="text-sm mt-1">Create a draft by using "Save as Draft" button</p>
                          </div>
                      ) : (
                          drafts.map((draft) => (
                              <Card key={draft.id} className="border-l-4 border-l-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => loadDraft(draft)}>
                                  <CardContent className="p-4">
                                      <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">Bill No: {draft.bill_no}</div>
                                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                  Supplier: {draft.suppliers?.name || 'Unknown'}
                                              </div>
                                              <div className="text-sm text-slate-600 dark:text-slate-400">
                                                  Date: {format(new Date(draft.bill_date), 'MMM dd, yyyy')}
                                              </div>
                                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                                  {draft.items?.length || 0} item(s)
                                              </div>
                                          </div>
                                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); loadDraft(draft); }} className="shrink-0 h-9">
                                              <DownloadCloud className="w-4 h-4 mr-2" />
                                              Load
                                          </Button>
                                      </div>
                                  </CardContent>
                              </Card>
                          ))
                      )}
                  </div>
              </DialogContent>
          </Dialog>

          <Dialog open={isAllBillsModalOpen} onOpenChange={setIsAllBillsModalOpen}>
              <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-7xl max-h-[90vh] overflow-y-auto mx-auto p-4 sm:p-6">
                  <DialogHeader className="mb-4">
                      <DialogTitle className="text-lg sm:text-xl font-bold">All Purchase Bills</DialogTitle>
                  </DialogHeader>
                  <PurchaseBillsDashboard user={user} />
              </DialogContent>
          </Dialog>

          <SupplierModal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} onSuppliersChange={handleSuppliersChange} />
          <VariantSelectorModal 
            open={isVariantModalOpen} 
            onClose={() => {
              setIsVariantModalOpen(false);
              setVariantModalProduct(null);
              if (barcodeInputRef.current) setTimeout(() => barcodeInputRef.current.focus(), 100);
            }} 
            product={variantModalProduct} 
            onConfirm={handleVariantConfirm} 
          />
          <ProductListModal 
            open={isProductListModalOpen} 
            onClose={() => setIsProductListModalOpen(false)} 
            onSelect={(product) => {
              const emptyRow = rows.find(r => !r.selectedProduct);
              const targetRowId = emptyRow?.id || rows[rows.length - 1].id;
              handleProductSelect(targetRowId, product);
              setIsProductListModalOpen(false);
            }} 
          />
          <BarcodeScannerModal 
            open={isScannerOpen} 
            onClose={() => setIsScannerOpen(false)} 
            onDetected={handleScanSuccess} 
            title="Scan Barcode with Camera"
          />
      </div>
  );
};

export default PurchaseBillEntry;