import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { FileDown, Loader2 } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { useToast } from '@/components/ui/use-toast';
import { formatPrice } from '@/lib/utils';

const GstReport = () => {
    const [sales, setSales] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const { user } = useAuth();
    const { toast } = useToast();

    const monthOptions = useMemo(() => {
        const options = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const date = subMonths(today, i);
            options.push({ value: format(date, 'yyyy-MM'), label: format(date, 'MMMM yyyy') });
        }
        return options;
    }, []);

    useEffect(() => {
        const fetchReportData = async () => {
            if (!user) return;
            setLoading(true);

            const date = new Date(selectedMonth + '-01T00:00:00');
            const startDate = startOfMonth(date);
            const endDate = endOfMonth(date);

            const { data: salesData, error: salesError } = await supabase
                .from('dior_sales')
                .select('*')
                .eq('user_id', user.id)
                .gte('sale_date', startDate.toISOString())
                .lte('sale_date', endDate.toISOString());

            const { data: expensesData, error: expensesError } = await supabase
                .from('dior_expenses')
                .select('*')
                .eq('user_id', user.id)
                .gte('expense_date', startDate.toISOString())
                .lte('expense_date', endDate.toISOString());

            if (salesError || expensesError) {
                toast({ title: "Error fetching report data", description: salesError?.message || expensesError?.message, variant: "destructive" });
            } else {
                setSales(salesData || []);
                setExpenses(expensesData || []);
            }
            setLoading(false);
        };

        fetchReportData();
    }, [user, selectedMonth, toast]);

    const reportSummary = useMemo(() => {
        const aggregateByRate = (data, taxableKey, cgstKey, sgstKey, igstKey) => {
            return data.reduce((acc, item) => {
                const rate = item.gst_rate || 0;
                if (!acc[rate]) {
                    acc[rate] = { taxable_value: 0, cgst: 0, sgst: 0, igst: 0 };
                }
                acc[rate].taxable_value += item[taxableKey] || 0;
                acc[rate].cgst += item[cgstKey] || 0;
                acc[rate].sgst += item[sgstKey] || 0;
                acc[rate].igst += item[igstKey] || 0;
                return acc;
            }, {});
        };

        const salesByRate = aggregateByRate(sales, 'taxable_value', 'cgst_amount', 'sgst_amount', 'igst_amount');
        const itcByRate = aggregateByRate(expenses.filter(e => e.eligible_for_itc), 'taxable_value', 'cgst_amount', 'sgst_amount', 'igst_amount');

        const totalOutputTax = Object.values(salesByRate).reduce((sum, rate) => sum + rate.cgst + rate.sgst + rate.igst, 0);
        const totalInputTaxCredit = Object.values(itcByRate).reduce((sum, rate) => sum + rate.cgst + rate.sgst + rate.igst, 0);
        const netGstPayable = totalOutputTax - totalInputTaxCredit;

        return { salesByRate, itcByRate, totalOutputTax, totalInputTaxCredit, netGstPayable };
    }, [sales, expenses]);

    const exportToExcel = () => {
        const wb = utils.book_new();

        // Summary Sheet
        const summaryData = [
            ["Metric", "Amount (₹)"],
            ["Total Output Tax (on Sales)", reportSummary.totalOutputTax.toFixed(2)],
            ["Total Input Tax Credit (ITC)", reportSummary.totalInputTaxCredit.toFixed(2)],
            ["Net GST Payable", reportSummary.netGstPayable.toFixed(2)],
        ];
        const summaryWs = utils.aoa_to_sheet(summaryData);
        utils.book_append_sheet(wb, summaryWs, "GST Summary");

        // Sales Sheet
        const salesData = Object.entries(reportSummary.salesByRate).map(([rate, data]) => ({
            "GST Rate (%)": rate,
            "Taxable Value": data.taxable_value.toFixed(2),
            "CGST": data.cgst.toFixed(2),
            "SGST": data.sgst.toFixed(2),
            "IGST": data.igst.toFixed(2),
        }));
        const salesWs = utils.json_to_sheet(salesData);
        utils.book_append_sheet(wb, salesWs, "Output Tax (Sales)");

        // Expenses (ITC) Sheet
        const itcData = Object.entries(reportSummary.itcByRate).map(([rate, data]) => ({
            "GST Rate (%)": rate,
            "Taxable Value": data.taxable_value.toFixed(2),
            "CGST": data.cgst.toFixed(2),
            "SGST": data.sgst.toFixed(2),
            "IGST": data.igst.toFixed(2),
        }));
        const itcWs = utils.json_to_sheet(itcData);
        utils.book_append_sheet(wb, itcWs, "Input Tax Credit (Expenses)");
        
        writeFile(wb, `GST_Report_${selectedMonth}.xlsx`);
    };

    const renderRateTable = (data, title) => (
        <div className="overflow-x-auto border rounded-lg">
            <h4 className="font-semibold mb-3 text-lg px-1">{title}</h4>
            <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                        <th className="p-3 text-left font-medium text-slate-500">GST Rate</th>
                        <th className="p-3 text-right font-medium text-slate-500">Taxable Value</th>
                        <th className="p-3 text-right font-medium text-slate-500">CGST</th>
                        <th className="p-3 text-right font-medium text-slate-500">SGST</th>
                        <th className="p-3 text-right font-medium text-slate-500">IGST</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(data).map(([rate, values]) => (
                        <tr key={rate}>
                            <td className="p-3 font-medium">{rate}%</td>
                            <td className="p-3 text-right">{formatPrice(values.taxable_value)}</td>
                            <td className="p-3 text-right">{formatPrice(values.cgst)}</td>
                            <td className="p-3 text-right">{formatPrice(values.sgst)}</td>
                            <td className="p-3 text-right">{formatPrice(values.igst)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    
    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                <CardTitle className="text-2xl font-bold">Monthly GST Report</CardTitle>
                <div className="flex items-center gap-4">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {monthOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={exportToExcel} variant="outline" disabled={loading}>
                        <FileDown className="mr-2 h-4 w-4" /> Download Excel
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center p-12 text-slate-500">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        <span>Generating Report...</span>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Summary Cards */}
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="p-6 bg-white dark:bg-slate-900 border rounded-lg shadow-sm">
                                <h3 className="text-sm font-medium text-slate-500">Total Output Tax (Sales)</h3>
                                <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{formatPrice(reportSummary.totalOutputTax)}</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-900 border rounded-lg shadow-sm">
                                <h3 className="text-sm font-medium text-slate-500">Total Input Tax Credit (ITC)</h3>
                                <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{formatPrice(reportSummary.totalInputTaxCredit)}</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-900 border rounded-lg shadow-sm">
                                <h3 className="text-sm font-medium text-slate-500">Net GST Payable</h3>
                                <p className={`text-2xl font-bold mt-1 ${reportSummary.netGstPayable >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {formatPrice(reportSummary.netGstPayable)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">{reportSummary.netGstPayable < 0 ? "Refundable" : "Payable"}</p>
                            </div>
                        </div>
                        
                        {/* Rate-wise details */}
                        <div className="space-y-8">
                            {renderRateTable(reportSummary.salesByRate, "Output Tax on Sales (Rate-wise)")}
                            {renderRateTable(reportSummary.itcByRate, "Input Tax Credit on Expenses (Rate-wise)")}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default GstReport;