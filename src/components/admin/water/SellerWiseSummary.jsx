import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, TrendingUp, Package, CheckCircle, Clock, XCircle } from 'lucide-react';

const SellerWiseSummary = ({ orders }) => {
  const summary = useMemo(() => {
    const map = {};

    orders.forEach(order => {
        const sellerId = order.seller_id;
        const sellerName = order.seller?.business_name || 'Unknown Seller';
        
        if (!map[sellerId]) {
            map[sellerId] = {
                id: sellerId,
                name: sellerName,
                totalOrders: 0,
                pending: 0,
                confirmed: 0,
                delivered: 0,
                cancelled: 0,
                revenue: 0,
            };
        }

        map[sellerId].totalOrders += 1;
        map[sellerId].revenue += Number(order.total_price || 0);

        const status = (order.status || '').toLowerCase();
        if (status === 'pending') map[sellerId].pending += 1;
        else if (['confirmed', 'accepted'].includes(status)) map[sellerId].confirmed += 1;
        else if (['delivered', 'completed'].includes(status)) map[sellerId].delivered += 1;
        else if (status === 'cancelled') map[sellerId].cancelled += 1;
    });

    return Object.values(map).map(s => ({
        ...s,
        completionRate: s.totalOrders > 0 ? Math.round((s.delivered / s.totalOrders) * 100) : 0,
        avgOrderValue: s.totalOrders > 0 ? Math.round(s.revenue / s.totalOrders) : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  if (summary.length === 0) {
      return (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-500">No seller data available from orders.</p>
          </div>
      );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4">
        {summary.map((seller) => (
            <Card key={seller.id} className="hover:shadow-md transition-shadow duration-200 overflow-hidden border-slate-200 group">
                <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500 w-full" />
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-bold text-slate-800 line-clamp-1 flex-1" title={seller.name}>
                        {seller.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal text-xs">
                        {seller.totalOrders} Orders
                    </Badge>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-2xl font-bold text-slate-900">₹{seller.revenue.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 font-medium">total revenue</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-green-50 text-green-700 p-1.5 rounded flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{seller.delivered} Done</span>
                        </div>
                        <div className="bg-yellow-50 text-yellow-700 p-1.5 rounded flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{seller.pending} Pending</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                            <span>{seller.completionRate}% Rate</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Avg ₹{seller.avgOrderValue}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
  );
};

export default SellerWiseSummary;