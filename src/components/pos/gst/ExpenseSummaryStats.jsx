import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { IndianRupee, FileText, Calculator, TrendingUp } from 'lucide-react';
import { isValidDate } from '@/utils/dateUtils';

const ExpenseSummaryStats = ({ expenses }) => {
  const stats = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return { total: 0, gst: 0, count: 0, avg: 0 };
    }
    
    const validExpenses = expenses.filter(e => isValidDate(e.date || e.expense_date || e.bill_date));
    
    if (validExpenses.length === 0) {
      return { total: 0, gst: 0, count: 0, avg: 0 };
    }

    const total = validExpenses.reduce((sum, exp) => sum + exp.total_amount, 0);
    const gst = validExpenses.reduce((sum, exp) => sum + exp.gst_amount, 0);
    const count = validExpenses.length;
    return {
      total,
      gst,
      count,
      avg: count > 0 ? total / count : 0
    };
  }, [expenses]);

  const formatCurrency = (val) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="expense-stat-card shadow-sm border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-red-50/50 dark:from-slate-900 dark:to-slate-800/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Paid Bills</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.total)}</h3>
            </div>
            <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <IndianRupee className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="expense-stat-card shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total GST Paid</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.gst)}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="expense-stat-card shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Number of Bills</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.count}</h3>
            </div>
            <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="expense-stat-card shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Avg. Bill Amount</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.avg)}</h3>
            </div>
            <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseSummaryStats;