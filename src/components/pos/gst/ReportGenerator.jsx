import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Download, FileText, Loader2, Table as TableIcon } from 'lucide-react';
import { 
  generateExpenseLedgerReport, 
  generateCategorySummaryReport, 
  generateGSTSummaryReport, 
  generateMonthWiseReport, 
  exportToCSV, 
  exportToPDF 
} from '@/utils/reportGenerator';

const REPORT_TYPES = [
  { id: 'ledger', name: 'Expense Ledger Report' },
  { id: 'category', name: 'Category Summary Report' },
  { id: 'gst', name: 'GST Input Tax Summary' },
  { id: 'monthly', name: 'Month-wise Totals' },
];

const ReportGenerator = ({ sellerId, dateRange }) => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState('ledger');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const fetchReportData = async () => {
    if (!sellerId || !dateRange.from || !dateRange.to) {
      toast({ title: 'Missing Info', description: 'Please select a date range.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('seller_expenses')
        .select('*')
        .eq('seller_id', sellerId)
        .gte('date', dateRange.from)
        .lte('date', dateRange.to);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: 'No Data', description: 'No expenses found in the selected date range.' });
        setReportData(null);
        return;
      }

      let generated;
      switch (reportType) {
        case 'ledger': generated = generateExpenseLedgerReport(data); break;
        case 'category': generated = generateCategorySummaryReport(data); break;
        case 'gst': generated = generateGSTSummaryReport(data); break;
        case 'monthly': generated = generateMonthWiseReport(data); break;
        default: generated = generateExpenseLedgerReport(data);
      }
      
      setReportData(generated);
      toast({ title: 'Report Generated', description: 'Data successfully processed.' });

      // Save report to history silently
      supabase.from('seller_gst_reports').insert([{
        seller_id: sellerId,
        report_type: reportType,
        date_range_start: dateRange.from,
        date_range_end: dateRange.to,
        report_data: generated
      }]).then();

    } catch (err) {
      console.error(err);
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    if (!reportData) return;
    const typeName = REPORT_TYPES.find(r => r.id === reportType)?.name || 'Report';
    const filename = `GST_${typeName.replace(/\s+/g, '_')}_${dateRange.from}_to_${dateRange.to}`;
    
    if (format === 'csv') exportToCSV(reportData, filename);
    if (format === 'pdf') exportToPDF(reportData, typeName, filename);
  };

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Report Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-2 w-full sm:w-72">
            <label className="text-sm font-medium">Select Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800">
                <SelectValue placeholder="Select Report" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchReportData} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TableIcon className="w-4 h-4 mr-2" />}
            Generate Report
          </Button>
        </div>

        {reportData && (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Report Preview Ready</h4>
                <p className="text-sm text-slate-500">{reportData.rows.length} rows generated.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleExport('csv')} className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-400">
                  <Download className="w-4 h-4 mr-2" /> CSV
                </Button>
                <Button variant="outline" onClick={() => handleExport('pdf')} className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400">
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>
            </div>

            {reportData.summary && (
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                   <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Expenses</p>
                   <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{reportData.summary.totalAmount.toFixed(2)}</p>
                 </div>
                 <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                   <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total GST (ITC)</p>
                   <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{reportData.summary.totalGST.toFixed(2)}</p>
                 </div>
                 <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                   <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Grand Total</p>
                   <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{reportData.summary.grandTotal.toFixed(2)}</p>
                 </div>
               </div>
            )}
            
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    {reportData.headers.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {reportData.rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}
                    </tr>
                  ))}
                  {reportData.rows.length > 10 && (
                    <tr>
                      <td colSpan={reportData.headers.length} className="px-4 py-3 text-center text-slate-500 italic">
                        ... and {reportData.rows.length - 10} more rows. Export to view full report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportGenerator;