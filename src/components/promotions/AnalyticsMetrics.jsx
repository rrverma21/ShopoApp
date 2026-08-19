import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, MousePointerClick, TrendingUp, ShoppingCart } from 'lucide-react';

const AnalyticsMetrics = ({ views = 0, clicks = 0, orders = 0 }) => {
    const conversionRate = clicks > 0 ? ((orders / clicks) * 100).toFixed(1) : 0;

    const metrics = [
        { title: 'Total Views', value: views, icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
        { title: 'Link Clicks', value: clicks, icon: MousePointerClick, color: 'text-purple-500', bg: 'bg-purple-50' },
        { title: 'Orders Generated', value: orders, icon: ShoppingCart, color: 'text-green-500', bg: 'bg-green-50' },
        { title: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50' }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metrics.map((m, i) => (
                <Card key={i} className="border-slate-100 shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${m.bg}`}>
                            <m.icon className={`w-6 h-6 ${m.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">{m.title}</p>
                            <h3 className="text-2xl font-bold text-slate-800">{m.value}</h3>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default AnalyticsMetrics;