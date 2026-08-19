import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, RefreshCcw, Eye, BadgeIndianRupee as ReceiptIndianRupee, IndianRupee, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import PaidBillDetailsModal from './PaidBillDetailsModal';
import { useToast } from '@/components/ui/use-toast';

const PaidPurchasesSection = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    
    // Modal
    const [selectedBillId, setSelectedBillId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchPaidBills = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        
        try {
            const { data, error } = await supabase
                .from('purchase_bills')
                .select(`
                    id, 
                    bill_no, 
                    bill_date, 
                    total_amount, 
                    amount_paid, 
                    sgst_total, 
                    cgst_total,
                    payment_status,
                    suppliers (name)
                `)
                .eq('user_id', user.id)
                .eq('payment_status', 'Paid')
                .order('bill_date', { ascending: false });

            if (error) throw error;
            setBills(data || []);
        } catch (err) {
            console.error('Error fetching paid bills:', err);
            setError(err.message);
            toast({
                title: 'Error',
                description: 'Failed to load paid purchases.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchPaidBills();

        // Real-time subscription for updates
        if (user) {
            const subscription = supabase
                .channel('public:purchase_bills')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'purchase_bills', filter: `user_id=eq.${user.id}` }, 
                    () => {
                        fetchPaidBills();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [fetchPaidBills, user]);

    // Derived Data
    const uniqueSuppliers = [...new Set(bills.map(b => b.suppliers?.name).filter(Boolean))];
    
    const filteredBills = bills.filter(bill => {
        const matchesSearch = 
            (bill.bill_no?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (bill.suppliers?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        const matchesSupplier = supplierFilter === 'all' || bill.suppliers?.name === supplierFilter;
        
        const matchesDate = !dateFilter || bill.bill_date?.startsWith(dateFilter);
        
        return matchesSearch && matchesSupplier && matchesDate;
    });

    const totalPaidAmount = filteredBills.reduce((sum, bill) => sum + (bill.amount_paid || 0), 0);
    const totalGstAmount = filteredBills.reduce((sum, bill) => sum + (bill.sgst_total || 0) + (bill.cgst_total || 0), 0);

    const openBillDetails = (id) => {
        setSelectedBillId(id);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Supplier Paid Purchases</h2>
                    <p className="text-muted-foreground text-sm">View and manage your fully paid purchase bills and input tax credit.</p>
                </div>
                <Button onClick={fetchPaidBills} variant="outline" size="sm" className="shrink-0" disabled={loading}>
                    <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <IndianRupee className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Paid Amount</p>
                            <h3 className="text-2xl font-bold">₹{totalPaidAmount.toFixed(2)}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400">
                            <ReceiptIndianRupee className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-600/80 dark:text-blue-400/80">Total Input GST</p>
                            <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">₹{totalGstAmount.toFixed(2)}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-full">
                            <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Paid Bills Count</p>
                            <h3 className="text-2xl font-bold">{filteredBills.length}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search bill no or supplier..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="w-full md:w-64">
                            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Suppliers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Suppliers</SelectItem>
                                    {uniqueSuppliers.map(sup => (
                                        <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-48">
                            <Input 
                                type="month" 
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Content Area */}
            {error ? (
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="p-6 text-center">
                        <p className="text-destructive mb-4">{error}</p>
                        <Button onClick={fetchPaidBills} variant="outline">Try Again</Button>
                    </CardContent>
                </Card>
            ) : loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="w-full h-16 rounded-md" />
                    ))}
                </div>
            ) : filteredBills.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-foreground">No paid bills found</p>
                        <p className="text-sm">Try adjusting your filters or record a payment in Purchase Entry.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bill No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead className="text-right">Total (₹)</TableHead>
                                    <TableHead className="text-right">GST (₹)</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBills.map((bill) => {
                                    const gst = (bill.sgst_total || 0) + (bill.cgst_total || 0);
                                    return (
                                        <TableRow key={bill.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">{bill.bill_no}</TableCell>
                                            <TableCell>{format(new Date(bill.bill_date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{bill.suppliers?.name || 'Unknown'}</TableCell>
                                            <TableCell className="text-right font-medium">₹{(bill.total_amount || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right text-blue-600 dark:text-blue-400">₹{gst.toFixed(2)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                                                    Paid
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => openBillDetails(bill.id)}>
                                                    <Eye className="w-4 h-4 mr-2" /> View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {filteredBills.map((bill) => {
                             const gst = (bill.sgst_total || 0) + (bill.cgst_total || 0);
                             return (
                                <Card key={bill.id}>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-lg">{bill.bill_no}</h4>
                                                <p className="text-sm text-muted-foreground">{bill.suppliers?.name || 'Unknown'}</p>
                                            </div>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t text-sm">
                                            <div>
                                                <p className="text-muted-foreground text-xs">Date</p>
                                                <p className="font-medium">{format(new Date(bill.bill_date), 'dd MMM yy')}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground text-xs">GST Input</p>
                                                <p className="font-medium text-blue-600">₹{gst.toFixed(2)}</p>
                                            </div>
                                            <div className="col-span-2 flex justify-between items-center mt-2">
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Total Amount</p>
                                                    <p className="font-bold text-lg">₹{(bill.total_amount || 0).toFixed(2)}</p>
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => openBillDetails(bill.id)}>
                                                    <Eye className="w-4 h-4 mr-2" /> Details
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                             );
                        })}
                    </div>
                </>
            )}

            <PaidBillDetailsModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                billId={selectedBillId} 
            />
        </div>
    );
};

export default PaidPurchasesSection;