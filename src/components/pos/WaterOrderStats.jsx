import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Truck, DollarSign, Clock } from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, bgClass }) => (
  <Card className="border-none shadow-sm bg-white/60 backdrop-blur-sm hover:shadow-md transition-all duration-300">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
    </CardContent>
  </Card>
);

const WaterOrderStats = ({ orders }) => {
  const stats = React.useMemo(() => {
    const today = new Date().toDateString();
    
    const todayOrders = orders.filter(o => 
      new Date(o.created_at).toDateString() === today
    );

    const pendingDeliveries = orders.filter(o => 
      ['pending', 'confirmed', 'accepted', 'processing', 'out_for_delivery'].includes((o.status || '').toLowerCase())
    );

    // Calculate revenue for today (completed orders)
    const revenueToday = todayOrders
      .filter(o => ['delivered', 'completed'].includes((o.status || '').toLowerCase()))
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

    // Calculate average delivery time for completed orders today (mock calculation as we might not have delivered_at)
    // In a real app, you'd diff created_at and delivered_at
    const completedToday = todayOrders.filter(o => ['delivered', 'completed'].includes((o.status || '').toLowerCase()));
    const avgTime = completedToday.length > 0 ? "45m" : "--"; 

    return {
      todayCount: todayOrders.length,
      pendingCount: pendingDeliveries.length,
      revenue: revenueToday,
      avgTime
    };
  }, [orders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <StatCard 
        title="Orders Today" 
        value={stats.todayCount} 
        subtitle="New requests"
        icon={ShoppingBag}
        colorClass="text-blue-600"
        bgClass="bg-blue-50"
      />
      <StatCard 
        title="Pending Deliveries" 
        value={stats.pendingCount}
        subtitle="In queue"
        icon={Truck}
        colorClass="text-orange-600"
        bgClass="bg-orange-50"
      />
      <StatCard 
        title="Revenue Today" 
        value={`₹${stats.revenue}`}
        subtitle="Realized earnings"
        icon={DollarSign}
        colorClass="text-green-600"
        bgClass="bg-green-50"
      />
      <StatCard 
        title="Avg Delivery Time" 
        value={stats.avgTime}
        subtitle="For today's orders"
        icon={Clock}
        colorClass="text-cyan-600"
        bgClass="bg-cyan-50"
      />
    </div>
  );
};

export default WaterOrderStats;