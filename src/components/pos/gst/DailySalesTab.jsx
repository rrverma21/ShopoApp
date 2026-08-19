import React, { useState, useEffect, useMemo } from 'react';
import { 
  fetchSalesData, 
  calculateSalesStats, 
  generateChartData, 
  exportToCSV, 
  exportToPDF 
} from '@/utils/salesDataUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { format, subDays, startOfMonth, startOfWeek } from 'date-fns';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, 
  Search, Download, FileText, FileSpreadsheet, Loader2, IndianRupee,
  CreditCard, Activity
} from 'lucide-react';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#4f46e5'];

const DailySalesTab = ({ sellerId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, trend: 0 });
  const [chartData, setChartData] = useState({ dailyTrend: [], paymentMethods: [], hourlyBreakdown: [] });
  
  // Filters
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 6), 'yyyy-MM-dd'), // Default to last 7 days
    end: todayStr
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  // Pagination (simplified for this component)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (sellerId) {
      loadStats();
      loadSalesData();
    }
  }, [sellerId, dateRange.start, dateRange.end]);

  const loadStats = async () => {
    try {
      const data = await calculateSalesStats(sellerId);
      if (data) setStats(data);
    } catch (error) {
      console.error("Failed to load stats", error);
    }
  };

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const data = await fetchSalesData(sellerId, dateRange.start, dateRange.end);
      setSales(data);
      setChartData(generateChartData(data, dateRange.start, dateRange.end));
      setCurrentPage(1);
    } catch (error) {
      toast({
        title: "Error fetching data",
        description: error.message || "Failed to load sales data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilter = (type) => {
    const now = new Date();
    let start;
    switch (type) {
      case 'today':
        start = now;
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        break;
      case 'last7':
        start = subDays(now, 6);
        break;
      default:
        start = now;
    }
    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd')
    });
  };

  // Filter and sort sales for the table
  const processedSales = useMemo(() => {
    let result = [...sales];

    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(sale => 
        sale.id.toLowerCase().includes(lowerQuery) ||
        sale.customer_name.toLowerCase().includes(lowerQuery)
      );
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc': return b.date - a.date;
        case 'date_asc': return a.date - b.date;
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        default: return 0;
      }
    });

    return result;
  }, [sales, searchQuery, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(processedSales.length / itemsPerPage);
  const paginatedSales = processedSales.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await exportToCSV(processedSales, dateRange.start, dateRange.end);
      toast({ title: "Export Successful", description: "CSV file downloaded." });
    } catch (error) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Simulate slight delay to ensure UI updates if needed, though jsPDF is sync
      await new Promise(resolve => setTimeout(resolve, 100)); 
      exportToPDF(processedSales, dateRange.start, dateRange.end);
      toast({ title: "Export Successful", description: "PDF file downloaded." });
    } catch (error) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-medium text-slate-900 dark:text-white mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-900 dark:to-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Today's Sales</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.today)}</h3>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {stats.trend > 0 ? (
                <span className="flex items-center text-emerald-600 font-medium">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +{stats.trend.toFixed(1)}%
                </span>
              ) : stats.trend < 0 ? (
                <span className="flex items-center text-red-600 font-medium">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  {stats.trend.toFixed(1)}%
                </span>
              ) : (
                <span className="flex items-center text-slate-500 font-medium">
                  <Activity className="h-4 w-4 mr-1" />
                  0% 
                </span>
              )}
              <span className="text-slate-400 ml-2">vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">This Week</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.week)}</h3>
              </div>
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">This Month</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.month)}</h3>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Transactions</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{processedSales.length}</h3>
              </div>
              <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4">In selected date range</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            
            {/* Date Range & Quick Filters */}
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <Button variant={dateRange.start === todayStr ? "secondary" : "ghost"} size="sm" onClick={() => handleQuickFilter('today')} className="text-xs">Today</Button>
                <Button variant={dateRange.start === format(subDays(new Date(), 6), 'yyyy-MM-dd') ? "secondary" : "ghost"} size="sm" onClick={() => handleQuickFilter('last7')} className="text-xs">7 Days</Button>
                <Button variant={dateRange.start === format(startOfMonth(new Date()), 'yyyy-MM-dd') ? "secondary" : "ghost"} size="sm" onClick={() => handleQuickFilter('month')} className="text-xs">Month</Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                  max={dateRange.end}
                  className="w-[140px] text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <span className="text-slate-500">to</span>
                <Input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                  min={dateRange.start}
                  max={todayStr}
                  className="w-[140px] text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Search & Sort & Export */}
            <div className="flex flex-col sm:flex-row gap-3 lg:ml-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search Txn ID or Name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Newest First</SelectItem>
                    <SelectItem value="date_asc">Oldest First</SelectItem>
                    <SelectItem value="amount_desc">Amount (High to Low)</SelectItem>
                    <SelectItem value="amount_asc">Amount (Low to High)</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-1 border border-slate-200 dark:border-slate-700">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-white dark:hover:bg-slate-700" 
                    title="Export CSV"
                    onClick={handleExportCSV}
                    disabled={exporting || sales.length === 0}
                  >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-white dark:hover:bg-slate-700" 
                    title="Export PDF"
                    onClick={handleExportPDF}
                    disabled={exporting || sales.length === 0}
                  >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <FileText className="h-4 w-4 text-red-600" />}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Trend Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Daily Sales Trend</CardTitle>
            <CardDescription>Revenue over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="w-full h-[300px] rounded-lg" />
            ) : chartData.dailyTrend.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}`}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      name="Revenue"
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500 border border-dashed rounded-lg">
                No data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Chart */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
            <CardDescription>Distribution by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="w-full h-[300px] rounded-lg" />
            ) : chartData.paymentMethods.length > 0 ? (
              <div className="h-[300px] w-full flex flex-col items-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={chartData.paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full mt-2 grid grid-cols-2 gap-2 text-xs">
                  {chartData.paymentMethods.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="truncate flex-1 text-slate-600 dark:text-slate-300">{entry.name}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {Math.round((entry.value / chartData.paymentMethods.reduce((a,b)=>a+b.value,0)) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500 border border-dashed rounded-lg">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Transactions Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/80 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Date & Time</th>
                <th className="px-6 py-3 font-medium">Transaction ID</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium text-center">Items</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Payment</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20 mx-auto" /></td>
                  </tr>
                ))
              ) : paginatedSales.length > 0 ? (
                paginatedSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {format(sale.date, 'dd MMM yyyy, hh:mm a')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {sale.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {sale.customer_name}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">
                      {sale.items_count}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(sale.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        {sale.payment_method === 'Cash' && <IndianRupee className="w-3.5 h-3.5" />}
                        {sale.payment_method === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                        {sale.payment_method || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={sale.status === 'Completed' ? 'default' : 'secondary'} className={
                        sale.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' : ''
                      }>
                        {sale.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-10 w-10 text-slate-300 mb-3" />
                      <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">No transactions found</p>
                      <p>Try adjusting your filters or date range.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!loading && processedSales.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedSales.length)}</span> of <span className="font-medium">{processedSales.length}</span> entries
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center justify-center px-3 text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

    </div>
  );
};

export default DailySalesTab;