import React, { useState } from 'react';
    import { motion } from 'framer-motion';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { toast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/supabaseClient';
    import { formatPrice } from '@/lib/utils';

    const SalesSummary = () => {
      const [reportData, setReportData] = useState([]);
      const [loading, setLoading] = useState(false);
      const [startDate, setStartDate] = useState('');
      const [endDate, setEndDate] = useState('');
      const [grandTotals, setGrandTotals] = useState({ totalQuantity: 0, totalRevenue: 0 });

      const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
          toast({ title: "Invalid Date Range", description: "Please select both a start and end date.", variant: "destructive" });
          return;
        }
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('order_items')
            .select(`
              quantity,
              price,
              products ( name ),
              orders!inner ( created_at )
            `)
            .gte('orders.created_at', new Date(startDate).toISOString())
            .lte('orders.created_at', new Date(endDate).toISOString());

          if (error) throw error;

          const summary = data.reduce((acc, item) => {
            if (!item.products) return acc;
            const productName = item.products.name;
            if (!acc[productName]) {
              acc[productName] = {
                productName,
                totalQuantity: 0,
                totalRevenue: 0,
              };
            }
            acc[productName].totalQuantity += item.quantity;
            acc[productName].totalRevenue += item.quantity * item.price;
            return acc;
          }, {});

          const sortedReport = Object.values(summary).sort((a, b) => b.totalRevenue - a.totalRevenue);
          setReportData(sortedReport);

          const totals = sortedReport.reduce((acc, item) => {
            acc.totalQuantity += item.totalQuantity;
            acc.totalRevenue += item.totalRevenue;
            return acc;
          }, { totalQuantity: 0, totalRevenue: 0 });
          setGrandTotals(totals);

        } catch (error) {
          toast({ title: "Error generating report", description: error.message, variant: "destructive" });
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="pt-8">
          <Card className="glass-effect mb-8">
            <CardHeader>
                <CardTitle>Product Sales Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="start-date-product">Start Date</Label>
                  <Input id="start-date-product" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date-product">End Date</Label>
                  <Input id="end-date-product" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <Button onClick={handleGenerateReport} disabled={loading} className="btn-primary">
                  {loading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
          ) : reportData.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="glass-effect">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-4 font-semibold">Product Name</th>
                          <th className="p-4 font-semibold text-right">Quantity Sold</th>
                          <th className="p-4 font-semibold text-right">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((item) => (
                          <tr key={item.productName} className="border-b border-slate-100">
                            <td className="p-4 font-medium">{item.productName}</td>
                            <td className="p-4 text-right">{item.totalQuantity}</td>
                            <td className="p-4 text-right font-semibold text-blue-600">{formatPrice(item.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-200 font-bold">
                          <td className="p-4">Grand Total</td>
                          <td className="p-4 text-right">{grandTotals.totalQuantity}</td>
                          <td className="p-4 text-right">{formatPrice(grandTotals.totalRevenue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <p>Please select a date range and generate a report to see the sales summary.</p>
            </div>
          )}
        </div>
      );
    };

    export default SalesSummary;