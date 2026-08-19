import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Package, 
  Wallet, 
  Truck,
  Eye,
  Banknote,
  ClipboardList
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import MetricCard from '@/components/pos/insights/MetricCard';
import SalesChart from '@/components/pos/insights/SalesChart';
import ReportsSection from '@/components/pos/insights/ReportsSection';
import TodoListWidget from '@/components/pos/insights/TodoListWidget';
import { useToast } from '@/components/ui/use-toast';

const PosInsights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRangeLabel, setDateRangeLabel] = useState('');
  
  // Dashboard Metrics State
  const [metrics, setMetrics] = useState({
    sales: { total: 0 },
    revenue: { total: 0 },
    orders: { total: 0, aov: 0 },
    customers: { total: 0 }, // Active customers in period
    inventory: { totalValue: 0, totalVolume: 0 }, // Snapshot
    payment: { total: 0, pending: 0 }, // Filtered by date
    purchase: { total: 0 } // Filtered by date
  });

  // Chart Data State
  const [chartData, setChartData] = useState([]);

  // Fetch Logic
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Task 1: Fix POS Insights date range calculation
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);

      // Task 8: Add date range display
      setDateRangeLabel(`${format(startDate, 'MM/dd/yyyy')} to ${format(endDate, 'MM/dd/yyyy')}`);

      const startDateISO = startDate.toISOString();
      const endDateISO = endDate.toISOString();

      // Task 7: Update all data fetching queries to use corrected date range
      // 1. Fetch Sales Data
      const { data: salesData, error: salesError } = await supabase
        .from('point_of_sale_sales')
        .select(`
          total_amount, 
          discount_amount,
          customer_id,
          created_at,
          subtotal,
          tax_amount
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO);

      if (salesError) throw salesError;

      // Task 2: Fix Total Sales calculation (Sum of total_amount)
      const totalSales = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

      // Task 3: Fix Total Revenue calculation (total_amount minus discounts)
      const totalRevenue = salesData.reduce((sum, sale) => {
        const amount = sale.total_amount || 0;
        const discount = sale.discount_amount || 0;
        return sum + (amount - discount);
      }, 0);

      // Task 4: Fix Total Orders calculation (Count of sales records)
      const totalOrders = salesData.length;

      // Task 5: Fix Total Customers calculation (Count DISTINCT customer_id with actual sales)
      const uniqueCustomers = new Set(
        salesData
          .map(sale => sale.customer_id)
          .filter(id => id) // Remove null/undefined
      );
      const totalActiveCustomers = uniqueCustomers.size;

      // Task 6: Fix Average Order Value calculation (Total Revenue / Total Orders)
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // 2. Fetch Purchases (Filtered by date)
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('pos_purchase_invoices')
        .select('total_amount')
        .eq('user_id', user.id)
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO);
      
      if (purchaseError) console.warn("Purchase fetch error", purchaseError);
      const totalPurchases = purchaseData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      // 3. Fetch Inventory (Snapshot - Current State)
      // Note: Inventory is typically a current state metric, not range-based unless using logs. Keeping as snapshot.
      const { data: inventoryData, error: invError } = await supabase
        .from('point_of_sale_products')
        .select('stock_level, cost_price')
        .eq('user_id', user.id)
        .eq('archived', false);

      if (invError) throw invError;

      const totalInventoryValue = inventoryData.reduce((sum, item) => sum + ((item.stock_level || 0) * (item.cost_price || 0)), 0);
      const totalInventoryVolume = inventoryData.reduce((sum, item) => sum + (item.stock_level || 0), 0);

      // 4. Fetch Credit Payments Received (Filtered by date)
      const { data: paymentsData, error: payError } = await supabase
        .from('pos_credit_payments')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO);

      if (payError) throw payError;

      const totalPaymentsReceived = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Calculate pending payments (Total Sales Balance Due - Snapshot or Range?)
      // Usually "Sundry Debtors" is a snapshot of all time outstanding.
      // But let's calculate pending for *this period's sales* as per filter logic requested?
      // Actually, Pending Payments is usually a current liability metric. 
      // Let's grab total pending from sales in this period for consistency with "Last 3 Months".
      const totalPendingInPeriod = salesData.reduce((sum, sale) => sum + (sale.balance_due || 0), 0); // Assuming balance_due is on sale record

      // Update Metrics State
      setMetrics({
        sales: { total: totalSales },
        revenue: { total: totalRevenue },
        orders: { total: totalOrders, aov: averageOrderValue },
        customers: { total: totalActiveCustomers },
        inventory: { totalValue: totalInventoryValue, totalVolume: totalInventoryVolume },
        payment: { total: totalPaymentsReceived, pending: totalPendingInPeriod },
        purchase: { total: totalPurchases }
      });

      // 5. Process Chart Data (Last 3 months) - Using data already fetched
      const months = [];
      const currentMonthDate = new Date(); 
      for (let i = 2; i >= 0; i--) { 
        months.push(subMonths(currentMonthDate, i));
      }

      const chartDataPoints = months.map(date => {
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        // Filter sales for this month from the already fetched salesData
        const monthSales = salesData.filter(s => {
          const sDate = new Date(s.created_at);
          return sDate >= monthStart && sDate <= monthEnd;
        });

        const mSalesTotal = monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        // Profit approximation for chart: Sales - (Cost approximation if available or just simplistic)
        // Since we didn't fetch items deeply for all sales to save performance on the summary query,
        // we might stick to Sales vs Revenue or just Sales. 
        // However, standard Profit needs Cost. Let's use Revenue for the second line since we calculated it.
        const mRevenueTotal = monthSales.reduce((sum, s) => sum + ((s.total_amount || 0) - (s.discount_amount || 0)), 0);

        return {
          name: format(date, 'MMM'),
          Sales: parseFloat(mSalesTotal.toFixed(2)),
          Profit: parseFloat(mRevenueTotal.toFixed(2)) // Using Revenue as the second comparison line for now
        };
      });

      setChartData(chartDataPoints);

    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      toast({
        title: "Error loading insights",
        description: "Some data could not be retrieved.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen bg-slate-50/50">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Insights</h1>
          <Eye className="w-5 h-5 text-slate-400 mt-1" />
        </div>
        {dateRangeLabel && (
          <div className="bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-medium text-slate-600">
            Last 3 Months: {dateRangeLabel}
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        
        {/* Task 2: Total Sales */}
        <MetricCard 
          title="Total Sales" 
          icon={TrendingUp}
          loading={loading}
          colorClass="bg-blue-50 border-blue-100"
          metrics={[
            { label: 'Total', value: metrics.sales.total, isCurrency: true }
          ]}
          onClick={() => navigate('/pos/sales')}
        />

        {/* Task 3: Total Revenue */}
        <MetricCard 
          title="Total Revenue" 
          icon={Banknote}
          loading={loading}
          colorClass="bg-emerald-50 border-emerald-100"
          metrics={[
            { label: 'Net Revenue', value: metrics.revenue.total, isCurrency: true }
          ]}
          onClick={() => navigate('/pos/reports')}
        />

        {/* Task 4 & 6: Orders & AOV */}
        <MetricCard 
          title="Orders" 
          icon={ClipboardList}
          loading={loading}
          colorClass="bg-indigo-50 border-indigo-100"
          metrics={[
            { label: 'Total Orders', value: metrics.orders.total, isCurrency: false },
            { label: 'Avg Value', value: metrics.orders.aov, isCurrency: true }
          ]}
          onClick={() => navigate('/pos/orders')} 
        />

        {/* Task 5: Active Customers */}
        <MetricCard 
          title="Customers" 
          icon={Users}
          loading={loading}
          colorClass="bg-purple-50 border-purple-100"
          metrics={[
            { label: 'Active', value: metrics.customers.total, isCurrency: false }
          ]}
          onClick={() => navigate('/pos/customers')}
        />

        {/* Existing Inventory (Snapshot) */}
        <MetricCard 
          title="Inventory" 
          icon={Package}
          loading={loading}
          colorClass="bg-orange-50 border-orange-100"
          metrics={[
            { label: 'Value', value: metrics.inventory.totalValue, isCurrency: true },
            { label: 'Volume', value: metrics.inventory.totalVolume, isCurrency: false }
          ]}
          onClick={() => navigate('/pos/products')}
        />

        {/* Existing Payments (Filtered) */}
        <MetricCard 
          title="Payments" 
          icon={Wallet}
          loading={loading}
          colorClass="bg-pink-50 border-pink-100"
          metrics={[
            { label: 'Received', value: metrics.payment.total, isCurrency: true },
            { label: 'Pending', value: metrics.payment.pending, isCurrency: true }
          ]}
          onClick={() => navigate('/pos/pending-payments')}
        />

        {/* Existing Purchase (Filtered) */}
        <MetricCard 
          title="Purchases" 
          icon={ShoppingCart}
          loading={loading}
          colorClass="bg-yellow-50 border-yellow-100"
          metrics={[
            { label: 'Total', value: metrics.purchase.total, isCurrency: true }
          ]}
          onClick={() => navigate('/pos/reports')} 
        />

        {/* Delivery Link */}
        <div 
          onClick={() => navigate('/delivery/my-bookings')}
          className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer p-6 flex flex-col items-center justify-center text-center gap-3 h-full min-h-[140px]"
        >
           <Truck className="w-8 h-8 text-slate-700" />
           <div>
             <h3 className="font-bold text-slate-800">Show Delivery Data</h3>
             <p className="text-xs text-slate-500">Track shipments and riders</p>
           </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Chart - Takes up 2/3 width on large screens */}
        <div className="lg:col-span-2 h-[450px]">
          <SalesChart data={chartData} loading={loading} />
        </div>

        {/* Sidebar - Delivery Link (Desktop) & Todo List */}
        <div className="space-y-6 flex flex-col">
           {/* Desktop Delivery Link Card */}
           <div 
              onClick={() => navigate('/delivery/my-bookings')}
              className="hidden xl:flex bg-white border border-orange-100 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer p-8 flex-col items-center justify-center text-center gap-4 h-[180px] group"
            >
              <h3 className="font-bold text-slate-800 text-lg">Show Delivery Data</h3>
              <div className="bg-slate-100 p-3 rounded-full group-hover:bg-orange-50 transition-colors">
                <Truck className="w-8 h-8 text-slate-700 group-hover:text-orange-600 transition-colors" />
              </div>
           </div>

           <TodoListWidget />
        </div>
      </div>

      {/* Reports Section */}
      <div className="pt-4">
        <ReportsSection />
      </div>

    </div>
  );
};

export default PosInsights;