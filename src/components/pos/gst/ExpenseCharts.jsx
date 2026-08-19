import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { parseExpenseDate, formatExpenseDate, isValidDate } from '@/utils/dateUtils';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1'];

const ExpenseCharts = ({ expenses }) => {
  const chartData = useMemo(() => {
    const trendMap = {};
    const categoryMap = {};

    expenses.filter(e => isValidDate(e.date || e.bill_date || e.expense_date)).forEach(exp => {
      // Trend
      const rawDate = exp.date || exp.bill_date || exp.expense_date;
      const parsedDate = parseExpenseDate(rawDate);
      
      if (parsedDate) {
        try {
          const dateStr = formatExpenseDate(parsedDate, 'MMM dd');
          if (dateStr !== 'Invalid Date') {
            trendMap[dateStr] = (trendMap[dateStr] || 0) + exp.total_amount;
          }
        } catch (err) {
          console.warn('Failed to format date in charts:', rawDate, err);
        }
      } else {
        console.warn('Invalid expense date in charts:', rawDate);
      }

      // Category
      const cat = exp.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + exp.total_amount;
    });

    const trend = Object.keys(trendMap).map(date => ({
      date,
      amount: trendMap[date]
    })).reverse(); // Assuming expenses are sorted desc, we want asc for chart

    const categories = Object.keys(categoryMap).map(name => ({
      name,
      value: categoryMap[name]
    })).sort((a, b) => b.value - a.value);

    return { trend, categories };
  }, [expenses]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-medium text-slate-900 dark:text-white mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ₹{entry.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      
      {/* Trend Chart */}
      <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800 expense-chart-container">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Paid Bills Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {chartData.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} dx={-10}
                         tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="amount" name="Expense" stroke="#ef4444" strokeWidth={3}
                        dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No valid trend data available</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 expense-chart-container">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-100">By Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex flex-col items-center">
            {chartData.categories.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={chartData.categories}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full mt-2 grid grid-cols-1 gap-2 text-xs overflow-y-auto max-h-[20%] custom-scrollbar">
                  {chartData.categories.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="truncate flex-1 text-slate-600 dark:text-slate-300">{entry.name}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {Math.round((entry.value / chartData.categories.reduce((a,b)=>a+b.value,0)) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No category data available</div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default ExpenseCharts;