import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { eachMonthOfInterval, endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths, subYears } from 'date-fns';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Wallet,
  CalendarDays,
  Banknote,
  ClipboardList,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import MetricCard from '@/components/pos/insights/MetricCard';
import SalesChart from '@/components/pos/insights/SalesChart';
import InventoryOverview from '@/components/pos/insights/InventoryOverview';
import PaymentsPurchasesOverview from '@/components/pos/insights/PaymentsPurchasesOverview';
import DeliveryOverview from '@/components/pos/insights/DeliveryOverview';
import ReportsSection from '@/components/pos/insights/ReportsSection';
import TodoListWidget from '@/components/pos/insights/TodoListWidget';
import RecentSales from '@/components/pos/insights/RecentSales';
import OnlineOrders from '@/components/pos/insights/OnlineOrders';
import StockAttention from '@/components/pos/insights/StockAttention';
import PendingPayments from '@/components/pos/insights/PendingPayments';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePosData } from '@/contexts/PosDataContext';

const dateRangePresets = [
  ['this_month', 'This Month'],
  ['last_month', 'Last Month'],
  ['last_3_months', 'Last 3 Months'],
  ['last_6_months', 'Last 6 Months'],
  ['this_year', 'This Year'],
  ['last_year', 'Last Year'],
];

const getPresetDateRange = preset => {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  if (preset === 'this_month') return { startDate: startOfMonth(now), endDate: now };
  if (preset === 'last_month') {
    const lastMonth = subMonths(now, 1);
    return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
  }
  if (preset === 'last_6_months') return { startDate: startOfMonth(subMonths(now, 5)), endDate: now };
  if (preset === 'this_year') return { startDate: startOfYear(now), endDate: now };
  if (preset === 'last_year') {
    const lastYear = subYears(now, 1);
    return { startDate: startOfYear(lastYear), endDate: endOfYear(lastYear) };
  }
  return { startDate: startOfMonth(subMonths(now, 2)), endDate: now };
};

