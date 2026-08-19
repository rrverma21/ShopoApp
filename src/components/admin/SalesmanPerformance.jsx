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
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register Chart.js components to fix "scale 'linear' is not registered" error
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

const SalesmanPerformance = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const userRole = user?.profile?.role;
  const isSeller = userRole === 'seller';

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Invalid Date Range", description: "Please select both a start and end date.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          total_amount,
          creator:profiles!orders_created_by_fkey(id, business_name, seller_id)
        `)
        .gte('created_at', new Date(startDate).toISOString())
        .lte('created_at', new Date(endDate).toISOString())
        .not('created_by', 'is', null);

      if (isSeller) {
        query = query.eq('seller_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const performance = data.reduce((acc, order) => {
        if (!order.creator) return acc;
        
        if (isSeller && order.creator.seller_id !== user.id) {
          return acc;
        }

        const salesmanId = order.creator.id;
        if (!acc[salesmanId]) {
          acc[salesmanId] = {
            salesmanName: order.creator.business_name,
            totalOrders: 0,
            totalRevenue: 0,
          };
        }
        acc[salesmanId].totalOrders += 1;
        acc[salesmanId].totalRevenue += order.total_amount;
        return acc;
      }, {});

      const sortedReport = Object.values(performance)
        .map(p => ({ ...p, avgOrderValue: p.totalRevenue / p.totalOrders }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
        
      setReportData(sortedReport);

    } catch (error) {
      toast({ title: "Error generating report", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: reportData.map(d => d.salesmanName),
    datasets: [
      {
        label: 'Total Revenue',
        data: reportData.map(d => d.totalRevenue),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Salesman Revenue Performance',
      },
    },
  };

  return (
    <div className="pt-8">
      <Card className="glass-effect mb-8">
        <CardHeader>
            <CardTitle>Salesman Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="start-date-salesman">Start Date</Label>
              <Input id="start-date-salesman" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date-salesman">End Date</Label>
              <Input id="end-date-salesman" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Performance Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <Bar options={chartOptions} data={chartData} />
            </CardContent>
          </Card>
          <Card className="glass-effect">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-4 font-semibold">Salesman</th>
                      <th className="p-4 font-semibold text-right">Total Orders</th>
                      <th className="p-4 font-semibold text-right">Avg. Order Value</th>
                      <th className="p-4 font-semibold text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item) => (
                      <tr key={item.salesmanName} className="border-b border-slate-100">
                        <td className="p-4 font-medium">{item.salesmanName}</td>
                        <td className="p-4 text-right">{item.totalOrders}</td>
                        <td className="p-4 text-right">{formatPrice(item.avgOrderValue)}</td>
                        <td className="p-4 text-right font-semibold text-green-600">{formatPrice(item.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <p>Please select a date range and generate a report to see salesman performance.</p>
        </div>
      )}
    </div>
  );
};

export default SalesmanPerformance;