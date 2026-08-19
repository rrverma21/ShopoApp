import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const HSNWiseSalesTable = ({ sales, loading }) => {
  console.log('[HSNWiseSalesTable] Rendering with sales:', sales?.length || 0);

  const hsnData = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const allItems = sales.flatMap(sale => sale.items || []);
    const grouped = {};

    allItems.forEach(item => {
      const hsn = item.hsn_code || 'N/A';
      if (!grouped[hsn]) {
        grouped[hsn] = {
          hsn_code: hsn,
          product_description: item.product_name,
          total_quantity: 0,
          total_taxable_value: 0,
          igst_amount: 0,
          sgst_amount: 0,
          cgst_amount: 0,
          total_gst_amount: 0,
          total_value: 0
        };
      }

      grouped[hsn].total_quantity += item.quantity || 0;
      grouped[hsn].total_taxable_value += item.total_price || 0;
      grouped[hsn].igst_amount += item.igst_amount || 0;
      grouped[hsn].sgst_amount += item.sgst_amount || 0;
      grouped[hsn].cgst_amount += item.cgst_amount || 0;
      grouped[hsn].total_gst_amount += item.tax_amount || 0;
      grouped[hsn].total_value += (item.total_price || 0) + (item.tax_amount || 0);
    });

    return Object.values(grouped).sort((a, b) => a.hsn_code.localeCompare(b.hsn_code));
  }, [sales]);

  // Calculate totals for the total row
  const totals = useMemo(() => {
    if (hsnData.length === 0) return null;

    return hsnData.reduce((acc, row) => ({
      total_quantity: acc.total_quantity + row.total_quantity,
      total_taxable_value: acc.total_taxable_value + row.total_taxable_value,
      igst_amount: acc.igst_amount + row.igst_amount,
      sgst_amount: acc.sgst_amount + row.sgst_amount,
      cgst_amount: acc.cgst_amount + row.cgst_amount,
      total_gst_amount: acc.total_gst_amount + row.total_gst_amount,
      total_value: acc.total_value + row.total_value
    }), {
      total_quantity: 0,
      total_taxable_value: 0,
      igst_amount: 0,
      sgst_amount: 0,
      cgst_amount: 0,
      total_gst_amount: 0,
      total_value: 0
    });
  }, [hsnData]);

  console.log('[HSNWiseSalesTable] Grouped HSN data:', hsnData.length, 'entries');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>HSN-Wise Sales Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hsnData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>HSN-Wise Sales Breakdown</CardTitle>
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
        <CardTitle>HSN-Wise Sales Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN Code</TableHead>
                <TableHead>Product Description</TableHead>
                <TableHead className="text-right">Total Quantity</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">Total GST</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hsnData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.hsn_code}</TableCell>
                  <TableCell>{row.product_description}</TableCell>
                  <TableCell className="text-right">{row.total_quantity}</TableCell>
                  <TableCell className="text-right">₹{row.total_taxable_value.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.igst_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.sgst_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.cgst_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.total_gst_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">₹{row.total_value.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              
              {/* Total Row */}
              {totals && (
                <TableRow className="bg-slate-100 dark:bg-slate-700/50 border-t-2 border-slate-300 dark:border-slate-600">
                  <TableCell className="font-bold text-slate-900 dark:text-slate-100">TOTAL</TableCell>
                  <TableCell className="font-bold text-slate-900 dark:text-slate-100">All Products</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">{totals.total_quantity}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.total_taxable_value.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.igst_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.sgst_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.cgst_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.total_gst_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">₹{totals.total_value.toFixed(2)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Total rows: {hsnData.length}
        </div>
      </CardContent>
    </Card>
  );
};

export default HSNWiseSalesTable;