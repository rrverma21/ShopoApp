import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, TrendingUp, TrendingDown, PieChart, Calendar } from 'lucide-react';

const ExpenseSummaryCards = ({ expenses }) => {
  // Calculate metrics
  const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const totalGST = expenses.reduce((sum, exp) => sum + (parseFloat(exp.gst_amount) || 0), 0);
  const grandTotal = totalExpenses + totalGST;

  // Breakdown by type
  const expensesByType = expenses.reduce((acc, exp) => {
    const type = exp.expense_type || 'Other';
    if (!acc[type]) acc[type] = 0;
    acc[type] += (parseFloat(exp.amount) || 0) + (parseFloat(exp.gst_amount) || 0);
    return acc;
  }, {});

  // Monthly comparison
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const currentMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  }).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0) + (parseFloat(exp.gst_amount) || 0), 0);

  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const lastMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear;
  }).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0) + (parseFloat(exp.gst_amount) || 0), 0);

  const monthlyChange = lastMonthExpenses > 0 
    ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Expenses */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Expenses</CardTitle>
            <IndianRupee className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">₹{totalExpenses.toFixed(2)}</div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Base amount (excl. GST)</p>
        </CardContent>
      </Card>

      {/* Total GST */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Total GST</CardTitle>
            <PieChart className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">₹{totalGST.toFixed(2)}</div>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Input tax credit</p>
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Grand Total</CardTitle>
            <IndianRupee className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">₹{grandTotal.toFixed(2)}</div>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Including all taxes</p>
        </CardContent>
      </Card>

      {/* Monthly Comparison */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Monthly Trend</CardTitle>
            <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">₹{currentMonthExpenses.toFixed(2)}</div>
          <div className="flex items-center gap-1 mt-1">
            {monthlyChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
            <p className={cn("text-xs font-medium", monthlyChange >= 0 ? "text-red-600" : "text-green-600")}>
              {Math.abs(monthlyChange).toFixed(1)}% vs last month
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Type */}
      {Object.keys(expensesByType).length > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(expensesByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, amount]) => (
                  <div key={type} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{type}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">₹{amount.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {((amount / grandTotal) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default ExpenseSummaryCards;