import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bike, Package, DollarSign, Users, TrendingUp, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

const DeliveryDashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    activeRiders: 0,
    totalRiders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch bookings stats
      const { data: bookings } = await supabase
        .from('delivery_bookings')
        .select('status, fare_amount');
        
      // Fetch riders stats
      const { count: totalRiders } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'rider');

      const { count: activeRiders } = await supabase
        .from('delivery_rider_details')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true);

      if (bookings) {
        const totalBookings = bookings.length;
        const activeBookings = bookings.filter(b => ['open', 'accepted', 'picked_up', 'in_transit'].includes(b.status)).length;
        const completedBookings = bookings.filter(b => b.status === 'delivered').length;
        const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.fare_amount) || 0), 0);

        setStats({
          totalBookings,
          activeBookings,
          completedBookings,
          totalRevenue,
          activeRiders: activeRiders || 0,
          totalRiders: totalRiders || 0
        });
      }
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Revenue', value: formatPrice(stats.totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Total Deliveries', value: stats.totalBookings, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Active Orders', value: stats.activeBookings, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { title: 'Active Riders', value: `${stats.activeRiders} / ${stats.totalRiders}`, icon: Bike, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">Delivery Overview</h1>
        <p className="text-slate-600">Real-time metrics for delivery operations.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="glass-effect hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed">
              Chart Placeholder (Integrate Recharts here)
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" /> Top Performing Riders
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-center py-12 text-slate-500">
                No rider performance data available yet.
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryDashboard;