import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BillsSummary = ({ bills }) => {
  const { user } = useAuth();
  
  const summary = useMemo(() => {
    if (!bills) return { paid: 0, unpaid: 0, total: 0, count: 0, byCategory: {} };
    
    return bills.reduce((acc, bill) => {
      acc.count++;
      acc.total += bill.amount;
      const categoryName = bill.category?.name || 'Uncategorized';
      
      if (!acc.byCategory[categoryName]) {
        acc.byCategory[categoryName] = { paid: 0, unpaid: 0, total: 0 };
      }
      acc.byCategory[categoryName].total += bill.amount;

      if (bill.status === 'paid') {
        acc.paid += bill.amount;
        acc.byCategory[categoryName].paid += bill.amount;
      } else {
        acc.unpaid += bill.amount;
        acc.byCategory[categoryName].unpaid += bill.amount;
      }
      return acc;
    }, { paid: 0, unpaid: 0, total: 0, count: 0, byCategory: {} });
  }, [bills]);

  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ['dior_monthly_bills_analytics', user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_bill_analytics', { p_user_id: user.id });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const categoryArray = Object.entries(summary.byCategory).map(([name, values]) => ({ name, ...values }));

  if (!bills) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Total Bills</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{summary.count}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Paid</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{formatPrice(summary.paid)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Unpaid</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatPrice(summary.unpaid)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Amount</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatPrice(summary.total)}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Bills (Last 12 Months)</CardTitle></CardHeader>
          <CardContent>
            {isLoadingChart ? <Skeleton className="h-[300px]" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month_start" />
                  <YAxis tickFormatter={(value) => formatPrice(value)} />
                  <Tooltip formatter={(value) => formatPrice(value)} />
                  <Bar dataKey="total_amount" fill="var(--color-primary, #3b82f6)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Breakdown by Category</CardTitle></CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            <div className="space-y-4">
              {categoryArray.length > 0 ? categoryArray.map(cat => (
                <div key={cat.name}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-sm font-semibold">{formatPrice(cat.total)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div 
                      className="bg-green-500 h-2.5 rounded-l-full"
                      style={{ width: `${(cat.paid / cat.total) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-red-500 h-2.5 rounded-r-full"
                      style={{ width: `${(cat.unpaid / cat.total) * 100}%`, marginLeft: `${(cat.paid / cat.total) * 100}%`, marginTop: '-10px' }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Paid: {formatPrice(cat.paid)}</span>
                      <span>Unpaid: {formatPrice(cat.unpaid)}</span>
                  </div>
                </div>
              )) : <p className="text-muted-foreground">No bills to display.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillsSummary;