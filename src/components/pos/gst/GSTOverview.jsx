import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { DollarSign, FileText, PlusCircle, Activity } from 'lucide-react';
import { format, startOfMonth, startOfYear } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateTotal } from '@/utils/gstCalculations';

const GSTOverview = ({ sellerId, onTabChange }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    monthExpenses: 0,
    monthGST: 0,
    ytdExpenses: 0,
    ytdGST: 0,
    recentExpenses: []
  });

  useEffect(() => {
    fetchMetrics();
  }, [sellerId]);

  const fetchMetrics = async () => {
    if (!sellerId) return;
    setLoading(true);
    
    const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const currentYearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');

    try {
      const { data: ytdData } = await supabase
        .from('seller_expenses')
        .select('amount, gst_amount, date, vendor, category')
        .eq('seller_id', sellerId)
        .gte('date', currentYearStart)
        .order('date', { ascending: false });

      if (ytdData) {
        let mExp = 0, mGST = 0, yExp = 0, yGST = 0;
        
        ytdData.forEach(exp => {
          const amt = parseFloat(exp.amount || 0);
          const gst = parseFloat(exp.gst_amount || 0);
          
          yExp += amt;
          yGST += gst;
          
          if (exp.date >= currentMonthStart) {
            mExp += amt;
            mGST += gst;
          }
        });

        setMetrics({
          monthExpenses: mExp,
          monthGST: mGST,
          ytdExpenses: yExp,
          ytdGST: yGST,
          recentExpenses: ytdData.slice(0, 5)
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">GST & Expense Overview</h2>
          <p className="text-muted-foreground">Track your business expenses and Input Tax Credit (ITC)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onTabChange('expenses')} className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
          </Button>
          <Button variant="outline" onClick={() => onTabChange('reports')}>
            <FileText className="mr-2 h-4 w-4" /> Reports
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Current Month Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.monthExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Current Month ITC (GST)</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{metrics.monthGST.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">YTD Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.ytdExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">YTD ITC (GST)</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">₹{metrics.ytdGST.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.recentExpenses.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No recent expenses found.</div>
          ) : (
            <div className="space-y-4">
              {metrics.recentExpenses.map((exp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{exp.vendor}</p>
                    <p className="text-xs text-slate-500">{exp.date} • {exp.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">₹{calculateTotal(exp.amount, exp.gst_amount).toFixed(2)}</p>
                    {exp.gst_amount > 0 && <p className="text-xs text-blue-600 dark:text-blue-400">Includes ₹{parseFloat(exp.gst_amount).toFixed(2)} GST</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GSTOverview;