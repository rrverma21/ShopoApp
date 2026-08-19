import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Receipt, TrendingUp, Loader2, Eye, RefreshCw, CreditCard, Banknote, Filter, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import PosDateRangePicker from '@/components/pos/PosDateRangePicker';
import BillDetailsModal from '@/components/pos/BillDetailsModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRegion } from '@/contexts/RegionContext';
import { formatCurrency } from '@/utils/currencyFormatter';

export default function PosSales() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentRegion, regionConfig } = useRegion();

  const [startDate, setStartDate] = useState(startOfDay(subDays(new Date(), 30)));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [billingFilter, setBillingFilter] = useState('all');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [selectedSale, setSelectedSale] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSales = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      let query = supabase
        .from('point_of_sale_sales')
        .select(`*, point_of_sale_customers(name, phone)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (startDate) query = query.gte('created_at', startDate.toISOString());
      if (endDate) query = query.lte('created_at', endDate.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast({ title: "Error fetching sales", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, startDate, endDate, toast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleDateRangeChange = (range) => {
    if (range.startDate && range.endDate) {
      setStartDate(startOfDay(range.startDate));
      setEndDate(endOfDay(range.endDate));
    } else {
      setStartDate(null);
      setEndDate(null);
    }
  };

  const filteredSales = useMemo(() => {
    let result = sales;
    if (billingFilter !== 'all') result = result.filter(sale => sale.billing_type === billingFilter);
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(sale => {
        const customerName = sale.customer_name?.toLowerCase() || sale.point_of_sale_customers?.name?.toLowerCase() || '';
        const customerPhone = sale.customer_phone || '';
        const saleId = sale.id.toLowerCase();
        const invoiceNum = sale.invoice_number?.toLowerCase() || '';
        const billNum = sale.bill_number?.toLowerCase() || '';
        const customerGstin = sale.customer_gstin?.toLowerCase() || '';
        const status = sale.status?.toLowerCase() || '';
        const paymentMethod = sale.payment_method?.toLowerCase() || '';

        return customerName.includes(lowerSearch) || customerPhone.includes(lowerSearch) || saleId.includes(lowerSearch) || invoiceNum.includes(lowerSearch) || billNum.includes(lowerSearch) || customerGstin.includes(lowerSearch) || status.includes(lowerSearch) || paymentMethod.includes(lowerSearch);
      });
    }
    return result;
  }, [sales, debouncedSearchTerm, billingFilter]);

  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscounts = 0;
    let cashPayments = 0;
    let digitalPayments = 0;
    let creditPayments = 0;

    filteredSales.forEach(sale => {
      if (sale.status !== 'Refunded' && sale.status !== 'Cancelled') {
        const amount = sale.tax_breakdown?.grand_total || sale.final_amount || sale.total_amount || 0;
        totalRevenue += amount;
        totalTax += sale.tax_breakdown?.total_tax || sale.tax_amount || 0;
        totalDiscounts += sale.discount_amount || 0;
        
        const method = sale.payment_method?.toLowerCase() || '';
        if (method === 'cash') cashPayments += amount;
        else if (method === 'credit') creditPayments += amount;
        else digitalPayments += amount;
      }
    });

    return {
      totalRevenue,
      totalOrders: filteredSales.length,
      avgOrderValue: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0,
      totalTax,
      totalDiscounts,
      cashPayments,
      digitalPayments,
      creditPayments
    };
  }, [filteredSales]);

  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case 'refunded': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">Refunded</Badge>;
      case 'partially refunded': return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400">Partial Refund</Badge>;
      default: return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getPaymentBadge = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash': return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50"><Banknote className="w-3 h-3 mr-1"/> Cash</Badge>;
      case 'upi':
      case 'card': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50"><CreditCard className="w-3 h-3 mr-1"/> {method}</Badge>;
      case 'credit': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Credit</Badge>;
      case 'split': return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Split</Badge>;
      default: return <Badge variant="outline">{method || 'N/A'}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            Sales History
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            View and manage your point of sale transactions
          </p>
        </div>
        
        <div className="w-full xl:w-auto">
          <PosDateRangePicker 
            initialStartDate={startDate}
            initialEndDate={endDate}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Revenue</p>
                <h3 className="text-3xl font-bold">{formatCurrency(metrics.totalRevenue, currentRegion)}</h3>
              </div>
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-4 text-xs text-blue-100 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>For selected period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Orders</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{metrics.totalOrders}</h3>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Receipt className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
             <div className="mt-4 text-xs text-slate-500">
               Avg. value: <span className="font-semibold">{formatCurrency(metrics.avgOrderValue, currentRegion)}</span>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Cash / Digital</p>
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Cash:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(metrics.cashPayments, currentRegion)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Digital:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(metrics.digitalPayments, currentRegion)}</span>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{regionConfig.tax.name} & Discounts</p>
                 <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{regionConfig.tax.name}:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(metrics.totalTax, currentRegion)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Disc:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">-{formatCurrency(metrics.totalDiscounts, currentRegion)}</span>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">Transaction List</CardTitle>
            {billingFilter !== 'all' && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                Showing: {billingFilter === 'gst_invoice' ? `${regionConfig.tax.name} Invoices` : `Without ${regionConfig.tax.name} Bills`}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Select value={billingFilter} onValueChange={setBillingFilter}>
              <SelectTrigger className="w-[180px] bg-white">
                <Filter className="w-4 h-4 mr-2 text-slate-500" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="gst_invoice">{regionConfig.tax.name} Invoices</SelectItem>
                <SelectItem value="without_gst">Without {regionConfig.tax.name} Bills</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search receipt, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 dark:bg-slate-900/50"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchSales} disabled={loading} className="shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-[180px]">Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Document No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <p>Loading sales history...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Receipt className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-lg font-medium text-slate-900 dark:text-slate-100">No sales found</p>
                        <p className="text-sm">Try adjusting your filters or search term.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => handleViewDetails(sale)}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                           <span>{format(new Date(sale.created_at), 'dd MMM yyyy')}</span>
                           <span className="text-xs text-slate-500">{format(new Date(sale.created_at), 'hh:mm a')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.billing_type === 'gst_invoice' ? (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{regionConfig.tax.name} Invoice</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">Without {regionConfig.tax.name}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                          {sale.billing_type === 'gst_invoice'
                            ? (sale.invoice_number || sale.id.split('-')[0].toUpperCase())
                            : (sale.bill_number || sale.id.split('-')[0].toUpperCase())}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{sale.customer_name || sale.point_of_sale_customers?.name || 'Walk-in Customer'}</span>
                          {sale.billing_type === 'gst_invoice' && sale.customer_gstin && <span className="text-xs text-blue-600 font-mono">{regionConfig.invoiceLabels.taxId}: {sale.customer_gstin}</span>}
                          {!sale.customer_gstin && sale.customer_phone && <span className="text-xs text-slate-500">{sale.customer_phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPaymentBadge(sale.payment_method)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sale.status)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(sale.tax_breakdown?.grand_total || sale.final_amount || sale.total_amount, currentRegion)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewDetails(sale); }}>
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedSale && (
        <BillDetailsModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedSale(null); }}
          sale={selectedSale}
        />
      )}
    </div>
  );
}