import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { usePosData } from "@/contexts/PosDataContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "chartjs-adapter-date-fns";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  parse,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths
} from "date-fns";
import { useToast } from "../ui/use-toast";
import { formatPrice } from "@/lib/utils";
import {
  Crown,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Calendar as CalendarIcon,
  BarChart,
  ListOrdered,
  RotateCcw
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartDataLabels,
  Filler
);

const DynamicPeriodicReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [period, setPeriod] = useState("today");
  const [topProductsLimit, setTopProductsLimit] = useState("10");
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    const now = new Date();
    let from, to;
    switch (value) {
      case "today":
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        from = startOfDay(yesterday);
        to = endOfDay(yesterday);
        break;
      case "this_week":
        from = startOfWeek(now);
        to = endOfWeek(now);
        break;
      case "last_week":
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        const lastWeekEnd = endOfWeek(subWeeks(now, 1));
        from = lastWeekStart;
        to = lastWeekEnd;
        break;
      case "this_month":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case "last_month":
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        from = lastMonthStart;
        to = lastMonthEnd;
        break;
      default:
        return;
    }
    setDateRange({ from, to });
  };

  const generateReport = useCallback(async () => {
    if (!user || !dateRange.from || !dateRange.to) return;
    setIsLoading(true);
    try {
      const fromISO = dateRange.from.toISOString();
      const toISO = dateRange.to.toISOString();

      const { data: sales, error: salesError } = await supabase
        .from("point_of_sale_sales")
        .select(
          "total_amount, refund_amount, sale_items:point_of_sale_sale_items(quantity, is_refunded, product:point_of_sale_products(cost_price))"
        )
        .eq("user_id", user.id)
        .gte("created_at", fromISO)
        .lte("created_at", toISO);

      if (salesError) throw salesError;

      const totalNetSales = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
      const totalRefunds = sales.reduce((sum, s) => sum + (Number(s.refund_amount) || 0), 0);
      const totalGrossSales = totalNetSales + totalRefunds;
      
      const totalCost = sales.reduce((sum, s) => {
        if (!s.sale_items) return sum;
        return (
          sum +
          s.sale_items.reduce((itemSum, i) => {
            if (!i.product || i.is_refunded) return itemSum; // Only count cost of unrefunded items
            return itemSum + i.product.cost_price * i.quantity;
          }, 0)
        );
      }, 0);

      const { data: topProducts, error: topProductsError } = await supabase.rpc(
        "get_top_revenue_products",
        { p_user_id: user.id, p_start_date: fromISO, p_end_date: toISO, p_limit: parseInt(topProductsLimit) }
      );
      if (topProductsError) throw topProductsError;

      const { data: topCategories, error: topCategoriesError } = await supabase.rpc(
        "get_top_revenue_categories",
        { p_user_id: user.id, p_start_date: fromISO, p_end_date: toISO, p_limit: 10 }
      );
      if (topCategoriesError) throw topCategoriesError;

      setReportData({
        totalGrossSales,
        totalNetSales,
        totalRefunds,
        totalProfit: totalNetSales - totalCost,
        salesCount: sales.length,
        topProducts,
        topCategories,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Report Error",
        description: "Could not generate the report. " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, dateRange, topProductsLimit, toast]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const categoryChartData = {
    labels: reportData?.topCategories.map((c) => c.category_name || "Uncategorized") || [],
    datasets: [
      {
        label: "Total Net Revenue",
        data: reportData?.topCategories.map((c) => c.total_revenue) || [],
        backgroundColor: "rgba(167, 139, 250, 0.6)",
        borderColor: "rgba(139, 92, 246, 1)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const categoryChartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: "end",
        align: "end",
        formatter: (v) => formatPrice(v),
        color: "#334155",
        font: { weight: "bold", size: 10 },
      },
    },
    scales: {
      x: { beginAtZero: true, ticks: { callback: (v) => formatPrice(v) } },
    },
  };

  return (
    <Card className="shadow-lg border-t-4 border-purple-400">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Dynamic Periodic Report</CardTitle>
        <CardDescription>Analyze net sales performance over specific periods.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-[280px] justify-start text-left font-normal"
                onClick={() => setPeriod("custom")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={generateReport} disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate Report"}
          </Button>
        </div>

        {isLoading && <div className="text-center p-8">Loading report data...</div>}

        {!isLoading && reportData && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Gross Sales", value: formatPrice(reportData.totalGrossSales), icon: <DollarSign className="w-5 h-5 text-gray-500" /> },
                { label: "Refunds", value: formatPrice(reportData.totalRefunds), icon: <RotateCcw className="w-5 h-5 text-orange-500" /> },
                { label: "Net Sales", value: formatPrice(reportData.totalNetSales), icon: <DollarSign className="w-5 h-5 text-blue-500" /> },
                { label: "Net Profit", value: formatPrice(reportData.totalProfit), icon: <TrendingUp className="w-5 h-5 text-green-500" /> },
              ].map((s) => (
                <Card key={s.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                    {s.icon}
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><ListOrdered /> Top Products (Net Rev)</CardTitle>
                    <Select value={topProductsLimit} onValueChange={setTopProductsLimit}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Top 5</SelectItem>
                        <SelectItem value="10">Top 10</SelectItem>
                        <SelectItem value="20">Top 20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    {reportData.topProducts.length > 0 ? (
                      <ol className="space-y-2 pr-4">
                        {reportData.topProducts.map((p, i) => (
                          <li key={p.product_name} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <div className="flex items-center truncate">
                              <span className={`mr-3 font-bold w-6 text-center ${i < 3 ? 'text-amber-500' : 'text-gray-500'}`}>
                                {i === 0 ? <Crown className="inline-block w-5 h-5"/> : `${i + 1}.`}
                              </span>
                              <span className="font-medium truncate" title={p.product_name}>{p.product_name}</span>
                            </div>
                            <span className="font-semibold text-green-600 ml-2">{formatPrice(p.total_revenue)}</span>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="text-center text-muted-foreground pt-10">No product sales data for this period.</p>}
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><BarChart /> Top Categories (Net Rev)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  {reportData.topCategories.length > 0 ? (
                    <Bar options={categoryChartOptions} data={categoryChartData} />
                  ) : <p className="text-center text-muted-foreground pt-10">No category sales data for this period.</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const PosAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { lastSaleTimestamp } = usePosData();
  const [stats, setStats] = useState({
    totalNetSales: 0,
    totalGrossSales: 0,
    totalRefunds: 0,
    totalProfit: 0,
    salesCount: 0,
  });
  const [monthlySalesData, setMonthlySalesData] = useState(null);
  const [topRevenueCategories, setTopRevenueCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      
      const thirtyDaysAgoDate = subDays(today, 29); // 29 days ago + today = 30 days
      const thirtyDaysAgoISO = startOfDay(thirtyDaysAgoDate).toISOString();

      // Daily Stats
      const { data: sales } = await supabase
        .from("point_of_sale_sales")
        .select(
          "total_amount, refund_amount, sale_items:point_of_sale_sale_items(quantity, is_refunded, product:point_of_sale_products(cost_price))"
        )
        .eq("user_id", user.id)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd);

      if (sales) {
        const totalNetSales = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
        const totalRefunds = sales.reduce((sum, s) => sum + (Number(s.refund_amount) || 0), 0);
        const totalGrossSales = totalNetSales + totalRefunds;

        const totalCost = sales.reduce((sum, s) => {
          if (!s.sale_items) return sum;
          return (
            sum +
            s.sale_items.reduce((itemSum, i) => {
              if (!i.product || i.is_refunded) return itemSum;
              return itemSum + i.product.cost_price * i.quantity;
            }, 0)
          );
        }, 0);
        setStats({
          totalNetSales,
          totalGrossSales,
          totalRefunds,
          totalProfit: totalNetSales - totalCost,
          salesCount: sales.length,
        });
      }

      // Top Revenue Categories (RPC gets net sales based on its definition, ensure it aligns with net)
      const { data: topCategories } = await supabase.rpc(
        "get_top_revenue_categories",
        { p_user_id: user.id, p_start_date: thirtyDaysAgoISO, p_end_date: new Date().toISOString(), p_limit: 5 }
      );
      if (topCategories) setTopRevenueCategories(topCategories);

      // Monthly Sales (12 months)
      const { data: monthlyData } = await supabase.rpc(
        "get_monthly_sales_analytics",
        { p_user_id: user.id }
      );

      if (monthlyData) {
        const labels = monthlyData.map((d) =>
          format(parse(d.month_start, "yyyy-MM", new Date()), "MMM yyyy")
        );
        const data = monthlyData.map((d) => d.total_sales);
        setMonthlySalesData({
          labels,
          datasets: [
            {
              label: "Net Monthly Sales",
              data,
              backgroundColor: labels.map(
                (_, i) =>
                  `hsl(${(i * 30) % 360}, 70%, 60%)`
              ),
              borderRadius: 6,
            },
          ],
        });
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
      toast({
        title: "Analytics Error",
        description: "Unable to load dashboard. Try refreshing.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData, lastSaleTimestamp]);

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: "end",
        align: "top",
        formatter: (v) => formatPrice(v),
        color: "#475569",
        font: { weight: "bold" },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v) => formatPrice(v) } },
    },
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-[70vh] text-xl font-medium text-muted-foreground animate-pulse">
        Loading Analytics...
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Business Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Insight overview of your shop’s performance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          {
            label: "Today's Gross",
            value: formatPrice(stats.totalGrossSales),
            icon: <DollarSign className="w-5 h-5 text-gray-500" />,
            color: "from-gray-100 to-gray-50",
          },
          {
            label: "Today's Refunds",
            value: formatPrice(stats.totalRefunds),
            icon: <RotateCcw className="w-5 h-5 text-orange-500" />,
            color: "from-orange-100 to-orange-50",
          },
          {
            label: "Today's Net Sales",
            value: formatPrice(stats.totalNetSales),
            icon: <DollarSign className="w-6 h-6 text-blue-500" />,
            color: "from-blue-100 to-blue-50",
          },
          {
            label: "Today's Profit",
            value: formatPrice(stats.totalProfit),
            icon: <TrendingUp className="w-6 h-6 text-green-500" />,
            color: "from-green-100 to-green-50",
          },
        ].map((s, i) => (
          <Card
            key={i}
            className={`transition transform hover:scale-[1.02] bg-gradient-to-b ${s.color} border border-transparent hover:border-blue-200 dark:hover:border-blue-900 shadow-md hover:shadow-xl dark:from-gray-800 dark:to-gray-800/50`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {s.label}
              </CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Sales (Last 12 Months) - Moved to top as requested */}
      <Card className="shadow-lg border-t-4 border-purple-400">
          <CardHeader><CardTitle className="text-lg font-semibold">Net Monthly Sales (Last 12 Months)</CardTitle></CardHeader>
          <CardContent className="h-96">
              {monthlySalesData ? (
                  <Bar options={barChartOptions} data={monthlySalesData} />
              ) : <p className="text-gray-500 text-center pt-20">No monthly sales data available.</p>}
          </CardContent>
      </Card>

      <DynamicPeriodicReport />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-lg border-t-4 border-amber-400">
            <CardHeader><CardTitle className="text-lg font-semibold">Top 5 Revenue Categories (Last 30 Days)</CardTitle></CardHeader>
            <CardContent className="h-80 overflow-y-auto">
                {topRevenueCategories.length > 0 ? (
                    <ol className="space-y-3">
                        {topRevenueCategories.map((c, index) => (
                            <li key={c.category_name} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                                <div className="flex items-center">
                                    <span className={`mr-3 font-bold w-6 text-center ${index < 3 ? 'text-amber-500' : 'text-gray-500'}`}>
                                        {index === 0 ? <Crown className="inline-block w-5 h-5"/> : `${index + 1}.`}
                                    </span>
                                    <span className="font-medium">{c.category_name || 'Uncategorized'}</span>
                                </div>
                                <span className="font-semibold text-green-600">{formatPrice(c.total_revenue)}</span>
                            </li>
                        ))}
                    </ol>
                ) : <p className="text-gray-500 text-center pt-10">No sales data available to determine top categories.</p>}
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PosAnalytics;