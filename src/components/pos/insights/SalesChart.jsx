import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Circle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils'; // Import formatCurrency

const SalesChart = ({ data, loading }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-lg text-sm">
          <p className="font-bold text-slate-700 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-teal-600 font-semibold">
              Sales: {formatCurrency(payload[0].value)}
            </p>
            <p className="text-orange-500 font-semibold">
              Profit: {formatCurrency(payload[1].value)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex justify-end gap-4 mb-4 text-sm font-medium">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-current" style={{ color: entry.color }} />
            <span className="text-slate-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Compute totals for header
  const totalSales = data?.reduce((acc, curr) => acc + (curr.Sales || 0), 0) || 0;
  const totalProfit = data?.reduce((acc, curr) => acc + (curr.Profit || 0), 0) || 0;

  return (
    <Card className="shadow-lg border-0 rounded-xl overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-blue-700">Sales</CardTitle>
          <div className="flex gap-2">
             {/* Legend is rendered by Chart, but we can put custom header stuff here */}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-1 flex flex-col">
        {loading ? (
          <Skeleton className="w-full h-full min-h-[300px]" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Total Sales</p>
                <p className="text-lg font-bold text-teal-600">{formatCurrency(totalSales)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Total Profit</p>
                <p className="text-lg font-bold text-orange-500">{formatCurrency(totalProfit)}</p>
              </div>
            </div>

            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value)} // Apply formatCurrency here
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={renderLegend} verticalAlign="top" height={36}/>
                  <Area 
                    type="monotone" 
                    dataKey="Sales" 
                    stroke="#0d9488" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Profit" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesChart;