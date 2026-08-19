import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, FileText, ShoppingCart, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const SalesSummaryCards = ({ sales, loading }) => {
  console.log('[SalesSummaryCards] Rendering with sales:', sales?.length || 0);

  const summary = useMemo(() => {
    if (!sales || sales.length === 0) {
      return {
        totalTransactions: 0,
        totalTaxableValue: 0,
        totalGST: 0,
        totalInvoiceValue: 0
      };
    }

    const allItems = sales.flatMap(sale => sale.items || []);
    
    const totalTaxableValue = allItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const totalGST = allItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const totalInvoiceValue = totalTaxableValue + totalGST;

    return {
      totalTransactions: sales.length, // CRITICAL FIX: Count ALL sales transactions, not limited to 1000
      totalTaxableValue,
      totalGST,
      totalInvoiceValue
    };
  }, [sales]);

  console.log('[SalesSummaryCards] Summary calculated:', summary);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Transactions',
      value: summary.totalTransactions.toLocaleString('en-IN'),
      icon: FileText,
      description: 'All sales records',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Total Taxable Value',
      value: `₹${summary.totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ShoppingCart,
      description: 'Excluding GST',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Total GST Collected',
      value: `₹${summary.totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      description: 'IGST + SGST + CGST',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Total Invoice Value',
      value: `₹${summary.totalInvoiceValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: IndianRupee,
      description: 'Including GST',
      color: 'text-orange-600 dark:text-orange-400'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SalesSummaryCards;