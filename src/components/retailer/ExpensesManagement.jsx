import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit, Trash2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AddExpenseForm from './AddExpenseForm';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { utils, writeFile } from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPrice } from '@/lib/utils';

const ExpensesManagement = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchExpenses = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('dior_expenses')
                .select('*')
                .eq('user_id', user.id)
                .order('expense_date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            toast({ title: "Error fetching expenses", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingExpense(null);
        fetchExpenses();
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setIsFormOpen(true);
    };

    const handleDelete = async (expenseId) => {
        if (!window.confirm("Are you sure you want to delete this expense record?")) return;

        try {
            const { error } = await supabase.from('dior_expenses').delete().eq('id', expenseId);
            if (error) throw error;
            toast({ title: "Success", description: "Expense record deleted successfully." });
            fetchExpenses();
        } catch (error) {
            toast({ title: "Error", description: "Could not delete expense record.", variant: "destructive" });
        }
    };
    
    const exportToExcel = () => {
        const worksheet = utils.json_to_sheet(expenses.map(e => ({
            "Date": format(new Date(e.expense_date), 'yyyy-MM-dd'),
            "Bill No": e.bill_no,
            "Vendor": e.vendor_name,
            "Vendor GSTIN": e.vendor_gstin,
            "Expense Type": e.expense_type,
            "Taxable Value": e.taxable_value,
            "GST Rate": e.gst_rate,
            "CGST": e.cgst_amount,
            "SGST": e.sgst_amount,
            "IGST": e.igst_amount,
            "Total Value": e.total_value,
            "ITC Eligible": e.eligible_for_itc,
        })));
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "Expenses");
        writeFile(workbook, "Expenses_Report.xlsx");
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="text-2xl font-bold">Expense Management</CardTitle>
                     <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={exportToExcel} disabled={expenses.length === 0} className="flex-1 sm:flex-none">
                            <FileDown className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                            setIsFormOpen(isOpen);
                            if (!isOpen) setEditingExpense(null);
                        }}>
                            <DialogTrigger asChild>
                                <Button className="flex-1 sm:flex-none">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                                </DialogHeader>
                                <AddExpenseForm onSuccess={handleFormSuccess} expenseData={editingExpense} onCancel={() => setIsFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8 text-muted-foreground">Loading expense data...</div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No expenses recorded yet.</h3>
                            <p className="text-muted-foreground mt-2">Click "Add Expense" to get started.</p>
                        </div>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Bill #</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell>{format(new Date(expense.expense_date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{expense.bill_no}</TableCell>
                                            <TableCell className="truncate max-w-[150px]">{expense.vendor_name || '-'}</TableCell>
                                            <TableCell className="text-right font-medium">{formatPrice(expense.total_value)}</TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                                                    <Edit className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default ExpensesManagement;