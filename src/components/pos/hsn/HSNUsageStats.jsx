import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { useHSNMaster } from '@/hooks/useHSNMaster';
import { Skeleton } from '@/components/ui/skeleton';
import { Hash, Tag, Package, Layers } from 'lucide-react';

const HSNUsageStats = () => {
  const { getHSNUsageStats, subscribeToHSNChanges } = useHSNMaster();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    const { data } = await getHSNUsageStats();
    if (data) {
      setStats(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
    const unsubscribe = subscribeToHSNChanges(() => {
      loadStats();
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="h-[300px] p-6 flex items-center"><Skeleton className="h-full w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!stats || stats.totalHSN === 0) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Hash className="h-12 w-12 mb-4 opacity-20" />
          <p>No HSN data available to display statistics.</p>
        </CardContent>
      </Card>
    );
  }

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total HSN Codes</p>
              <h3 className="text-2xl font-bold mt-1">{stats.totalHSN}</h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Hash className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Most Used</p>
              <div className="mt-1">
                {stats.mostUsedHSN ? (
                  <div className="flex flex-col">
                    <span className="font-bold font-mono truncate max-w-[120px]">{stats.mostUsedHSN.name || stats.mostUsedHSN.label || stats.mostUsedHSN.hsn_code}</span>
                  </div>
                ) : (
                  <span className="text-xl font-bold">-</span>
                )}
              </div>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
              <Tag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categories Linked</p>
              <h3 className="text-2xl font-bold mt-1">{stats.categoriesUsingHSN}</h3>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Products Linked</p>
              <h3 className="text-2xl font-bold mt-1">{stats.productsUsingHSN}</h3>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.gstRateDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Products Distribution by GST Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.gstRateDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <XAxis 
                    dataKey="rate" 
                    tickFormatter={(val) => `${val}%`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', opacity: 0.5 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', opacity: 0.5 }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`${value} HSN Codes`, 'Count']}
                    labelFormatter={(label) => `GST Rate: ${label}%`}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.gstRateDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HSNUsageStats;