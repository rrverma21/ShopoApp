import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { useSalesData } from '@/hooks/useSalesData';
import SalesDateRangeFilter from './SalesDateRangeFilter';
import SalesSummaryCards from './SalesSummaryCards';
import HSNWiseSalesTable from './HSNWiseSalesTable';
import GSTWiseSalesTable from './GSTWiseSalesTable';
import { startOfMonth, endOfMonth } from 'date-fns';

const SalesOverviewSection = () => {
  console.log('[SalesOverviewSection] Component mounting...');

  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });

  const { sales, loading, error, refetch, fetchProgress } = useSalesData(dateRange.startDate, dateRange.endDate);

  console.log('[SalesOverviewSection] State:', { 
    salesCount: sales?.length || 0, 
    loading, 
    error: error?.message,
    dateRange,
    fetchProgress
  });

  const handleDateChange = (start, end) => {
    console.log('[SalesOverviewSection] Date range changed:', { start, end });
    setDateRange({ startDate: start, endDate: end });
  };

  const handleExportCSV = () => {
    try {
      // Export HSN-wise data (all records, no limit)
      const allItems = sales?.flatMap(sale => sale.items || []) || [];
      const csvData = [
        ['HSN Code', 'Product', 'Quantity', 'Taxable Value', 'IGST', 'SGST', 'CGST', 'Total GST', 'Total Value'],
        ...allItems.map(item => [
          item.hsn_code || 'N/A',
          item.product_name,
          item.quantity,
          item.total_price?.toFixed(2),
          item.igst_amount?.toFixed(2),
          item.sgst_amount?.toFixed(2),
          item.cgst_amount?.toFixed(2),
          item.tax_amount?.toFixed(2),
          ((item.total_price || 0) + (item.tax_amount || 0)).toFixed(2)
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-overview-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[SalesOverviewSection] Export error:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load sales data: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={refetch}>Retry</Button>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Overview</h2>
          <p className="text-muted-foreground text-sm">
            View and analyze your sales data for GST filing
            {sales && sales.length > 0 && (
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                • {sales.length.toLocaleString('en-IN')} total records loaded
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" disabled={loading || !sales || sales.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handlePrint} variant="outline" disabled={loading || !sales || sales.length === 0}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Loading Progress Indicator */}
      {loading && fetchProgress.current > 0 && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            Loading records... {fetchProgress.current.toLocaleString('en-IN')} fetched so far
          </AlertDescription>
        </Alert>
      )}

      {/* Date Filter */}
      <SalesDateRangeFilter 
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        onChange={handleDateChange}
      />

      {/* Summary Cards */}
      <SalesSummaryCards sales={sales} loading={loading} />

      {/* HSN-Wise Table */}
      <HSNWiseSalesTable sales={sales} loading={loading} />

      {/* GST-Wise Table */}
      <GSTWiseSalesTable sales={sales} loading={loading} />
    </motion.div>
  );
};

export default SalesOverviewSection;