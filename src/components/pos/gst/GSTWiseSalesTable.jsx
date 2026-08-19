import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const GSTWiseSalesTable = ({ sales, loading }) => {
  console.log('[GSTWiseSalesTable] Rendering with sales:', sales?.length || 0);

  const gstData = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const allItems = sales.flatMap(sale => sale.items || []);
    const grouped = {};

    allItems.forEach(item => {
      const rate = item.tax_rate || 0;
      if (!grouped[rate]) {
        grouped[rate] = {
          gst_rate: rate,
          total_taxable_value: 0,
          total_igst: 0,
          total_sgst: 0,
          total_cgst: 0,
          total_gst: 0,
          total_value: 0,
          transaction_count: new Set()
        };
      }

      grouped[rate].total_taxable_value += item.total_price || 0;
      grouped[rate].total_igst += item.igst_amount || 0;
      grouped[rate].total_sgst += item.sgst_amount || 0;
      grouped[rate].total_cgst += item.cgst_amount || 0;
      grouped[rate].total_gst += item.tax_amount || 0;
      grouped[rate].total_value += (item.total_price || 0) + (item.tax_amount || 0);
    });

    // Count transactions
    sales.forEach(sale => {
      sale.items?.forEach(item => {
        const rate = item.tax_rate || 0;
        if (grouped[rate]) {
          grouped[rate].transaction_count.add(sale.id);
        }
      });
    });

    return Object.values(grouped)
      .map(g => ({ ...g, transaction_count: g.transaction_count.size }))
      .sort((a, b) => a.gst_rate - b.gst_rate);
  }, [sales]);

  // Calculate totals for the total row
  const totals = useMemo(() => {
    if (gstData.length === 0) return null;

    return gstData.reduce((acc, row) => ({
      total_taxable_value: acc.total_taxable_value + row.total_taxable_value,
      total_igst: acc.total_igst + row.total_igst,
      total_sgst: acc.total_sgst + row.total_sgst,
      total_cgst: acc.total_cgst + row.total_cgst,
      total_gst: acc.total_gst + row.total_gst,
      total_value: acc.total_value + row.total_value,
      transaction_count: acc.transaction_count + row.transaction_count
    }), {
      total_taxable_value: 0,
      total_igst: 0,
      total_sgst: 0,
      total_cgst: 0,
      total_gst: 0,
      total_value: 0,
      transaction_count: 0
    });
  }, [gstData]);

  console.log('[GSTWiseSalesTable] Grouped GST data:', gstData.length, 'entries');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GST Rate-Wise Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (gstData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GST Rate-Wise Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No sales data found for the selected date range</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GST Rate-Wise Sales Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GST Rate (%)</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">IGST Amount</TableHead>
                <TableHead className="text-right">SGST Amount</TableHead>
                <TableHead className="text-right">CGST Amount</TableHead>
                <TableHead className="text-right">Total GST</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gstData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.gst_rate}%</TableCell>
                  <TableCell className="text-right">₹{row.total_taxable_value.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.total_igst.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.total_sgst.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.total_cgst.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.total_gst.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">₹{row.total_value.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.transaction_count}</TableCell>
                </TableRow>
              ))}
              
              {/* Total Row */}
              {totals && (
                <TableRow className="bg-slate-100 dark:bg-slate-700/50 border-t-2 border-slate-300 dark:border-slate-600">
                  <TableCell className="font-bold text-slate-900 dark:text-slate-100">TOTAL</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.total_taxable_value.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.total_igst.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.total_sgst.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.total_cgst.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.total_gst.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.total_value.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">{totals.transaction_count}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Total rows: {gstData.length}
        </div>
      </CardContent>
    </Card>
  );
};

export default GSTWiseSalesTable;