import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit, Trash2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import AddSaleForm from './AddSaleForm';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { utils, writeFile } from 'xlsx';

const SalesManagement = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSale, setEditingSale] = useState(null);
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchSales = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('dior_sales')
                .select('*')
                .eq('user_id', user.id)
                .order('sale_date', { ascending: false });

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            toast({ title: "Error fetching sales", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const handleFormSuccess = () => {
        setIsFormOpen(false);
        setEditingSale(null);
        fetchSales();
    };

    const handleEdit = (sale) => {
        setEditingSale(sale);
        setIsFormOpen(true);
    };

    const handleDelete = async (saleId) => {
        if (!window.confirm("Are you sure you want to delete this sale record?")) return;

        try {
            const { error } = await supabase.from('dior_sales').delete().eq('id', saleId);
            if (error) throw error;
            toast({ title: "Success", description: "Sale record deleted successfully." });
            fetchSales();
        } catch (error) {
            toast({ title: "Error", description: "Could not delete sale record.", variant: "destructive" });
        }
    };
    
    const exportToExcel = () => {
        const worksheet = utils.json_to_sheet(sales.map(s => ({
            "Date": format(new Date(s.sale_date), 'yyyy-MM-dd'),
            "Invoice No": s.invoice_no,
            "Customer": s.customer_name,
            "Customer GSTIN": s.customer_gstin,
            "Taxable Value": s.taxable_value,
            "GST Rate": s.gst_rate,
            "CGST": s.cgst_amount,
            "SGST": s.sgst_amount,
            "IGST": s.igst_amount,
            "Total Value": s.total_value
        })));
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "Sales");
        writeFile(workbook, "Sales_Report.xlsx");
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <Card className="bg-gray-700 border-gray-600 text-white">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="text-2xl font-bold gradient-text">Sales Management</CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={exportToExcel} disabled={sales.length === 0} className="flex-1 sm:flex-none">
                            <FileDown className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                            setIsFormOpen(isOpen);
                            if (!isOpen) setEditingSale(null);
                        }}>
                            <DialogTrigger asChild>
                                <Button className="flex-1 sm:flex-none">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Daily Sale
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-700 border-gray-600 text-white">
                                <DialogHeader>
                                    <DialogTitle className="text-xl gradient-text">{editingSale ? 'Edit Daily Sale' : 'Add New Daily Sale'}</DialogTitle>
                                </DialogHeader>
                                <AddSaleForm onSuccess={handleFormSuccess} saleData={editingSale} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center p-8">Loading sales data...</div>
                    ) : sales.length === 0 ? (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-semibold">No sales recorded yet.</h3>
                            <p className="text-gray-400 mt-2">Click "Add Daily Sale" to get started.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-300 uppercase bg-gray-600">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Date</th>
                                        <th scope="col" className="px-6 py-3">Invoice #</th>
                                        <th scope="col" className="px-6 py-3">Customer</th>
                                        <th scope="col" className="px-6 py-3 text-right">Final Amount</th>
                                        <th scope="col" className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {sales.map((sale) => (
                                            <motion.tr
                                                key={sale.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="border-b border-gray-600 hover:bg-gray-600/30"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">{format(new Date(sale.sale_date), 'dd MMM yyyy')}</td>
                                                <td className="px-6 py-4">{sale.invoice_no}</td>
                                                <td className="px-6 py-4">{sale.customer_name}</td>
                                                <td className="px-6 py-4 text-right font-bold whitespace-nowrap">₹{Number(sale.total_value).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-300" onClick={() => handleEdit(sale)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400" onClick={() => handleDelete(sale.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default SalesManagement;