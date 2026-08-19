import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { MapPin } from 'lucide-react';

const RegionalAnalytics = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [grandTotals, setGrandTotals] = useState({ totalOrders: 0, totalRevenue: 0 });

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Invalid Date Range", description: "Please select both a start and end date.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('total_amount, shipping_address, created_at')
        .gte('created_at', new Date(startDate).toISOString())
        .lte('created_at', new Date(endDate).toISOString());

      if (user?.profile?.role === 'seller') {
        query = query.eq('seller_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const summary = data.reduce((acc, order) => {
        const region = order.shipping_address?.state || 'Unknown';
        if (!acc[region]) {
          acc[region] = {
            region,
            totalOrders: 0,
            totalRevenue: 0,
          };
        }
        acc[region].totalOrders += 1;
        acc[region].totalRevenue += Number(order.total_amount);
        return acc;
      }, {});

      const sortedReport = Object.values(summary).sort((a, b) => b.totalRevenue - a.totalRevenue);
      setReportData(sortedReport);

      const totals = sortedReport.reduce((acc, item) => {
        acc.totalOrders += item.totalOrders;
        acc.totalRevenue += item.totalRevenue;
        return acc;
      }, { totalOrders: 0, totalRevenue: 0 });
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
            <CardTitle>Regional Buying Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="start-date-regional">Start Date</Label>
              <Input id="start-date-regional" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date-regional">End Date</Label>
              <Input id="end-date-regional" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                      <th className="p-4 font-semibold">Region (State)</th>
                      <th className="p-4 font-semibold text-right">Total Orders</th>
                      <th className="p-4 font-semibold text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item) => (
                      <tr key={item.region} className="border-b border-slate-100">
                        <td className="p-4 font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" />{item.region}</td>
                        <td className="p-4 text-right">{item.totalOrders}</td>
                        <td className="p-4 text-right font-semibold text-blue-600">{formatPrice(item.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 font-bold">
                      <td className="p-4">Grand Total</td>
                      <td className="p-4 text-right">{grandTotals.totalOrders}</td>
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
          <p>Please select a date range and generate a report to see regional buying patterns.</p>
        </div>
      )}
    </div>
  );
};

export default RegionalAnalytics;