const PosInsights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { businessId, hasPermission } = usePosData();
  const [loading, setLoading] = useState(true);
  const [dateRangePreset, setDateRangePreset] = useState('last_3_months');
  const [dateRangeLabel, setDateRangeLabel] = useState('');
  
  // Dashboard Metrics State
  const [metrics, setMetrics] = useState({
    sales: { total: 0 },
    revenue: { total: 0 },
    orders: { total: 0, aov: 0 },
    customers: { total: 0 }, // Active customers in period
    inventory: { totalValue: 0, totalVolume: 0, totalProducts: 0, inStockProducts: 0, outOfStockProducts: 0 }, // Snapshot
    payment: { total: 0, pending: 0 }, // Filtered by date
    purchase: { total: 0 } // Filtered by date
  });

  // Chart Data State
  const [chartData, setChartData] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [onlineOrdersLoading, setOnlineOrdersLoading] = useState(true);
  const [onlineOrdersError, setOnlineOrdersError] = useState(false);
  const [stockAttention, setStockAttention] = useState({ lowStockCount: 0, outOfStockCount: 0, products: [] });
  const [stockAttentionError, setStockAttentionError] = useState(false);
  const [pendingPayments, setPendingPayments] = useState({ total: 0, customerCount: 0, entries: [] });
  const [pendingPaymentsLoading, setPendingPaymentsLoading] = useState(true);
  const [pendingPaymentsError, setPendingPaymentsError] = useState(false);

  const fetchPendingPayments = useCallback(async () => {
    if (!user) return;
    setPendingPaymentsLoading(true);
    setPendingPaymentsError(false);

    try {
      const creditSales = [];
      const pageSize = 1000;
      let page = 0;

      while (true) {
        const pageStart = page * pageSize;
        const { data, error } = await supabase
          .from('point_of_sale_sales')
          .select(`
            id,
            invoice_number,
            bill_number,
            balance_due,
            created_at,
            customer_id,
            customer:point_of_sale_customers(id, name)
          `)
          .eq('user_id', user.id)
          .eq('payment_method', 'Credit')
          .gt('balance_due', 0.50)
          .neq('payment_status', 'Paid')
          .order('balance_due', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(pageStart, pageStart + pageSize - 1);

        if (error) throw error;
        creditSales.push(...(data || []));
        if (!data || data.length < pageSize) break;
        page += 1;
      }

      const total = creditSales.reduce((sum, sale) => sum + (Number(sale.balance_due) || 0), 0);
      const customerCount = new Set(creditSales.map(sale => sale.customer_id).filter(Boolean)).size;
      setPendingPayments({ total, customerCount, entries: creditSales.slice(0, 5) });
    } catch (error) {
      console.error('Pending payments widget fetch error:', error);
      setPendingPayments({ total: 0, customerCount: 0, entries: [] });
      setPendingPaymentsError(true);
    } finally {
      setPendingPaymentsLoading(false);
    }
  }, [user]);

  const fetchOnlineOrders = useCallback(async () => {
    if (!businessId || !hasPermission('orders')) {
      setOnlineOrders([]);
      setOnlineOrdersLoading(false);
      return;
    }

    setOnlineOrdersLoading(true);
    setOnlineOrdersError(false);

    try {
      const { startDate, endDate } = getPresetDateRange(dateRangePreset);
      const { data, error } = await supabase
        .from('digital_shop_orders')
        .select('id, total_amount, status, created_at')
        .eq('retailer_id', businessId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setOnlineOrders(data || []);
    } catch (error) {
      console.error('Online orders widget fetch error:', error);
      setOnlineOrders([]);
      setOnlineOrdersError(true);
    } finally {
      setOnlineOrdersLoading(false);
    }
  }, [businessId, dateRangePreset, hasPermission]);

  // Fetch Logic
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { startDate, endDate } = getPresetDateRange(dateRangePreset);

      // Task 8: Add date range display
      setDateRangeLabel(`${format(startDate, 'dd MMM yyyy')} – ${format(endDate, 'dd MMM yyyy')}`);

      const startDateISO = startDate.toISOString();
      const endDateISO = endDate.toISOString();

      // Task 7: Update all data fetching queries to use corrected date range
      // 1. Fetch Sales Data
      // Supabase projects commonly cap a single response at 1,000 rows. Fetch
      // the selected period in deterministic pages so every order contributes
      // to the existing dashboard metrics and chart calculations.
      const salesData = [];
      const salesPageSize = 1000;
      let salesPage = 0;

      while (true) {
        const pageStart = salesPage * salesPageSize;
        const { data: salesPageData, error: salesError } = await supabase
          .from('point_of_sale_sales')
          .select(`
            id,
            total_amount,
            discount_amount,
            customer_id,
            created_at,
            subtotal,
            tax_amount,
            invoice_number,
            bill_number,
            payment_method
          `)
          .eq('user_id', user.id)
          .gte('created_at', startDateISO)
          .lte('created_at', endDateISO)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(pageStart, pageStart + salesPageSize - 1);

        if (salesError) throw salesError;

        salesData.push(...(salesPageData || []));
        if (!salesPageData || salesPageData.length < salesPageSize) break;
        salesPage += 1;
      }

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
        .select('id, name, stock_level, low_stock_threshold, is_service, cost_price')
        .eq('user_id', user.id)
        .eq('archived', false);

      if (invError) {
        setStockAttentionError(true);
        throw invError;
      }
      setStockAttentionError(false);

      const totalInventoryValue = inventoryData.reduce((sum, item) => sum + ((item.stock_level || 0) * (item.cost_price || 0)), 0);
      const totalInventoryVolume = inventoryData.reduce((sum, item) => sum + (item.stock_level || 0), 0);
      const totalInventoryProducts = inventoryData.length;
      const inStockProducts = inventoryData.filter(item => Number(item.stock_level || 0) > 0).length;
      const outOfStockProducts = totalInventoryProducts - inStockProducts;
      const outOfStockItems = inventoryData
        .filter(item => Number(item.stock_level || 0) <= 0)
        .sort((a, b) => Number(a.stock_level || 0) - Number(b.stock_level || 0) || String(a.name || '').localeCompare(String(b.name || '')));
      const lowStockItems = inventoryData
        .filter(item => !item.is_service
          && Number(item.stock_level || 0) > 0
          && Number(item.stock_level || 0) <= Number(item.low_stock_threshold || 0))
        .sort((a, b) => Number(a.stock_level || 0) - Number(b.stock_level || 0) || String(a.name || '').localeCompare(String(b.name || '')));

      setStockAttention({
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockProducts,
        products: [...outOfStockItems, ...lowStockItems].slice(0, 5)
      });

      // 4. Fetch Credit Payments Received (Filtered by date)
      const { data: paymentsData, error: payError } = await supabase
        .from('pos_credit_payments')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO);

      if (payError) throw payError;

      const totalPaymentsReceived = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Update Metrics State
      setMetrics({
        sales: { total: totalSales },
        revenue: { total: totalRevenue },
        orders: { total: totalOrders, aov: averageOrderValue },
        customers: { total: totalActiveCustomers },
        inventory: { totalValue: totalInventoryValue, totalVolume: totalInventoryVolume, totalProducts: totalInventoryProducts, inStockProducts, outOfStockProducts },
        payment: { total: totalPaymentsReceived, pending: 0 },
        purchase: { total: totalPurchases }
      });

      // 5. Process monthly chart data for the selected preset using the sales
      // records already fetched above.
      const months = eachMonthOfInterval({ start: startDate, end: endDate });

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
      setRecentSales(salesData.slice(-5).reverse());

    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      setRecentSales([]);
      toast({
        title: "Error loading insights",
        description: "Some data could not be retrieved.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, dateRangePreset]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchOnlineOrders();
  }, [fetchOnlineOrders]);

  useEffect(() => {
    fetchPendingPayments();
  }, [fetchPendingPayments]);

  const accountName = user?.user_metadata?.business_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || 'there';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen bg-[#F6F8FC] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-[1600px] space-y-7 lg:space-y-8">
      
      {/* Header */}
      <header className="relative flex min-h-[112px] flex-col justify-center gap-5 overflow-hidden rounded-[20px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-blue-50/60 px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)] sm:px-6 xl:flex-row xl:items-center xl:justify-between xl:py-4">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-blue-100/50 blur-3xl" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Business Overview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{greeting}, {accountName}!</h1>
          <p className="mt-1.5 text-sm text-slate-500">Here&apos;s what&apos;s happening with your business today.</p>
        </div>
        <div className="relative flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
          {dateRangeLabel && (
            <div className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-sm transition-colors hover:border-blue-300 sm:w-[290px]" aria-label={`Dashboard period: ${dateRangeLabel}`}>
              <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
                  <SelectTrigger aria-label="Dashboard date range preset" className="h-5 border-0 bg-transparent p-0 text-xs font-bold text-slate-700 shadow-none hover:bg-transparent focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangePresets.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{dateRangeLabel}</p>
              </div>
            </div>
          )}
          <button type="button" onClick={() => navigate('/pos/point-of-sale')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Bill
          </button>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        
        {/* Task 2: Total Sales */}
        <MetricCard 
          title="Total Sales" 
          icon={TrendingUp}
          loading={loading}
          accentClass="border-blue-200 bg-blue-50 text-blue-600"
          metrics={[
            { label: 'Total', value: metrics.sales.total, isCurrency: true }
          ]}
          onClick={() => navigate('/pos/reports')}
        />

        {/* Task 3: Total Revenue */}
        <MetricCard 
          title="Total Revenue" 
          icon={Banknote}
          loading={loading}
          accentClass="border-emerald-200 bg-emerald-50 text-emerald-600"
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
          accentClass="border-indigo-200 bg-indigo-50 text-indigo-600"
          metricGridClass="grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]"
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
          accentClass="border-violet-200 bg-violet-50 text-violet-600"
          metrics={[
            { label: 'Active', value: metrics.customers.total, isCurrency: false }
          ]}
          onClick={() => navigate('/pos/customers')}
        />

        {/* Pending Payments (existing dashboard value) */}
        <MetricCard 
          title="Pending Payments"
          icon={Wallet}
          loading={pendingPaymentsLoading || pendingPaymentsError}
          accentClass="border-amber-200 bg-amber-50 text-amber-600"
          metrics={[
            { label: 'Pending', value: pendingPayments.total, isCurrency: true }
          ]}
          onClick={() => navigate('/pos/credit')}
        />

        {/* Existing safe stock-attention count */}
        <MetricCard 
          title="Out of Stock"
          icon={Package}
          loading={loading}
          accentClass="border-red-200 bg-red-50 text-red-600"
          metrics={[
            { label: 'Products', value: metrics.inventory.outOfStockProducts, isCurrency: false }
          ]}
          onClick={() => navigate('/pos/products')}
        />

      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 items-start gap-7 xl:grid-cols-[minmax(0,1.85fr)_minmax(300px,.75fr)]">
        
        {/* Sales Chart - Takes up 2/3 width on large screens */}
        <div className="min-w-0">
          <SalesChart data={chartData} loading={loading} />
        </div>

        {/* Sidebar - Todo List */}
        <div className="space-y-6 flex flex-col">
           <TodoListWidget
             outOfStockCount={metrics.inventory.outOfStockProducts}
             onNewBill={() => navigate('/pos/point-of-sale')}
             onCustomers={() => navigate('/pos/customers')}
             onProducts={() => navigate('/pos/products')}
             onPurchases={() => navigate('/pos/purchase-bill-entry')}
             onCredit={() => navigate('/pos/credit')}
             onSmartReorder={() => navigate('/pos/smart-reorder')}
           />
        </div>
      </div>

      <section aria-labelledby="operations-heading" className="space-y-4">
        <div>
          <h2 id="operations-heading" className="text-lg font-bold text-slate-900">Operations</h2>
          <p className="mt-1 text-xs text-slate-500">What needs your attention right now.</p>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-2 2xl:grid-cols-4">
          <StockAttention
            attention={stockAttention}
            loading={loading}
            hasError={stockAttentionError}
            onViewProducts={() => navigate('/pos/products')}
            onSmartReorder={() => navigate('/pos/smart-reorder')}
          />

          <PendingPayments
            data={pendingPayments}
            loading={pendingPaymentsLoading}
            hasError={pendingPaymentsError}
            onViewCredit={() => navigate('/pos/credit')}
          />

          <RecentSales
            sales={recentSales}
            loading={loading}
            onViewAll={() => navigate('/pos/reports')}
            onNewBill={() => navigate('/pos/point-of-sale')}
          />

          <OnlineOrders
            orders={onlineOrders}
            loading={onlineOrdersLoading}
            hasError={onlineOrdersError}
            onViewAll={() => navigate('/pos/orders')}
          />
        </div>
      </section>

      <section aria-labelledby="business-overview-heading" className="space-y-4">
        <div>
          <h2 id="business-overview-heading" className="text-lg font-bold text-slate-900">Business Overview</h2>
          <p className="mt-1 text-xs text-slate-500">Supporting inventory and finance context.</p>
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-[1.08fr_.92fr]">
          <InventoryOverview
            inventory={metrics.inventory}
            loading={loading}
            onViewProducts={() => navigate('/pos/products')}
            onOpenSmartReorder={() => navigate('/pos/smart-reorder')}
          />

          <PaymentsPurchasesOverview
            payment={{ ...metrics.payment, pending: pendingPayments.total }}
            purchase={metrics.purchase}
            loading={loading}
            pendingLoading={pendingPaymentsLoading}
            pendingError={pendingPaymentsError}
            onViewPending={() => navigate('/pos/credit')}
            onViewCredit={() => navigate('/pos/credit')}
            onViewPurchases={() => navigate('/pos/purchase-bill-entry')}
          />
        </div>
      </section>

      <div>
        <DeliveryOverview
          onViewDeliveries={() => navigate('/delivery/my-bookings')}
          onBookDelivery={() => navigate('/delivery/book')}
        />
      </div>

      <div>
        <ReportsSection />
      </div>

      </div>
    </div>
  );
};

export default PosInsights;
