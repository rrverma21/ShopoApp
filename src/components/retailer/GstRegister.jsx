import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import { PlusCircle, Edit, Trash2, Copy, Search, Loader2, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GstForm from './GstForm';
import { usePosData } from '@/contexts/PosDataContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatPrice } from '@/lib/utils';

const GstRegisterTable = ({ data, type, handleEdit, handleDelete, handleCopy }) => {
    const isSales = type === 'sales';

    return (
        <div className="space-y-4 md:hidden">
            <AnimatePresence>
                {data.map((item) => (
                    <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2 shadow-sm"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{isSales ? item.customer_name : item.vendor_name}</p>
                                <p className="text-sm text-slate-500">{isSales ? item.invoice_no : item.bill_no}</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleEdit(item)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCopy(item)}>
                                        <Copy className="mr-2 h-4 w-4" /> Copy
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">{format(new Date(isSales ? item.sale_date : item.expense_date), 'dd MMM, yyyy')}</span>
                            <span className="font-semibold text-lg text-slate-900 dark:text-white">{formatPrice(item.total_value)}</span>
                        </div>
                         { (isSales ? item.customer_gstin : item.vendor_gstin) && <p className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit">{isSales ? item.customer_gstin : item.vendor_gstin}</p>}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};


const GstRegisterDesktopTable = ({ data, type, handleEdit, handleDelete, handleCopy }) => {
    const isSales = type === 'sales';
    const headers = isSales
        ? ["Date", "Invoice #", "Customer", "GSTIN", "Total (₹)"]
        : ["Date", "Bill #", "Vendor", "GSTIN", "Total (₹)"];

    return (
         <div className="overflow-x-auto hidden md:block border rounded-lg bg-white dark:bg-slate-900">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                        {headers.map(h => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}
                        <th scope="col" className="px-4 py-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <AnimatePresence>
                        {data.map((item) => (
                            <motion.tr
                                key={item.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                <td className="px-4 py-3">{format(new Date(isSales ? item.sale_date : item.expense_date), 'dd-MM-yyyy')}</td>
                                <td className="px-4 py-3">{isSales ? item.invoice_no : item.bill_no}</td>
                                <td className="px-4 py-3 truncate max-w-40">{isSales ? item.customer_name : item.vendor_name}</td>
                                <td className="px-4 py-3">{isSales ? item.customer_gstin : item.vendor_gstin}</td>
                                <td className="px-4 py-3 text-right font-semibold">{formatPrice(item.total_value)}</td>
                                <td className="px-4 py-3 text-center space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleCopy(item)} className="h-8 w-8 text-slate-500 hover:text-slate-700"><Copy className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8 text-blue-500 hover:text-blue-700"><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                                </td>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </tbody>
            </table>
        </div>
    );
}

const GstRegister = ({ defaultTab = 'sales' }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [sales, setSales] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formType, setFormType] = useState('sales');

    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const { user } = useAuth();
    const { toast } = useToast();
    const { lastSaleTimestamp } = usePosData();

    const fetchGstData = useCallback(async (table, setter) => {
        if (!user) return;
        setLoading(true);
        try {
            let query = supabase.from(table).select('*').eq('user_id', user.id);
            
            const dateColumn = table === 'dior_sales' ? 'sale_date' : 'expense_date';
            if (dateRange.from) {
                query = query.gte(dateColumn, startOfDay(new Date(dateRange.from)).toISOString());
            }
            if (dateRange.to) {
                query = query.lte(dateColumn, endOfDay(new Date(dateRange.to)).toISOString());
            }

            const { data, error } = await query.order(dateColumn, { ascending: false });
            if (error) throw error;
            setter(data || []);
        } catch (error) {
            toast({ title: "Error fetching data", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [user, toast, dateRange]);

    useEffect(() => {
        fetchGstData('dior_sales', setSales);
        fetchGstData('dior_expenses', setExpenses);
    }, [fetchGstData, lastSaleTimestamp]);

    const filterData = (data, term, isSales) => {
        return data.filter(item => {
            const lowerTerm = term.toLowerCase();
            if (isSales) {
                return (item.invoice_no?.toLowerCase().includes(lowerTerm)) ||
                       (item.customer_name?.toLowerCase().includes(lowerTerm)) ||
                       (item.customer_gstin?.toLowerCase().includes(lowerTerm));
            } else {
                return (item.bill_no?.toLowerCase().includes(lowerTerm)) ||
                       (item.vendor_name?.toLowerCase().includes(lowerTerm)) ||
                       (item.vendor_gstin?.toLowerCase().includes(lowerTerm));
            }
        });
    };

    const filteredSales = useMemo(() => filterData(sales, debouncedSearchTerm, true), [sales, debouncedSearchTerm]);
    const filteredExpenses = useMemo(() => filterData(expenses, debouncedSearchTerm, false), [expenses, debouncedSearchTerm]);

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingItem(null);
        if (formType === 'sales') fetchGstData('dior_sales', setSales);
        else fetchGstData('dior_expenses', setExpenses);
    };

    const handleAddNew = (type) => {
        setFormType(type);
        setEditingItem(null);
        setIsFormOpen(true);
    };
    
    const handleEdit = (item) => {
        const type = 'invoice_no' in item ? 'sales' : 'expenses';
        setFormType(type);
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleCopy = (item) => {
        const type = 'invoice_no' in item ? 'sales' : 'expenses';
        setFormType(type);
        const { id, created_at, updated_at, ...copiedItem } = item;
        setEditingItem({ ...copiedItem, isCopy: true });
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        const table = activeTab === 'sales' ? 'dior_sales' : 'dior_expenses';
        if (!window.confirm(`Are you sure you want to delete this ${activeTab.slice(0,-1)} entry?`)) return;
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Success", description: `Entry deleted.` });
            if (activeTab === 'sales') fetchGstData('dior_sales', setSales);
            else fetchGstData('dior_expenses', setExpenses);
        } catch (error) {
            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        }
    };
    
    const totals = useMemo(() => {
        const data = activeTab === 'sales' ? filteredSales : filteredExpenses;
        return data.reduce((acc, item) => {
            acc.taxable += item.taxable_value || 0;
            acc.gst += (item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0);
            acc.total += item.total_value || 0;
            return acc;
        }, { taxable: 0, gst: 0, total: 0 });
    }, [activeTab, filteredSales, filteredExpenses]);
    
    const handleSetToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setDateRange({ from: today, to: today });
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setDateRange({ from: '', to: '' });
    };

    return (
        <Card className="w-full border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col gap-4 mb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                                <TabsTrigger value="sales">Sales</TabsTrigger>
                                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                            </TabsList>
                             <Button onClick={() => handleAddNew(activeTab)} className="w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add {activeTab === 'sales' ? 'Sale' : 'Expense'}
                            </Button>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2 flex-wrap">
                            <div className="relative w-full sm:flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                            </div>
                            <div className="flex w-full sm:w-auto gap-2">
                                <Input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({...p, from: e.target.value}))} className="w-full sm:w-auto" />
                                <Input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({...p, to: e.target.value}))} className="w-full sm:w-auto" />
                            </div>
                             <div className="flex w-full sm:w-auto gap-2">
                                <Button variant="outline" onClick={handleSetToday} className="flex-1">Today</Button>
                                <Button variant="ghost" onClick={handleClearFilters} className="flex-1">Clear</Button>
                             </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <TabsContent value="sales">
                                {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div> : <>
                                    <GstRegisterTable data={filteredSales} type="sales" handleEdit={handleEdit} handleDelete={handleDelete} handleCopy={handleCopy} />
                                    <GstRegisterDesktopTable data={filteredSales} type="sales" handleEdit={handleEdit} handleDelete={handleDelete} handleCopy={handleCopy} />
                                </>}
                            </TabsContent>
                            <TabsContent value="expenses">
                                {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div> : <>
                                    <GstRegisterTable data={filteredExpenses} type="expenses" handleEdit={handleEdit} handleDelete={handleDelete} handleCopy={handleCopy} />
                                    <GstRegisterDesktopTable data={filteredExpenses} type="expenses" handleEdit={handleEdit} handleDelete={handleDelete} handleCopy={handleCopy} />
                                </>}
                            </TabsContent>
                        </motion.div>
                    </AnimatePresence>
                </Tabs>

                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-slate-500">Taxable Total</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white">{formatPrice(totals.taxable)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">GST Total</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white">{formatPrice(totals.gst)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Grand Total</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white">{formatPrice(totals.total)}</p>
                    </div>
                </div>

                <Dialog open={isFormOpen} onOpenChange={isOpen => { setIsFormOpen(isOpen); if (!isOpen) setEditingItem(null); }}>
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl">
                                {editingItem ? (editingItem.isCopy ? 'Copy' : 'Edit') : 'Add'} {formType === 'sales' ? 'Sale' : 'Expense'}
                            </DialogTitle>
                        </DialogHeader>
                        <GstForm type={formType} itemData={editingItem} onSuccess={handleFormSuccess} />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default GstRegister;