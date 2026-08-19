import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatPrice } from '@/lib/utils';
import { subDays } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, ShoppingCart, Inbox, Search, TrendingUp, Package, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const PosSmartReorder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Product Data
  const [allLowStockProducts, setAllLowStockProducts] = useState([]);
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  
  // Filtered Data (for search)
  const [filteredLowStockProducts, setFilteredLowStockProducts] = useState([]);
  const [filteredTopSellingProducts, setFilteredTopSellingProducts] = useState([]);

  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: 'stock_level', direction: 'asc' });

  // Selection & Processing
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [reorderList, setReorderList] = useState([]);
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('low-stock');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Fetch Low Stock Products - Filtered by recent sales activity via RPC
      const lowStockPromise = supabase.rpc('get_active_low_stock_products', {
        p_user_id: user.id,
        p_days_lookback: 90
      });

      // 2. Fetch Top Selling Products (Smart Recommendations)
      const ninetyDaysAgo = subDays(new Date(), 90).toISOString();
      const topSellingPromise = supabase.rpc('get_top_selling_products', {
        p_user_id: user.id,
        p_start_date: ninetyDaysAgo,
        p_limit: 100 // Increased limit to allow for better local sorting/filtering
      });

      const [lowStockRes, topSellingRes] = await Promise.all([lowStockPromise, topSellingPromise]);

      if (lowStockRes.error) throw lowStockRes.error;
      if (topSellingRes.error) throw topSellingRes.error;

      const lowStockData = lowStockRes.data || [];
      const topSellingData = topSellingRes.data || [];

      setAllLowStockProducts(lowStockData);
      setFilteredLowStockProducts(lowStockData);
      
      setTopSellingProducts(topSellingData);
      setFilteredTopSellingProducts(topSellingData);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Search Filtering
  useEffect(() => {
    const lowercasedFilter = debouncedSearchTerm.toLowerCase();
    const filterFn = (item) => 
      (item.name?.toLowerCase().includes(lowercasedFilter)) ||
      (item.sku?.toLowerCase().includes(lowercasedFilter));

    setFilteredLowStockProducts(allLowStockProducts.filter(filterFn));
    setFilteredTopSellingProducts(topSellingProducts.filter(filterFn));
  }, [debouncedSearchTerm, allLowStockProducts, topSellingProducts]);

  // Sorting Logic
  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedLowStockProducts = useMemo(() => {
    const sorted = [...filteredLowStockProducts];
    
    // If current sort key is not relevant to this table, return sorted by default logic or keep existing
    const relevantKeys = ['name', 'sku', 'stock_level', 'low_stock_threshold'];
    if (!relevantKeys.includes(sortConfig.key)) {
       // Fallback or keep as is (database default is stock_level asc)
       return sorted;
    }

    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredLowStockProducts, sortConfig]);

  const sortedTopSellingProducts = useMemo(() => {
    const sorted = [...filteredTopSellingProducts];
    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle computed columns
      if (sortConfig.key === 'est_revenue') {
         aValue = (a.cost_price || 0) * (a.total_sold || 0);
         bValue = (b.cost_price || 0) * (b.total_sold || 0);
      }
      // Handle string comparison case-insensitively
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      // If key doesn't exist on this object (e.g. sorting by SKU when in Top Selling tab if SKU missing), treat as equal or low
      if (aValue === undefined) aValue = -Infinity;
      if (bValue === undefined) bValue = -Infinity;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredTopSellingProducts, sortConfig]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-3 w-3 text-indigo-600" />
      : <ArrowDown className="ml-2 h-3 w-3 text-indigo-600" />;
  };

  // Selection Handlers
  const handleSelectionChange = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked, dataSource) => {
    if (checked) {
      const newIds = dataSource.map(p => p.id);
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        newIds.forEach(id => newSet.add(id));
        return newSet;
      });
    } else {
      // Deselect current view's items only
      const currentViewIds = new Set(dataSource.map(p => p.id));
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        currentViewIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  // Helper to find product details from either list
  const getProductDetails = (id) => {
    return allLowStockProducts.find(p => p.id === id) || topSellingProducts.find(p => p.id === id);
  };

  // Calculation Logic
  const calculateReorderQuantities = async () => {
    if (selectedProducts.size === 0) {
      toast({ title: 'No products selected', description: 'Please select products to generate a reorder list.', variant: 'destructive' });
      return;
    }
    setIsCalculating(true);
    try {
      const productIds = Array.from(selectedProducts);
      const ninetyDaysAgo = subDays(new Date(), 90).toISOString();

      // We fetch sales data again to get precise daily rates for ALL selected products
      const { data: salesData, error: salesError } = await supabase
        .from('point_of_sale_sale_items')
        .select('product_id, quantity, point_of_sale_sales!inner(created_at)')
        .in('product_id', productIds)
        .gte('point_of_sale_sales.created_at', ninetyDaysAgo);

      if (salesError) throw salesError;

      const newReorderList = productIds.map(id => {
        const product = getProductDetails(id);
        if (!product) return null;
        
        const productSales = salesData.filter(s => s.product_id === id);
        const totalSold = productSales.reduce((sum, item) => sum + item.quantity, 0);
        
        // Logic: 90 days data -> Daily Avg -> 30 days stock requirement
        const dailyRate = totalSold / 90;
        const recommendedQty = Math.max(1, Math.ceil(dailyRate * 30));
        
        return {
          ...product,
          totalSoldLast90Days: totalSold,
          recommendedQty,
          buyValue: recommendedQty * (product.cost_price || 0),
        };
      }).filter(Boolean);

      setReorderList(newReorderList);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error calculating recommendations', description: error.message, variant: 'destructive' });
    } finally {
      setIsCalculating(false);
    }
  };

  const totalBuyValue = useMemo(() => {
    return reorderList.reduce((sum, item) => sum + item.buyValue, 0);
  }, [reorderList]);

  // Checkbox state helpers
  const isAllSelected = (dataSource) => dataSource.length > 0 && dataSource.every(p => selectedProducts.has(p.id));

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
        <Helmet>
          <title>Smart Reorder | POS | B2B Nexus</title>
          <meta name="description" content="Generate intelligent reorder suggestions based on sales data." />
        </Helmet>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
             <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Smart Reorder</h1>
                <p className="text-slate-500 dark:text-slate-400">Generate intelligent reorder suggestions.</p>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4">
               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-950"
                  />
                </div>
                <Button onClick={calculateReorderQuantities} disabled={isCalculating || selectedProducts.size === 0} className="shrink-0">
                  {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                  Generate Reorder List
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="low-stock" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Low Stock Alerts
                  <Badge variant="secondary" className="ml-1">{filteredLowStockProducts.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="top-selling" className="flex items-center gap-2">
                   <TrendingUp className="h-4 w-4" />
                   Smart Recommendations
                   <Badge variant="secondary" className="ml-1 bg-indigo-100 text-indigo-700">Top 30</Badge>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Low Stock Products */}
              <TabsContent value="low-stock">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader>
                    <CardTitle>Lowest Stock Products</CardTitle>
                    <CardDescription>Products running low on inventory with active sales in the last 90 days.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : sortedLowStockProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground p-6">
                        <Package className="h-12 w-12 mb-4 opacity-20" />
                        <p>No low stock products with recent sales found matching your search.</p>
                      </div>
                    ) : (
                      <div className="max-h-[600px] overflow-y-auto relative">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white dark:bg-slate-950 z-10 shadow-sm border-b border-slate-200 dark:border-slate-800">
                            <TableRow>
                              <TableHead className="w-[50px]">
                                <Checkbox
                                  checked={isAllSelected(sortedLowStockProducts)}
                                  onCheckedChange={(checked) => handleSelectAll(checked, sortedLowStockProducts)}
                                />
                              </TableHead>
                              <TableHead 
                                 className="cursor-pointer hover:bg-slate-100/50 transition-colors" 
                                 onClick={() => handleSort('name')}
                              >
                                <div className="flex items-center">
                                  Product
                                  <SortIcon columnKey="name" />
                                </div>
                              </TableHead>
                              <TableHead 
                                 className="cursor-pointer hover:bg-slate-100/50 transition-colors" 
                                 onClick={() => handleSort('sku')}
                              >
                                <div className="flex items-center">
                                  SKU
                                  <SortIcon columnKey="sku" />
                                </div>
                              </TableHead>
                              <TableHead 
                                 className="text-center cursor-pointer hover:bg-slate-100/50 transition-colors" 
                                 onClick={() => handleSort('stock_level')}
                              >
                                 <div className="flex items-center justify-center">
                                   Current Stock
                                   <SortIcon columnKey="stock_level" />
                                 </div>
                              </TableHead>
                              <TableHead 
                                 className="text-center cursor-pointer hover:bg-slate-100/50 transition-colors" 
                                 onClick={() => handleSort('low_stock_threshold')}
                              >
                                 <div className="flex items-center justify-center">
                                   Threshold
                                   <SortIcon columnKey="low_stock_threshold" />
                                 </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedLowStockProducts.map(product => (
                              <TableRow key={product.id} className={selectedProducts.has(product.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedProducts.has(product.id)}
                                    onCheckedChange={() => handleSelectionChange(product.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{product.sku || '-'}</TableCell>
                                <TableCell className="text-center">
                                  <span className="font-bold text-red-500">{product.stock_level}</span>
                                </TableCell>
                                <TableCell className="text-center text-muted-foreground">{product.low_stock_threshold}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Top Selling Products */}
              <TabsContent value="top-selling">
                <Card className="border-indigo-200 dark:border-indigo-900 shadow-sm bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-indigo-900 dark:text-indigo-100">Top Selling Recommendations</CardTitle>
                        <CardDescription>Your best-performing products from the last 90 days.</CardDescription>
                      </div>
                      <TrendingUp className="h-8 w-8 text-indigo-200 dark:text-indigo-800" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                     {isLoading ? (
                      <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
                    ) : sortedTopSellingProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground p-6">
                        <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
                        <p>No sales data available yet to make recommendations.</p>
                      </div>
                    ) : (
                      <div className="max-h-[600px] overflow-y-auto relative">
                        <Table>
                          <TableHeader className="sticky top-0 bg-indigo-50 dark:bg-indigo-950 z-20 shadow-sm border-b border-indigo-100 dark:border-indigo-800">
                            <TableRow>
                              <TableHead className="w-[50px]">
                                <Checkbox
                                  checked={isAllSelected(sortedTopSellingProducts)}
                                  onCheckedChange={(checked) => handleSelectAll(checked, sortedTopSellingProducts)}
                                />
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-indigo-100/50 transition-colors" 
                                onClick={() => handleSort('name')}
                              >
                                <div className="flex items-center">
                                  Product
                                  <SortIcon columnKey="name" />
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-center cursor-pointer hover:bg-indigo-100/50 transition-colors" 
                                onClick={() => handleSort('total_sold')}
                              >
                                <div className="flex items-center justify-center">
                                  Total Sold (90d)
                                  <SortIcon columnKey="total_sold" />
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-center cursor-pointer hover:bg-indigo-100/50 transition-colors" 
                                onClick={() => handleSort('stock_level')}
                              >
                                <div className="flex items-center justify-center">
                                  Current Stock
                                  <SortIcon columnKey="stock_level" />
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right cursor-pointer hover:bg-indigo-100/50 transition-colors" 
                                onClick={() => handleSort('est_revenue')}
                              >
                                <div className="flex items-center justify-end">
                                  Est. Revenue
                                  <SortIcon columnKey="est_revenue" />
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedTopSellingProducts.map((product, idx) => (
                              <TableRow key={product.id} className={selectedProducts.has(product.id) ? 'bg-indigo-100/50 dark:bg-indigo-900/40' : ''}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedProducts.has(product.id)}
                                    onCheckedChange={() => handleSelectionChange(product.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                      {idx + 1}
                                    </span>
                                    <span className="font-medium">{product.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-semibold text-indigo-600 dark:text-indigo-400">
                                  {product.total_sold}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={product.stock_level <= 10 ? "text-red-500 font-bold" : "text-slate-600 dark:text-slate-400"}>
                                    {product.stock_level}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {/* This is an estimate based on cost * sold, just for display context */}
                                  {formatPrice(product.cost_price * product.total_sold)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar: Reorder List */}
          <div className="lg:col-span-1">
             <div className="sticky top-6">
              <Card className="border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-indigo-500" />
                    Reorder Plan
                  </CardTitle>
                  <CardDescription>
                    {selectedProducts.size} products selected for calculation
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isCalculating ? (
                    <div className="flex flex-col justify-center items-center h-64 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                      <p className="text-sm text-muted-foreground animate-pulse">Analyzing sales velocity...</p>
                    </div>
                  ) : reorderList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground p-6 bg-slate-50/30 dark:bg-slate-900/20">
                      <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Inbox className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="font-medium text-slate-900 dark:text-slate-200">No Plan Generated</p>
                      <p className="text-xs mt-1 max-w-[200px]">Select products from the lists and click "Generate" to see smart quantity suggestions.</p>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-[calc(100vh-350px)] overflow-y-auto p-4 space-y-3">
                        {reorderList.map(item => (
                          <div key={item.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-semibold text-sm line-clamp-1" title={item.name}>{item.name}</p>
                              <Badge variant="outline" className="text-[10px] h-5">
                                Stock: {item.stock_level}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                               <div>
                                  <span className="text-muted-foreground block">90-Day Sales</span>
                                  <span className="font-medium">{item.totalSoldLast90Days} units</span>
                               </div>
                               <div className="text-right">
                                  <span className="text-muted-foreground block">Est. Cost</span>
                                  <span className="font-medium">{formatPrice(item.buyValue)}</span>
                               </div>
                            </div>

                            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
                              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Recommended Order</span>
                              <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{item.recommendedQty}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Investment:</span>
                          <span className="text-xl font-bold text-slate-900 dark:text-white">{formatPrice(totalBuyValue)}</span>
                        </div>
                        <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
                          Create Purchase Order
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosSmartReorder;