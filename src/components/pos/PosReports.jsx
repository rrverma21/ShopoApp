import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, Loader2, Calendar as CalendarIcon, IndianRupee, ArrowUp, ArrowDown, Search, RefreshCcw, TrendingUp, Package, Layers, DollarSign, BarChart, RotateCcw, Percent, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { cn, formatPrice } from "@/lib/utils";
import { getFinancialYearDates } from '@/lib/financialYearUtils';
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import BillDetailsModal from './BillDetailsModal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const calculateSaleProfit = (sale) => {
    const saleNetValue = Number(sale.total_amount) || 0;
    let totalCost = 0;
    sale.items?.forEach(item => {
        if (item.is_refunded) return; 
        const qty = Number(item.quantity) || 0;
        const unitCost = Number(item.product?.cost_price) || 0;
        totalCost += (qty * unitCost);
    });
    return saleNetValue - totalCost;
};

const SortableHeader = ({ children, columnKey, sortConfig, requestSort }) => {
  const isSorted = sortConfig.key === columnKey;
  const direction = isSorted ? sortConfig.direction : null;

  return (
    <TableHead onClick={() => requestSort(columnKey)} className="cursor-pointer select-none hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        {children}
        {isSorted ? (
          direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <div className="h-3 w-3" />
        )}
      </div>
    </TableHead>
  );
};

const SummaryCard = ({ title, value, icon, className }) => (
    <Card className={cn("border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm", className)}>
        <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
                <div className="text-slate-400 dark:text-slate-500">{icon}</div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</div>
        </CardContent>
    </Card>
);

const PosReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [date, setDate] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [activePreset, setActivePreset] = useState('thisMonth');
  
  const [allSales, setAllSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportType, setReportType] = useState('transactions');

  const [paymentFilter, setPaymentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [financialYearFilter, setFinancialYearFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  
  const [categories, setCategories] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });
  const [productSortConfig, setProductSortConfig] = useState({ key: 'sales', direction: 'descending' });
  const [gstSortConfig, setGstSortConfig] = useState({ key: 'gst', direction: 'descending' });
  const [hsnSortConfig, setHsnSortConfig] = useState({ key: 'net', direction: 'descending' });

  const [actualGstRates, setActualGstRates] = useState([]);
  const [gstRatesLoading, setGstRatesLoading] = useState(false);

  const fetchMetadata = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
        .from('point_of_sale_products')
        .select('category')
        .eq('user_id', user.id)
        .neq('category', null);
    
    if (data) {
        const uniqueCats = [...new Set(data.map(i => i.category).filter(Boolean))];
        setCategories(uniqueCats);
    }
  }, [user]);

  const fetchActualGstRates = useCallback(async () => {
    if (!user) return;
    setGstRatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('point_of_sale_products')
        .select('tax_rate')
        .eq('user_id', user.id)
        .not('tax_rate', 'is', null);

      if (error) throw error;

      if (data) {
        const uniqueRates = [...new Set(data.map(p => Number(p.tax_rate)).filter(r => !isNaN(r)))];
        const sortedRates = uniqueRates.sort((a, b) => a - b);
        setActualGstRates(sortedRates);
      }
    } catch (err) {
      console.error('Error fetching GST rates:', err);
      toast({ 
        title: 'Error loading GST rates', 
        description: 'Failed to fetch GST rates from products.', 
        variant: 'destructive' 
      });
    } finally {
      setGstRatesLoading(false);
    }
  }, [user, toast]);

  const fetchSales = useCallback(async () => {
    if (!user || !date?.from) return;
    setIsLoading(true);

    const fromDate = startOfDay(date.from);
    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);

    let accumulatedData = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    let hasNextPage = true;

    try {
        while (hasNextPage) {
            const { data, error } = await supabase
                .from('point_of_sale_sales')
                .select(`
                    *,
                    customer:point_of_sale_customers(name, phone),
                    items:point_of_sale_sale_items(
                        id,
                        product_id,
                        quantity,
                        total_price,
                        tax_rate,
                        is_refunded,
                        hsn_code,
                        mrp,
                        discount_amount,
                        discount_type,
                        discount_percentage,
                        product:point_of_sale_products(name, category, sku, cost_price, hsn_code, tax_rate)
                    )
                `)
                .eq('user_id', user.id)
                .gte('created_at', fromDate.toISOString())
                .lte('created_at', toDate.toISOString())
                .order('created_at', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (error) throw error;
            
            if (data && data.length > 0) {
                accumulatedData = [...accumulatedData, ...data];
                if (data.length < PAGE_SIZE) hasNextPage = false;
                else page++;
            } else {
                hasNextPage = false;
            }
        }
        setAllSales(accumulatedData);
    } catch (err) {
        console.error(err);
        toast({ title: 'Error fetching report', description: err.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [user, date, toast]); 

  useEffect(() => {
      fetchMetadata();
      fetchActualGstRates(); 
  }, [fetchMetadata, fetchActualGstRates]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);
  
  useEffect(() => {
      if (selectedBill && allSales.length > 0) {
          const updatedSale = allSales.find(s => s.id === selectedBill.id);
          if (updatedSale) setSelectedBill(updatedSale);
      }
  }, [allSales, selectedBill]);

  const availableFinancialYears = useMemo(() => {
    const fms = allSales.map(s => s.invoice_financial_year).filter(Boolean);
    return [...new Set(fms)].sort().reverse();
  }, [allSales]);

  useEffect(() => {
    let processed = allSales.map(sale => ({
        ...sale,
        gross_amount: (Number(sale.total_amount) || 0) + (Number(sale.refund_amount) || 0),
        profit: calculateSaleProfit(sale),
        tax_amount: Number(sale.tax_amount) || 0
    }));

    if (paymentFilter !== 'all') {
        processed = processed.filter(s => s.payment_method?.toLowerCase().includes(paymentFilter.toLowerCase()));
    }

    if (categoryFilter !== 'all') {
        processed = processed.filter(sale => sale.items?.some(item => item.product?.category === categoryFilter));
    }

    if (financialYearFilter !== 'all') {
        processed = processed.filter(sale => sale.invoice_financial_year === financialYearFilter);
    }

    if (productSearch.trim()) {
        const search = productSearch.toLowerCase();
        processed = processed.filter(sale => 
            sale.items?.some(item => 
                item.product?.name?.toLowerCase().includes(search) || 
                item.product?.sku?.toLowerCase().includes(search)
            )
        );
    }

    if (sortConfig.key) {
        processed.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];
            if (sortConfig.key === 'customer') {
                aVal = a.customer?.name || 'Walk-in';
                bVal = b.customer?.name || 'Walk-in';
            }
            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }
    setFilteredSales(processed);
  }, [allSales, paymentFilter, categoryFilter, productSearch, financialYearFilter, sortConfig]);

  const chartData = useMemo(() => {
    if (!date?.from || !date?.to) return null;
    
    const diffTime = Math.abs(date.to - date.from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isMonthly = diffDays > 60;

    if (isMonthly) {
        const monthlySalesMap = {};
        filteredSales.forEach(sale => {
            const monthKey = format(new Date(sale.created_at), 'yyyy-MM');
            monthlySalesMap[monthKey] = (monthlySalesMap[monthKey] || 0) + (Number(sale.total_amount) || 0);
        });
        const intervalMonths = eachMonthOfInterval({ start: date.from, end: date.to });
        const labels = intervalMonths.map(d => format(d, 'MMM yyyy'));
        const dataPoints = intervalMonths.map(d => {
            const key = format(d, 'yyyy-MM');
            return monthlySalesMap[key] || 0;
        });
        return {
            labels,
            datasets: [{
                label: 'Net Sales', data: dataPoints, backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1, borderRadius: 4,
            }]
        };
    } else {
        const dailySalesMap = {};
        filteredSales.forEach(sale => {
            const dayKey = format(new Date(sale.created_at), 'yyyy-MM-dd');
            dailySalesMap[dayKey] = (dailySalesMap[dayKey] || 0) + (Number(sale.total_amount) || 0);
        });
        const intervalDays = eachDayOfInterval({ start: date.from, end: date.to });
        const labels = intervalDays.map(d => format(d, 'MMM dd'));
        const dataPoints = intervalDays.map(d => {
            const key = format(d, 'yyyy-MM-dd');
            return dailySalesMap[key] || 0;
        });
        return {
            labels,
            datasets: [{
                label: 'Net Sales', data: dataPoints, backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1, borderRadius: 4,
            }]
        };
    }
  }, [filteredSales, date]);

  const chartOptions = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => formatPrice(c.raw) } } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatPrice(v) } } }
  };

  const { productStats, categoryStats, gstStats, hsnStats, overallSummary } = useMemo(() => {
    const summary = filteredSales.reduce((acc, sale) => {
        const net = Number(sale.total_amount) || 0;
        const ref = Number(sale.refund_amount) || 0;
        
        acc.netSales += net;
        acc.totalRefunds += ref;
        acc.grossSales += (net + ref);
        
        acc.totalDiscount += Number(sale.discount_amount) || 0;
        acc.taxableValue += Number(sale.subtotal) || 0;
        acc.totalTax += Number(sale.tax_amount) || 0;
        acc.totalProfit += (sale.profit || 0);
        sale.items?.forEach(item => { if (!item.is_refunded) acc.totalItems += (Number(item.quantity) || 0); });
        return acc;
    }, { grossSales: 0, totalRefunds: 0, netSales: 0, totalBills: 0, avgBillValue: 0, totalItems: 0, totalDiscount: 0, taxableValue: 0, totalTax: 0, totalProfit: 0 });
    
    summary.totalBills = filteredSales.length;
    summary.avgBillValue = summary.totalBills > 0 ? summary.netSales / summary.totalBills : 0;

    const pStats = {};
    const cStats = {};
    const gStats = {};
    const hStats = {};

    filteredSales.forEach(sale => {
        let saleHsnMap = {};

        sale.items?.forEach(item => {
            if (item.is_refunded) return;
            
            const itemTaxRate = item.tax_rate !== undefined && item.tax_rate !== null 
                ? Number(item.tax_rate)
                : (item.product?.tax_rate !== undefined && item.product?.tax_rate !== null 
                    ? Number(item.product.tax_rate) 
                    : 0);
            
            const gstKey = `${itemTaxRate}%`;
            
            if (!gStats[gstKey]) {
                gStats[gstKey] = {
                    gst: itemTaxRate,
                    label: gstKey,
                    transactions: 0,
                    gross: 0,
                    refunds: 0,
                    net: 0,
                    taxAmount: 0,
                    profit: 0,
                    quantity: 0
                };
            }
            
            const itemQty = Number(item.quantity) || 0;
            const itemUnitPrice = Number(item.unit_price) || 0;
            const itemTotalPrice = Number(item.total_price) || 0; 
            const itemTaxAmount = (itemTotalPrice * itemTaxRate) / 100;
            const itemGross = itemTotalPrice + itemTaxAmount; 
            
            const itemCost = (Number(item.product?.cost_price) || 0) * itemQty;
            const itemProfit = itemTotalPrice - itemCost;
            
            gStats[gstKey].quantity += itemQty;
            gStats[gstKey].gross += itemGross;
            gStats[gstKey].net += itemTotalPrice;
            gStats[gstKey].taxAmount += itemTaxAmount;
            gStats[gstKey].profit += itemProfit;
            
            const productId = item.product_id || 'unknown';
            const productName = item.product?.name || 'Unknown Product';
            const sku = item.product?.sku || '-';
            const category = item.product?.category || 'Uncategorized';
            const hsnCode = item.hsn_code || item.product?.hsn_code || 'N/A';
            
            // Populate HSN Stats
            const hsnKey = `${hsnCode}_${itemTaxRate}`;
            if (!hStats[hsnKey]) {
                hStats[hsnKey] = { hsn: hsnCode, gstRate: itemTaxRate, products: new Set(), qty: 0, taxable: 0, gstAmount: 0, net: 0, refunds: 0 };
            }
            hStats[hsnKey].products.add(productName);
            hStats[hsnKey].qty += itemQty;
            hStats[hsnKey].taxable += itemTotalPrice;
            hStats[hsnKey].gstAmount += itemTaxAmount;
            hStats[hsnKey].net += itemGross;
            
            if (!saleHsnMap[hsnKey]) saleHsnMap[hsnKey] = 0;
            saleHsnMap[hsnKey] += itemGross;

            if (categoryFilter !== 'all' && category !== categoryFilter) return;
            if (productSearch.trim()) {
                 if (!productName.toLowerCase().includes(productSearch.toLowerCase()) && !sku.toLowerCase().includes(productSearch.toLowerCase())) return;
            }
            
            if (!pStats[productId]) pStats[productId] = { id: productId, name: productName, sku, category, qty: 0, sales: 0, discount: 0, net: 0 };
            if (!cStats[category]) cStats[category] = { name: category, qty: 0, sales: 0, discount: 0, net: 0 };
            
            const itemDiscount = Number(item.discount_amount) || 0;
            const discountShare = itemDiscount > 0 ? itemDiscount : ((Number(sale.subtotal) || 0) > 0 ? ((Number(item.total_price) || 0) / (Number(sale.subtotal) || 1)) * (Number(sale.discount_amount) || 0) : 0);
            
            pStats[productId].qty += itemQty;
            pStats[productId].sales += itemGross;
            pStats[productId].discount += discountShare;
            pStats[productId].net += (itemGross - discountShare);
            
            cStats[category].qty += itemQty;
            cStats[category].sales += itemGross;
            cStats[category].discount += discountShare;
            cStats[category].net += (itemGross - discountShare);
        });
        
        const processedGstKeys = new Set();
        sale.items?.forEach(item => {
            if (item.is_refunded) return;
            const itemTaxRate = item.tax_rate !== undefined && item.tax_rate !== null 
                ? Number(item.tax_rate)
                : (item.product?.tax_rate !== undefined && item.product?.tax_rate !== null 
                    ? Number(item.product.tax_rate) : 0);
            const gstKey = `${itemTaxRate}%`;
            if (!processedGstKeys.has(gstKey)) {
                gStats[gstKey].transactions += 1;
                processedGstKeys.add(gstKey);
            }
        });
        
        if (sale.refund_amount > 0) {
            const totalGross = Object.values(gStats).reduce((sum, g) => sum + g.gross, 0);
            Object.keys(gStats).forEach(key => {
                if (totalGross > 0) {
                    const refundShare = (gStats[key].gross / totalGross) * (Number(sale.refund_amount) || 0);
                    gStats[key].refunds += refundShare;
                }
            });
            
            const saleNetForHsn = Object.values(saleHsnMap).reduce((a, b) => a + b, 0);
            if (saleNetForHsn > 0) {
                Object.keys(saleHsnMap).forEach(key => {
                    hStats[key].refunds += (saleHsnMap[key] / saleNetForHsn) * Number(sale.refund_amount);
                });
            }
        }
    });

    const finalHsnStats = Object.values(hStats).map(h => ({
        ...h,
        productNames: Array.from(h.products).join(', ')
    }));

    return { 
        productStats: Object.values(pStats), 
        categoryStats: Object.values(cStats), 
        gstStats: Object.values(gStats),
        hsnStats: finalHsnStats,
        overallSummary: summary 
    };
  }, [filteredSales, categoryFilter, productSearch]);

  const sortedProductStats = useMemo(() => {
      const data = [...productStats];
      if (productSortConfig.key) data.sort((a, b) => {
          const aVal = a[productSortConfig.key], bVal = b[productSortConfig.key];
          if (aVal < bVal) return productSortConfig.direction === 'ascending' ? -1 : 1;
          if (aVal > bVal) return productSortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
      });
      return data;
  }, [productStats, productSortConfig]);

  const sortedCategoryStats = useMemo(() => {
      const data = [...categoryStats];
      if (productSortConfig.key) data.sort((a, b) => {
          const aVal = a[productSortConfig.key] || 0, bVal = b[productSortConfig.key] || 0;
          if (aVal < bVal) return productSortConfig.direction === 'ascending' ? -1 : 1;
          if (aVal > bVal) return productSortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
      });
      return data;
  }, [categoryStats, productSortConfig]);

  const sortedGstStats = useMemo(() => {
      const data = [...gstStats];
      if (gstSortConfig.key) data.sort((a, b) => {
          const aVal = a[gstSortConfig.key] || 0, bVal = b[gstSortConfig.key] || 0;
          if (aVal < bVal) return gstSortConfig.direction === 'ascending' ? -1 : 1;
          if (aVal > bVal) return gstSortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
      });
      return data;
  }, [gstStats, gstSortConfig]);

  const sortedHsnStats = useMemo(() => {
      const data = [...hsnStats];
      if (hsnSortConfig.key) data.sort((a, b) => {
          const aVal = a[hsnSortConfig.key] || 0;
          const bVal = b[hsnSortConfig.key] || 0;
          if (aVal < bVal) return hsnSortConfig.direction === 'ascending' ? -1 : 1;
          if (aVal > bVal) return hsnSortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
      });
      return data;
  }, [hsnStats, hsnSortConfig]);

  const requestSort = (key) => setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'ascending' ? 'descending' : 'ascending' }));
  const requestProductSort = (key) => setProductSortConfig(c => ({ key, direction: c.key === key && c.direction === 'ascending' ? 'descending' : 'ascending' }));
  const requestGstSort = (key) => setGstSortConfig(c => ({ key, direction: c.key === key && c.direction === 'ascending' ? 'descending' : 'ascending' }));
  const requestHsnSort = (key) => setHsnSortConfig(c => ({ key, direction: c.key === key && c.direction === 'ascending' ? 'descending' : 'ascending' }));
  
  const handleDatePreset = (preset) => {
    const now = new Date(); setActivePreset(preset);
    switch (preset) {
      case 'today': setDate({ from: startOfDay(now), to: endOfDay(now) }); break;
      case 'yesterday': { const y = subDays(now, 1); setDate({ from: startOfDay(y), to: endOfDay(y) }); break; }
      case '7days': setDate({ from: startOfDay(subDays(now, 6)), to: endOfDay(now) }); break;
      case '30days': setDate({ from: startOfDay(subDays(now, 29)), to: endOfDay(now) }); break;
      case 'thisMonth': setDate({ from: startOfMonth(now), to: endOfMonth(now) }); break;
      case 'lastMonth': { const last = subMonths(now, 1); setDate({ from: startOfMonth(last), to: endOfMonth(last) }); break; }
      case 'thisYear': { 
        const { startDate, endDate } = getFinancialYearDates('thisYear');
        setDate({ from: startOfDay(new Date(startDate)), to: endOfDay(new Date(endDate)) }); 
        break; 
      }
      case 'lastYear': { 
        const { startDate, endDate } = getFinancialYearDates('lastYear');
        setDate({ from: startOfDay(new Date(startDate)), to: endOfDay(new Date(endDate)) }); 
        break; 
      }
      default: break;
    }
  };

  const exportToExcel = () => {
    let data = [], sheetName = 'Report';
    if (reportType === 'transactions') {
        sheetName = 'Transaction History';
        data = filteredSales.map(s => ({ 
            'Date': format(new Date(s.created_at), 'dd/MM/yyyy'), 
            'Doc No': s.billing_type === 'gst_invoice' ? s.invoice_number : s.bill_number || s.id.substring(0, 8).toUpperCase(), 
            'Financial Year': s.invoice_financial_year || 'N/A',
            'Customer': s.customer?.name || 'Walk-in', 
            'Payment': s.payment_method, 
            'Gross Total': s.gross_amount,
            'Tax Amount': s.tax_amount,
            'Refunded': s.refund_amount,
            'Total Discount': s.discount_amount || 0,
            'Net Total': s.total_amount,
            'Profit': s.profit
        }));
    } else if (reportType === 'product') {
        sheetName = 'Product Sales';
        data = sortedProductStats.map(p => ({ 'Product Name': p.name, 'SKU': p.sku, 'Category': p.category, 'Qty Sold': p.qty, 'Gross Sales': p.sales, 'Discount': p.discount, 'Net Sales': p.net }));
    } else if (reportType === 'category') {
        sheetName = 'Category Sales';
        data = sortedCategoryStats.map(c => ({ 'Category': c.name, 'Qty Sold': c.qty, 'Gross Sales': c.sales, 'Discount': c.discount, 'Net Sales': c.net }));
    } else if (reportType === 'gst') {
        sheetName = 'GST Sales';
        data = sortedGstStats.map(g => ({ 'GST %': g.label, 'Transactions': g.transactions, 'Quantity': g.quantity, 'Gross Sales': g.gross, 'Total Refunds': g.refunds, 'Net Sales': g.net, 'Tax Amount': g.taxAmount, 'Net Profit': g.profit }));
        data.push({
            'GST %': 'Total',
            'Transactions': sortedGstStats.reduce((a, b) => a + b.transactions, 0),
            'Quantity': sortedGstStats.reduce((a, b) => a + b.quantity, 0),
            'Gross Sales': sortedGstStats.reduce((a, b) => a + b.gross, 0),
            'Total Refunds': sortedGstStats.reduce((a, b) => a + b.refunds, 0),
            'Net Sales': sortedGstStats.reduce((a, b) => a + b.net, 0),
            'Tax Amount': sortedGstStats.reduce((a, b) => a + b.taxAmount, 0),
            'Net Profit': sortedGstStats.reduce((a, b) => a + b.profit, 0)
        });
    } else if (reportType === 'hsn') {
        sheetName = 'HSN Sales';
        data = sortedHsnStats.map(h => ({
            'HSN Code': h.hsn,
            'Product Names': h.productNames,
            'Quantity': h.qty,
            'Gross Amount': h.taxable,
            'GST %': h.gstRate,
            'Taxable Amount': h.taxable,
            'GST Amount': h.gstAmount,
            'Net Total': h.net
        }));
        data.push({
            'HSN Code': 'Total',
            'Product Names': '',
            'Quantity': sortedHsnStats.reduce((a, b) => a + b.qty, 0),
            'Gross Amount': sortedHsnStats.reduce((a, b) => a + b.taxable, 0),
            'GST %': '',
            'Taxable Amount': sortedHsnStats.reduce((a, b) => a + b.taxable, 0),
            'GST Amount': sortedHsnStats.reduce((a, b) => a + b.gstAmount, 0),
            'Net Total': sortedHsnStats.reduce((a, b) => a + b.net, 0)
        });
    }
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, sheetName);
    writeFile(wb, `${sheetName}_${format(date.from, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      const title = reportType === 'transactions' ? 'Sales Transactions' : 
                    reportType === 'product' ? 'Product Sales Report' : 
                    reportType === 'category' ? 'Category Sales Report' : 
                    reportType === 'hsn' ? 'HSN-wise Sales Report' : 'GST Sales Report';
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${format(date.from, 'dd MMM yyyy')} - ${format(date.to || date.from, 'dd MMM yyyy')}`, 14, 28);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 33);
      
      let tableColumn = [], tableRows = [];
      if (reportType === 'transactions') {
          tableColumn = ["Date", "Doc No", "Customer", "Gross", "Discount", "Tax", "Refund", "Net"];
          tableRows = filteredSales.map(s => [ format(new Date(s.created_at), 'dd/MM/yy'), s.billing_type === 'gst_invoice' ? s.invoice_number : s.bill_number || s.id.substring(0, 8).toUpperCase(), s.customer?.name || 'Walk-in', formatPrice(s.gross_amount), formatPrice(s.discount_amount || 0), formatPrice(s.tax_amount), formatPrice(s.refund_amount), formatPrice(s.total_amount) ]);
      } else if (reportType === 'product') {
          tableColumn = ["Product", "SKU", "Category", "Qty", "Gross Sales", "Discount", "Net Sales"];
          tableRows = sortedProductStats.map(p => [ p.name, p.sku, p.category, p.qty, formatPrice(p.sales), formatPrice(p.discount), formatPrice(p.net) ]);
      } else if (reportType === 'category') {
          tableColumn = ["Category", "Qty", "Gross Sales", "Discount", "Net Sales"];
          tableRows =sortedCategoryStats.map(c => [ c.name, c.qty, formatPrice(c.sales), formatPrice(c.discount), formatPrice(c.net) ]);
      } else if (reportType === 'gst') {
          tableColumn = ["GST %", "Transactions", "Qty", "Gross Sales", "Refunds", "Net Sales", "Tax Amount", "Net Profit"];
          tableRows = sortedGstStats.map(g => [ g.label, g.transactions, g.quantity, `Rs. ${g.gross.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, `Rs. ${g.refunds.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, `Rs. ${g.net.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, `Rs. ${g.taxAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, `Rs. ${g.profit.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` ]);
          tableRows.push([
              'Total',
              sortedGstStats.reduce((a, b) => a + b.transactions, 0),
              sortedGstStats.reduce((a, b) => a + b.quantity, 0),
              `Rs. ${sortedGstStats.reduce((a, b) => a + b.gross, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
              `Rs. ${sortedGstStats.reduce((a, b) => a + b.refunds, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
              `Rs. ${sortedGstStats.reduce((a, b) => a + b.net, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
              `Rs. ${sortedGstStats.reduce((a, b) => a + b.taxAmount, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
              `Rs. ${sortedGstStats.reduce((a, b) => a + b.profit, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
          ]);
      } else if (reportType === 'hsn') {
          tableColumn = ["HSN Code", "Products", "Qty", "Gross Amount", "GST %", "Taxable Amount", "GST Amount", "Net Total"];
          tableRows = sortedHsnStats.map(h => [
              h.hsn, 
              h.productNames.substring(0, 30) + (h.productNames.length > 30 ? '...' : ''), 
              h.qty, 
              formatPrice(h.taxable), 
              `${h.gstRate}%`, 
              formatPrice(h.taxable), 
              formatPrice(h.gstAmount), 
              formatPrice(h.net)
          ]);
          tableRows.push([
              'Total', 
              '', 
              sortedHsnStats.reduce((a, b) => a + b.qty, 0),
              formatPrice(sortedHsnStats.reduce((a, b) => a + b.taxable, 0)), 
              '',
              formatPrice(sortedHsnStats.reduce((a, b) => a + b.taxable, 0)),
              formatPrice(sortedHsnStats.reduce((a, b) => a + b.gstAmount, 0)),
              formatPrice(sortedHsnStats.reduce((a, b) => a + b.net, 0))
          ]);
      }
      doc.autoTable({ startY: 40, head: [tableColumn], body: tableRows, theme: 'striped', styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' } });
      doc.save(`${reportType}_report_${format(date.from, 'yyyy-MM-dd')}.pdf`);
  };

  const handleRowClick = (sale) => {
      setSelectedBill(sale);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sales Reports</h1>
            <p className="text-slate-500 dark:text-slate-400">Analyze your net sales performance, refunds, and insights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            
            {availableFinancialYears.length > 0 && (
                <Select value={financialYearFilter} onValueChange={setFinancialYearFilter}>
                    <SelectTrigger className="w-[160px] bg-white">
                        <Filter className="w-4 h-4 mr-2 text-slate-500" />
                        <SelectValue placeholder="FY Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Financial Years</SelectItem>
                        {availableFinancialYears.map(fy => (
                            <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full">
                {['today', 'yesterday', '7days', '30days', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear'].map((preset) => (
                <Button 
                    key={preset} 
                    variant={activePreset === preset ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => handleDatePreset(preset)} 
                    className={cn(
                        "text-xs whitespace-nowrap",
                        activePreset === preset && "font-bold text-slate-900 dark:text-white"
                    )}
                >
                    {preset.charAt(0).toUpperCase() + preset.slice(1).replace(/([A-Z])/g, ' $1').trim()}
                </Button>
                ))}
            </div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (date.to ? <>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</> : format(date.from, "LLL dd, y")) : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={(range) => { setDate(range); setActivePreset(''); }} numberOfMonths={2} />
                </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={fetchSales} title="Refresh Data">
                <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 mb-6">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment Method</span>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="All Methods" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Methods</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem><SelectItem value="Split">Split Payment</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Product Category</span>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="All Categories" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Search Product</span>
                  <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input placeholder="Filter by product name or SKU..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9 h-9" />
                  </div>
              </div>
          </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <SummaryCard title="Gross Sales" value={formatPrice(overallSummary.grossSales)} icon={<IndianRupee className="h-4 w-4" />} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
          <SummaryCard title="Total Refunds" value={formatPrice(overallSummary.totalRefunds)} icon={<RotateCcw className="h-4 w-4 text-orange-500" />} className="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800" />
          <SummaryCard title="Net Sales" value={formatPrice(overallSummary.netSales)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900 shadow-md" />
          <SummaryCard title="Net Profit" value={formatPrice(overallSummary.totalProfit)} icon={<TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />} className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900" />
          
          <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-center gap-1.5 shadow-sm">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Bills Count</span><span className="font-bold text-slate-700 dark:text-slate-300">{overallSummary.totalBills}</span></div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Avg Bill Value</span><span className="font-bold text-slate-700 dark:text-slate-300">{formatPrice(overallSummary.avgBillValue)}</span></div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800"><span>Net Tax</span><span className="font-bold text-slate-700 dark:text-slate-300">{formatPrice(overallSummary.totalTax)}</span></div>
          </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm mb-6">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart className="h-5 w-5 text-blue-500" />Net Sales ({format(date.from, 'dd MMM yyyy')} - {format(date.to || date.from, 'dd MMM yyyy')}) {financialYearFilter !== 'all' && `| FY ${financialYearFilter}`}</CardTitle></CardHeader>
          <CardContent className="h-64">{chartData && <Bar options={chartOptions} data={chartData} />}</CardContent>
      </Card>

      <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-5 bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="product">Product-wise</TabsTrigger>
                <TabsTrigger value="category">Category-wise</TabsTrigger>
                <TabsTrigger value="gst">GST-wise</TabsTrigger>
                <TabsTrigger value="hsn">HSN-wise</TabsTrigger>
            </TabsList>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={exportToExcel} className="flex-1 sm:flex-none"><FileDown className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" /> Excel</Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} className="flex-1 sm:flex-none"><FileDown className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" /> PDF</Button>
            </div>
        </div>

        <TabsContent value="transactions">
            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
              <div className="overflow-x-auto">
                  <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                          <TableRow className="border-b border-slate-200 dark:border-slate-800">
                              <SortableHeader columnKey="created_at" sortConfig={sortConfig} requestSort={requestSort}>Date/Time</SortableHeader>
                              <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>Doc No</SortableHeader>
                              <TableHead>Fin. Year</TableHead>
                              <SortableHeader columnKey="customer" sortConfig={sortConfig} requestSort={requestSort}>Customer</SortableHeader>
                              <SortableHeader columnKey="gross_amount" sortConfig={sortConfig} requestSort={requestSort}>Gross</SortableHeader>
                              <TableHead>Discount</TableHead>
                              <SortableHeader columnKey="tax_amount" sortConfig={sortConfig} requestSort={requestSort}>Tax</SortableHeader>
                              <SortableHeader columnKey="refund_amount" sortConfig={sortConfig} requestSort={requestSort}>Refund</SortableHeader>
                              <SortableHeader columnKey="total_amount" sortConfig={sortConfig} requestSort={requestSort}>Net Total</SortableHeader>
                              <TableHead className="text-center text-slate-700 dark:text-slate-300 font-semibold">Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {isLoading ? ( <TableRow><TableCell colSpan={10} className="h-32 text-center"><div className="flex justify-center items-center gap-2 text-slate-500"><Loader2 className="animate-spin h-5 w-5 text-blue-500" /> Loading transactions...</div></TableCell></TableRow>
                          ) : filteredSales.length === 0 ? ( <TableRow><TableCell colSpan={10} className="h-32 text-center text-slate-500 dark:text-slate-400">No transactions found for this period.</TableCell></TableRow>
                          ) : (
                              filteredSales.map((sale) => (
                                  <TableRow 
                                    key={sale.id} 
                                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50 transition-colors"
                                    onClick={() => handleRowClick(sale)}
                                  >
                                      <TableCell className="whitespace-nowrap"><div className="font-medium text-slate-900 dark:text-slate-100">{format(new Date(sale.created_at), 'dd MMM yy, HH:mm')}</div></TableCell>
                                      <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">{sale.billing_type === 'gst_invoice' ? sale.invoice_number : sale.bill_number || sale.id.substring(0, 8).toUpperCase()}</TableCell>
                                      <TableCell className="font-medium text-slate-600">{sale.invoice_financial_year || 'N/A'}</TableCell>
                                      <TableCell><div className="font-medium text-slate-700 dark:text-slate-300">{sale.customer?.name || 'Walk-in'}</div></TableCell>
                                      <TableCell className="text-slate-600 dark:text-slate-400 font-medium">{formatPrice(sale.gross_amount)}</TableCell>
                                      <TableCell className="text-green-600 dark:text-green-400 font-medium">{formatPrice(sale.discount_amount || 0)}</TableCell>
                                      <TableCell className="text-slate-600 dark:text-slate-400 font-medium">{formatPrice(sale.tax_amount)}</TableCell>
                                      <TableCell className="text-orange-500 font-medium">{sale.refund_amount > 0 ? `-${formatPrice(sale.refund_amount)}` : '-'}</TableCell>
                                      <TableCell className="font-bold text-slate-900 dark:text-slate-100">{formatPrice(sale.total_amount)}</TableCell>
                                      <TableCell className="text-center">
                                          <span className={cn(
                                              "px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider",
                                              sale.status?.includes('Refund') ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-green-100 text-green-700 border border-green-200"
                                          )}>
                                              {sale.status || 'Completed'}
                                          </span>
                                      </TableCell>
                                  </TableRow>
                              ))
                          )}
                      </TableBody>
                  </Table>
              </div>
            </Card>
        </TabsContent>

        <TabsContent value="product">
            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                <div className="overflow-x-auto"><Table><TableHeader className="bg-slate-50 dark:bg-slate-900/50"><TableRow className="border-b border-slate-200 dark:border-slate-800">
                    <SortableHeader columnKey="name" sortConfig={productSortConfig} requestSort={requestProductSort}>Product Name</SortableHeader>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">SKU</TableHead><SortableHeader columnKey="category" sortConfig={productSortConfig} requestSort={requestProductSort}>Category</SortableHeader>
                    <SortableHeader columnKey="qty" sortConfig={productSortConfig} requestSort={requestProductSort}>Net Qty Sold</SortableHeader>
                    <SortableHeader columnKey="sales" sortConfig={productSortConfig} requestSort={requestProductSort}>Gross Sales</SortableHeader>
                    <SortableHeader columnKey="net" sortConfig={productSortConfig} requestSort={requestProductSort}>Net Sales</SortableHeader>
                </TableRow></TableHeader><TableBody>
                   {isLoading ? ( <TableRow><TableCell colSpan={6} className="h-32 text-center"><div className="flex justify-center"><Loader2 className="animate-spin h-5 w-5 text-blue-500" /></div></TableCell></TableRow>
                   ) : sortedProductStats.length === 0 ? ( <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500 dark:text-slate-400">No product sales found.</TableCell></TableRow>
                   ) : ( <> {sortedProductStats.map((stat) => ( <TableRow key={stat.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30"><TableCell className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2"><Package className="h-4 w-4 text-slate-400" />{stat.name}</TableCell><TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">{stat.sku}</TableCell><TableCell><span className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{stat.category}</span></TableCell><TableCell className="font-medium text-slate-700 dark:text-slate-300">{stat.qty}</TableCell><TableCell className="text-slate-600 dark:text-slate-400">{formatPrice(stat.sales)}</TableCell><TableCell className="font-bold text-slate-900 dark:text-slate-100">{formatPrice(stat.net)}</TableCell></TableRow> ))}
                   <TableRow className="bg-slate-50 dark:bg-slate-900/50 font-bold border-t-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"><TableCell colSpan={3} className="text-right">Total:</TableCell><TableCell>{sortedProductStats.reduce((a, b) => a + b.qty, 0)}</TableCell><TableCell>{formatPrice(sortedProductStats.reduce((a, b) => a + b.sales, 0))}</TableCell><TableCell>{formatPrice(sortedProductStats.reduce((a, b) => a + b.net, 0))}</TableCell></TableRow> </> )}
                </TableBody></Table></div>
            </Card>
        </TabsContent>

        <TabsContent value="category">
            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                <div className="overflow-x-auto"><Table><TableHeader className="bg-slate-50 dark:bg-slate-900/50"><TableRow className="border-b border-slate-200 dark:border-slate-800">
                    <SortableHeader columnKey="name" sortConfig={productSortConfig} requestSort={requestProductSort}>Category</SortableHeader>
                    <SortableHeader columnKey="qty" sortConfig={productSortConfig} requestSort={requestProductSort}>Net Qty Sold</SortableHeader>
                    <SortableHeader columnKey="sales" sortConfig={productSortConfig} requestSort={requestProductSort}>Gross Sales</SortableHeader>
                    <SortableHeader columnKey="net" sortConfig={productSortConfig} requestSort={requestProductSort}>Net Sales</SortableHeader>
                </TableRow></TableHeader><TableBody>
                    {isLoading ? ( <TableRow><TableCell colSpan={4} className="h-32 text-center"><div className="flex justify-center"><Loader2 className="animate-spin h-5 w-5 text-blue-500" /></div></TableCell></TableRow>
                    ) : sortedCategoryStats.length === 0 ? ( <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-500 dark:text-slate-400">No category data.</TableCell></TableRow>
                    ) : ( <> {sortedCategoryStats.map((stat) => ( <TableRow key={stat.name} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30"><TableCell className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2"><Layers className="h-4 w-4 text-blue-500" />{stat.name}</TableCell><TableCell className="font-medium text-slate-700 dark:text-slate-300">{stat.qty}</TableCell><TableCell className="text-slate-600 dark:text-slate-400">{formatPrice(stat.sales)}</TableCell><TableCell className="font-bold text-slate-900 dark:text-slate-100">{formatPrice(stat.net)}</TableCell></TableRow> ))}
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50 font-bold border-t-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"><TableCell className="text-right">Total:</TableCell><TableCell>{sortedCategoryStats.reduce((a, b) => a + b.qty, 0)}</TableCell><TableCell>{formatPrice(sortedCategoryStats.reduce((a, b) => a + b.sales, 0))}</TableCell><TableCell>{formatPrice(sortedCategoryStats.reduce((a, b) => a + b.net, 0))}</TableCell></TableRow> </> )}
                </TableBody></Table></div>
            </Card>
        </TabsContent>

        <TabsContent value="gst">
            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                <div className="overflow-x-auto"><Table><TableHeader className="bg-slate-50 dark:bg-slate-900/50"><TableRow className="border-b border-slate-200 dark:border-slate-800">
                    <SortableHeader columnKey="gst" sortConfig={gstSortConfig} requestSort={requestGstSort}>GST %</SortableHeader>
                    <SortableHeader columnKey="transactions" sortConfig={gstSortConfig} requestSort={requestGstSort}>Transactions</SortableHeader>
                    <SortableHeader columnKey="quantity" sortConfig={gstSortConfig} requestSort={requestGstSort}>Quantity</SortableHeader>
                    <SortableHeader columnKey="gross" sortConfig={gstSortConfig} requestSort={requestGstSort}>Gross Sales</SortableHeader>
                    <SortableHeader columnKey="refunds" sortConfig={gstSortConfig} requestSort={requestGstSort}>Total Refunds</SortableHeader>
                    <SortableHeader columnKey="net" sortConfig={gstSortConfig} requestSort={requestGstSort}>Net Sales</SortableHeader>
                    <SortableHeader columnKey="taxAmount" sortConfig={gstSortConfig} requestSort={requestGstSort}>Tax Amount</SortableHeader>
                    <SortableHeader columnKey="profit" sortConfig={gstSortConfig} requestSort={requestGstSort}>Net Profit</SortableHeader>
                </TableRow></TableHeader><TableBody>
                    {isLoading || gstRatesLoading ? ( 
                        <TableRow><TableCell colSpan={8} className="h-32 text-center"><div className="flex justify-center items-center gap-2 text-slate-500"><Loader2 className="animate-spin h-5 w-5 text-blue-500" /> Loading GST data...</div></TableCell></TableRow>
                    ) : sortedGstStats.length === 0 ? ( 
                        <TableRow><TableCell colSpan={8} className="h-32 text-center text-slate-500 dark:text-slate-400">No GST data found for the selected period.</TableCell></TableRow>
                    ) : ( <> {sortedGstStats.map((stat) => ( <TableRow key={stat.label} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2"><Percent className="h-4 w-4 text-purple-500" />{stat.label}</TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">{stat.transactions}</TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">{stat.quantity}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">Rs. {stat.gross.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-orange-500 font-medium">{stat.refunds > 0 ? `Rs. ${stat.refunds.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}</TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-slate-100">Rs. {stat.net.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400 font-medium">Rs. {stat.taxAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400 font-medium">Rs. {stat.profit.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    </TableRow> ))}
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50 font-bold border-t-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                        <TableCell className="text-right">Grand Total</TableCell>
                        <TableCell>{sortedGstStats.reduce((a, b) => a + b.transactions, 0)}</TableCell>
                        <TableCell>{sortedGstStats.reduce((a, b) => a + b.quantity, 0)}</TableCell>
                        <TableCell>Rs. {sortedGstStats.reduce((a, b) => a + b.gross, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-orange-500">Rs. {sortedGstStats.reduce((a, b) => a + b.refunds, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell>Rs. {sortedGstStats.reduce((a, b) => a + b.net, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell>Rs. {sortedGstStats.reduce((a, b) => a + b.taxAmount, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400">Rs. {sortedGstStats.reduce((a, b) => a + b.profit, 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    </TableRow> </> )}
                </TableBody></Table></div>
            </Card>
        </TabsContent>

        <TabsContent value="hsn">
            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                            <TableRow className="border-b border-slate-200 dark:border-slate-800">
                                <SortableHeader columnKey="hsn" sortConfig={hsnSortConfig} requestSort={requestHsnSort}>HSN Code</SortableHeader>
                                <SortableHeader columnKey="productNames" sortConfig={hsnSortConfig} requestSort={requestHsnSort}>Product Name</SortableHeader>
                                <SortableHeader columnKey="qty" sortConfig={hsnSortConfig} requestSort={requestHsnSort}>Quantity</SortableHeader>
                                <SortableHeader columnKey="taxable" sortConfig={hsnSortConfig} requestSort={requestHsnSort}>Gross Amount</SortableHeader>
                                <SortableHeader columnKey="gstRate" sortConfig={hsnSortConfig} requestSort={requestHsnSort}>GST %</SortableHeader>
                                <SortableHeader columnKey="taxable" sortConfig={hsnSortConfig} requestSort={requestHsnSort}>Taxable Amount</SortableHeader>
                                <SortableHeader columnKey="gstAmount" sortConfig={hsnSortConfig} requestSort={requestHsnSort}>GST Amount</SortableHeader>
                                <SortableHeader columnKey="net" sortConfig={hsnSortConfig} requestSort={requestHsnSort}>Net Total</SortableHeader>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading || gstRatesLoading ? (
                                <TableRow><TableCell colSpan={8} className="h-32 text-center"><div className="flex justify-center items-center gap-2 text-slate-500"><Loader2 className="animate-spin h-5 w-5 text-blue-500" /> Loading HSN data...</div></TableCell></TableRow>
                            ) : sortedHsnStats.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="h-32 text-center text-slate-500 dark:text-slate-400">No HSN data found for the selected period.</TableCell></TableRow>
                            ) : (
                                <>
                                    {sortedHsnStats.map((stat) => (
                                        <TableRow key={`${stat.hsn}_${stat.gstRate}`} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <TableCell className="font-medium text-slate-900 dark:text-slate-100">{stat.hsn}</TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={stat.productNames}>{stat.productNames}</TableCell>
                                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{stat.qty}</TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">{formatPrice(stat.taxable)}</TableCell>
                                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{stat.gstRate}%</TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">{formatPrice(stat.taxable)}</TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400">{formatPrice(stat.gstAmount)}</TableCell>
                                            <TableCell className="font-bold text-slate-900 dark:text-slate-100">{formatPrice(stat.net)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-slate-50 dark:bg-slate-900/50 font-bold border-t-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                                        <TableCell colSpan={2} className="text-right">Total</TableCell>
                                        <TableCell>{sortedHsnStats.reduce((a, b) => a + b.qty, 0)}</TableCell>
                                        <TableCell>{formatPrice(sortedHsnStats.reduce((a, b) => a + b.taxable, 0))}</TableCell>
                                        <TableCell className="text-center">-</TableCell>
                                        <TableCell>{formatPrice(sortedHsnStats.reduce((a, b) => a + b.taxable, 0))}</TableCell>
                                        <TableCell>{formatPrice(sortedHsnStats.reduce((a, b) => a + b.gstAmount, 0))}</TableCell>
                                        <TableCell>{formatPrice(sortedHsnStats.reduce((a, b) => a + b.net, 0))}</TableCell>
                                    </TableRow>
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </TabsContent>
      </Tabs>

      <BillDetailsModal 
        billId={selectedBill?.id} 
        isOpen={!!selectedBill} 
        onClose={() => setSelectedBill(null)} 
        onUpdatePayment={fetchSales}
      />
    </div>
  );
};

export default PosReports;