import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ExpenseBreakdownByVendor = ({ expenses, onVendorClick }) => {
  const vendorData = useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const name = exp.vendor_name || 'Unknown';
      if (!map[name]) {
        map[name] = { name, total: 0, count: 0 };
      }
      map[name].total += exp.total_amount;
      map[name].count += 1;
    });

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 vendors
  }, [expenses]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
          <p className="font-medium text-slate-900 dark:text-white mb-1">{label}</p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Total: ₹{data.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Bills: {data.count}
          </p>
          <p className="text-[10px] text-slate-400 italic mt-1">Click to filter</p>
        </div>
      );
    }
    return null;
  };

  if (vendorData.length === 0) return null;

  return (
    <Card className="mb-6 shadow-sm border-slate-200 dark:border-slate-800 expense-chart-container">
      <CardHeader>
        <CardTitle className="text-lg text-slate-800 dark:text-slate-100">Top Vendors by Amount</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendorData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} 
                     tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0)+'k' : value}`} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} width={100} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.2 }} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} onClick={(data) => onVendorClick(data.name)} className="cursor-pointer">
                {vendorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#f87171" className="hover:opacity-80 transition-opacity" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseBreakdownByVendor;