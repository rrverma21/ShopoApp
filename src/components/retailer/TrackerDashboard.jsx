import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { DollarSign, ShoppingBag, Receipt, ArrowUpRight, Calculator, TrendingUp, ShoppingCart, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { cn, formatPrice } from '@/lib/utils';

// Pastel color palette matching POS style
const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

const TrackerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Data States
  const [salesData, setSalesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    salesGrowth: 0,
    totalExpenses: 0,
    expensesGrowth: 0,
    netProfit: 0,
    profitGrowth: 0,
    newOrders: 0,
    ordersGrowth: 0
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const userId = user.id;
    const now = new Date();
    const currentMonthStr = format(now, 'yyyy-MM');
    const lastMonthStr = format(subMonths(now, 1), 'yyyy-MM');
    
    const thisMonthStart = startOfMonth(now).toISOString();
    const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
    const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

    try {
      const [salesRes, expensesRes] = await Promise.all([
        supabase.rpc('get_monthly_sales_analytics', { p_user_id: userId }),
        supabase.rpc('get_monthly_bill_analytics', { p_user_id: userId })
      ]);

      if (salesRes.error) throw salesRes.error;
      if (expensesRes.error) throw expensesRes.error;

      setSalesData(salesRes.data || []);
      setExpensesData(expensesRes.data || []);

      const currentSalesObj = salesRes.data.find(d => d.month_start === currentMonthStr) || { total_sales: 0 };
      const lastSalesObj = salesRes.data.find(d => d.month_start === lastMonthStr) || { total_sales: 0 };
      
      const currentExpObj = expensesRes.data.find(d => d.month_start === currentMonthStr) || { total_amount: 0 };
      const lastExpObj = expensesRes.data.find(d => d.month_start === lastMonthStr) || { total_amount: 0 };

      const currentSales = Number(currentSalesObj.total_sales);
      const lastSales = Number(lastSalesObj.total_sales);
      const currentExp = Number(currentExpObj.total_amount);
      const lastExp = Number(lastExpObj.total_amount);

      const currentProfit = currentSales - currentExp;
      const lastProfit = lastSales - lastExp;

      const { count: currentOrdersCount } = await supabase
        .from('point_of_sale_sales')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thisMonthStart);

      const { count: lastOrdersCount } = await supabase
        .from('point_of_sale_sales')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', lastMonthStart)
        .lte('created_at', lastMonthEnd);

      const [categoriesRes, productsRes] = await Promise.all([
        supabase.rpc('get_top_revenue_categories', { 
          p_user_id: userId, 
          p_start_date: thisMonthStart 
        }),
        supabase.rpc('get_top_revenue_products', { 
          p_user_id: userId, 
          p_start_date: thisMonthStart 
        })
      ]);

      setTopCategories(categoriesRes.data || []);
      setTopProducts(productsRes.data || []);

      const calculateGrowth = (current, last) => {
        if (last === 0) return current > 0 ? 100 : 0;
        return ((current - last) / last) * 100;
      };

      setStats({
        totalSales: currentSales,
        salesGrowth: calculateGrowth(currentSales, lastSales),
        totalExpenses: currentExp,
        expensesGrowth: calculateGrowth(currentExp, lastExp),
        netProfit: currentProfit,
        profitGrowth: calculateGrowth(currentProfit, lastProfit),
        newOrders: currentOrdersCount || 0,
        ordersGrowth: calculateGrowth(currentOrdersCount || 0, lastOrdersCount || 0)
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load live dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const combinedMonthlyData = salesData.map((sale) => {
    const expense = expensesData.find(e => e.month_start === sale.month_start);
    return {
      name: format(new Date(sale.month_start), 'MMM yy'),
      Sales: Number(sale.total_sales),
      Expenses: expense ? Number(expense.total_amount) : 0
    };
  });

  const pieData = topCategories.map(c => ({
    name: c.category_name || 'Uncategorized',
    value: Number(c.total_revenue)
  }));

  const barData = topProducts.map(p => ({
    name: p.product_name,
    sales: Number(p.total_revenue)
  })).slice(0, 5);

  const StatCard = ({ title, value, growth, icon: Icon, colorClass, borderColorClass }) => (
    <Card className={cn("shadow-sm hover:shadow-md transition-all duration-300 border-l-4", borderColorClass)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-full bg-opacity-10", colorClass.replace('text-', 'bg-'))}>
            <Icon className={cn("h-4 w-4", colorClass)} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
           <Skeleton className="h-8 w-24 mb-2" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className={cn("text-xs flex items-center mt-1", growth >= 0 ? "text-emerald-600" : "text-rose-600")}>
              <TrendingUp className={cn("h-3 w-3 mr-1", growth < 0 && "rotate-180")} />
              {Math.abs(growth).toFixed(1)}% from last month
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>DIOR Overview | B2B Nexus</title>
      </Helmet>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Sales (Monthly)" 
          value={formatPrice(stats.totalSales)} 
          growth={stats.salesGrowth} 
          icon={DollarSign}
          colorClass="text-indigo-600"
          borderColorClass="border-indigo-500"
        />
        <StatCard 
          title="Total Expenses" 
          value={formatPrice(stats.totalExpenses)} 
          growth={stats.expensesGrowth} 
          icon={ShoppingBag}
          colorClass="text-rose-600"
          borderColorClass="border-rose-500"
        />
        <StatCard 
          title="Net Profit" 
          value={formatPrice(stats.netProfit)} 
          growth={stats.profitGrowth} 
          icon={ArrowUpRight}
          colorClass="text-emerald-600"
          borderColorClass="border-emerald-500"
        />
        <StatCard 
          title="Total Transactions" 
          value={stats.newOrders} 
          growth={stats.ordersGrowth} 
          icon={Receipt}
          colorClass="text-amber-600"
          borderColorClass="border-amber-500"
        />
      </div>

      <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            {loading ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedMonthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    tickFormatter={(value) => `₹${value/1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: '8px',
                      color: 'var(--foreground)'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="Sales" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Expenses" 
                    stroke="#ec4899" 
                    strokeWidth={3} 
                    dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[300px] w-full">
               {loading ? (
                 <Skeleton className="w-full h-full rounded-full" />
               ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatPrice(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-muted-foreground">No category data available</div>
               )}
             </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-slate-800"/>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      formatter={(value) => formatPrice(value)}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={20}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">No product data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Link to="/pos">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Calculator className="h-4 w-4 mr-2" />
              Open POS
            </Button>
          </Link>
          <Link to="/dior/sales">
            <Button variant="outline" className="bg-white dark:bg-slate-950 hover:bg-slate-100">
              <TrendingUp className="h-4 w-4 mr-2" />
              Manage Sales
            </Button>
          </Link>
          <Link to="/dior/expenses">
            <Button variant="outline" className="bg-white dark:bg-slate-950 hover:bg-slate-100">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </Link>
          <Link to="/dior/gst-register">
            <Button variant="outline" className="bg-white dark:bg-slate-950 hover:bg-slate-100">
              <ClipboardList className="h-4 w-4 mr-2" />
              GST Register
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackerDashboard;