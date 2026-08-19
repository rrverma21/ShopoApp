import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { exportExpensesCSV, exportExpensesPDF } from '@/utils/expenseDataUtils';
import { useToast } from '@/components/ui/use-toast';

const ExpenseExport = ({ expenses, dateRange, stats }) => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // UI flush
      exportExpensesCSV(expenses, dateRange);
      toast({ title: "Export Successful", description: "CSV file downloaded." });
    } catch (error) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // UI flush
      exportExpensesPDF(expenses, dateRange, stats);
      toast({ title: "Export Successful", description: "PDF file downloaded." });
    } catch (error) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2 mb-4 justify-end">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportCSV}
        disabled={exporting || expenses.length === 0}
        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
      >
        {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-slate-500" /> : <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />}
        Export CSV
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportPDF}
        disabled={exporting || expenses.length === 0}
        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
      >
        {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-slate-500" /> : <FileText className="h-4 w-4 mr-2 text-red-600" />}
        Export PDF
      </Button>
    </div>
  );
};

export default ExpenseExport;