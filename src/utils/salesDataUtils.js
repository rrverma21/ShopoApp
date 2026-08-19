import { supabase } from '@/lib/customSupabaseClient';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const fetchSalesData = async (sellerId, startDate, endDate) => {
  if (!sellerId) return [];

  // Set time boundaries for the query
  const start = startOfDay(new Date(startDate)).toISOString();
  const end = endOfDay(new Date(endDate)).toISOString();

  const { data, error } = await supabase
    .from('point_of_sale_sales')
    .select(`
      id,
      created_at,
      total_amount,
      payment_method,
      status,
      customer_phone,
      customer_id,
      point_of_sale_customers (name),
      point_of_sale_sale_items (quantity)
    `)
    .eq('user_id', sellerId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales data:', error);
    throw error;
  }

  // Transform data to make it easier to work with
  return data.map(sale => ({
    ...sale,
    customer_name: sale.point_of_sale_customers?.name || 'Walk-in Customer',
    items_count: sale.point_of_sale_sale_items?.reduce((acc, item) => acc + item.quantity, 0) || 0,
    amount: Number(sale.total_amount) || 0,
    date: new Date(sale.created_at)
  }));
};

export const calculateSalesStats = async (sellerId) => {
  if (!sellerId) return null;

  const now = new Date();
  
  // Define periods
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  
  const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
  const yesterdayEnd = endOfDay(subDays(now, 1)).toISOString();
  
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  // We need to fetch multiple periods. To avoid too many complex queries, 
  // we can fetch the whole month and filter in memory since POS sales for one month usually fit in memory.
  // Alternatively, run specific aggregations. Let's do specific aggregates for efficiency if large data.
  // For simplicity and to get exact counts easily, we'll run a few SUM queries.

  const getSum = async (start, end) => {
    const { data, error } = await supabase
      .from('point_of_sale_sales')
      .select('total_amount')
      .eq('user_id', sellerId)
      .eq('status', 'Completed')
      .gte('created_at', start)
      .lte('created_at', end || new Date().toISOString());
      
    if (error) return 0;
    return data.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
  };

  const [todayTotal, yesterdayTotal, weekTotal, monthTotal] = await Promise.all([
    getSum(todayStart, todayEnd),
    getSum(yesterdayStart, yesterdayEnd),
    getSum(weekStart, null),
    getSum(monthStart, null)
  ]);

  let trend = 0;
  if (yesterdayTotal > 0) {
    trend = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
  } else if (todayTotal > 0) {
    trend = 100; // 100% increase if yesterday was 0 and today is > 0
  }

  return {
    today: todayTotal,
    week: weekTotal,
    month: monthTotal,
    trend: trend
  };
};

export const generateChartData = (sales, startDate, endDate) => {
  // 1. Line Chart: Daily Sales Trend
  const dailyDataMap = {};
  
  // Initialize map with all dates in range
  let currDate = new Date(startDate);
  const end = new Date(endDate);
  while (currDate <= end) {
    const dateStr = format(currDate, 'MMM dd');
    dailyDataMap[dateStr] = 0;
    currDate.setDate(currDate.getDate() + 1);
  }

  sales.forEach(sale => {
    if (sale.status === 'Completed') {
      const dateStr = format(sale.date, 'MMM dd');
      if (dailyDataMap[dateStr] !== undefined) {
        dailyDataMap[dateStr] += sale.amount;
      }
    }
  });

  const dailyTrend = Object.keys(dailyDataMap).map(date => ({
    date,
    amount: dailyDataMap[date]
  }));

  // 2. Pie Chart: Payment Methods
  const paymentMethodMap = {};
  sales.forEach(sale => {
    if (sale.status === 'Completed') {
      const method = sale.payment_method || 'Unknown';
      paymentMethodMap[method] = (paymentMethodMap[method] || 0) + sale.amount;
    }
  });

  const paymentMethods = Object.keys(paymentMethodMap).map(name => ({
    name,
    value: paymentMethodMap[name]
  })).sort((a, b) => b.value - a.value);

  // 3. Bar Chart: Hourly Breakdown
  const hourlyMap = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    amount: 0
  }));

  sales.forEach(sale => {
    if (sale.status === 'Completed') {
      const hour = sale.date.getHours();
      hourlyMap[hour].amount += sale.amount;
    }
  });

  return { dailyTrend, paymentMethods, hourlyBreakdown: hourlyMap };
};

export const exportToCSV = (sales, startDate, endDate) => {
  if (!sales || sales.length === 0) return;

  const headers = ['Date', 'Time', 'Transaction ID', 'Customer Name', 'Items Sold', 'Amount (Rs)', 'Payment Method', 'Status'];
  const csvRows = sales.map(sale => [
    format(sale.date, 'yyyy-MM-dd'),
    format(sale.date, 'HH:mm:ss'),
    sale.id,
    `"${sale.customer_name}"`, // Quote to handle commas in names
    sale.items_count,
    sale.amount.toFixed(2),
    sale.payment_method || 'N/A',
    sale.status
  ]);

  const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `Sales_Report_${startDate}_to_${endDate}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (sales, startDate, endDate) => {
  if (!sales || sales.length === 0) return;

  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Daily Sales Report', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
  
  const totalAmount = sales.reduce((sum, s) => s.status === 'Completed' ? sum + s.amount : sum, 0);
  doc.text(`Total Completed Sales: Rs ${totalAmount.toFixed(2)}`, 14, 38);

  const tableColumn = ["Date & Time", "Txn ID", "Customer", "Items", "Amount", "Method", "Status"];
  const tableRows = [];

  sales.forEach(sale => {
    const saleData = [
      format(sale.date, 'dd/MM/yy HH:mm'),
      sale.id.substring(0, 8) + '...',
      sale.customer_name,
      sale.items_count.toString(),
      `Rs ${sale.amount.toFixed(2)}`,
      sale.payment_method || 'N/A',
      sale.status
    ];
    tableRows.push(saleData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] } // blue-600
  });

  doc.save(`Sales_Report_${startDate}_to_${endDate}.pdf`);
};