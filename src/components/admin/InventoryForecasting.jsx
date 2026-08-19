import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { TrendingUp, Package } from 'lucide-react';

const InventoryForecasting = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const handleGenerateReport = async () => {
    if (!days || days <= 0) {
      toast({ title: "Invalid Period", description: "Please enter a valid number of days.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let orderItemsQuery = supabase
        .from('order_items')
        .select(`
          quantity,
          products!inner(id, name, stock, seller_id),
          orders!inner(created_at)
        `)
        .gte('orders.created_at', startDate.toISOString());
      
      if (user?.profile?.role === 'seller') {
        orderItemsQuery = orderItemsQuery.eq('products.seller_id', user.id);
      }

      const { data: orderItems, error: orderItemsError } = await orderItemsQuery;
      if (orderItemsError) throw orderItemsError;

      const productSales = orderItems.reduce((acc, item) => {
        const productId = item.products.id;
        if (!acc[productId]) {
          acc[productId] = {
            ...item.products,
            totalSold: 0,
          };
        }
        acc[productId].totalSold += item.quantity;
        return acc;
      }, {});

      const forecast = Object.values(productSales).map(product => {
        const dailyAvg = product.totalSold / days;
        const daysOfStock = product.stock > 0 && dailyAvg > 0 ? Math.floor(product.stock / dailyAvg) : (product.stock > 0 ? Infinity : 0);
        return {
          ...product,
          dailyAvg: dailyAvg.toFixed(2),
          daysOfStock,
        };
      }).sort((a, b) => a.daysOfStock - b.daysOfStock);

      setReportData(forecast);

    } catch (error) {
      toast({ title: "Error generating forecast", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (days) => {
    if (days === 0) return 'text-red-600';
    if (days < 7) return 'text-orange-600';
    if (days < 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="pt-8">
      <Card className="glass-effect mb-8">
        <CardHeader>
            <CardTitle>Inventory Forecasting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="forecast-days">Sales Period (Last X Days)</Label>
              <Input id="forecast-days" type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} min="1" />
            </div>
            <Button onClick={handleGenerateReport} disabled={loading} className="btn-primary">
              {loading ? 'Generating...' : 'Generate Forecast'}
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
                      <th className="p-4 font-semibold">Product</th>
                      <th className="p-4 font-semibold text-right">Current Stock</th>
                      <th className="p-4 font-semibold text-right">Avg. Daily Sales</th>
                      <th className="p-4 font-semibold text-right">Est. Days of Stock Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="p-4 font-medium flex items-center gap-2"><Package className="h-4 w-4 text-slate-500" />{item.name}</td>
                        <td className="p-4 text-right">{item.stock}</td>
                        <td className="p-4 text-right">{item.dailyAvg}</td>
                        <td className={`p-4 text-right font-bold ${getStockStatusColor(item.daysOfStock)}`}>
                          {item.daysOfStock === Infinity ? 'N/A (No Sales)' : `${item.daysOfStock} days`}
                        </td>
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
          <p>Please enter a period and generate a forecast to see inventory predictions.</p>
        </div>
      )}
    </div>
  );
};

export default InventoryForecasting;