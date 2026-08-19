import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, User, Calendar, Eye, ArrowRight, BookOpen } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const BookOrderList = ({ orders = [], isLoading = false, onEdit, onPushToPOS }) => {
  const { toast } = useToast();

  const handlePushToPOS = (order) => {
    if (onPushToPOS) {
      onPushToPOS(order);
    } else {
      toast({
        title: "Feature coming soon",
        description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
          <BookOpen className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">No orders found</h3>
        <p className="text-slate-500 text-sm max-w-sm">
          There are no booked orders yet. Click "New Order" to create your first field booking or wholesale order.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {orders.map((order) => (
        <div 
          key={order.id} 
          className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-md"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                {order.retailer_name || 'Anonymous Customer'}
              </h4>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                {order.created_at ? format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a') : 'Unknown date'}
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={
                order.order_status === 'Pending' 
                  ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                  : order.order_status === 'Confirmed'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }
            >
              {order.order_status || 'Pending'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4 py-2 border-y border-slate-50 dark:border-slate-800">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Executive</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                {order.executive_name || 'Unassigned'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatPrice(order.order_total || 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => onEdit && onEdit(order)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View / Edit
            </Button>
            
            {(order.order_status === 'Pending' || !order.order_status) && (
              <Button 
                size="sm" 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handlePushToPOS(order)}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Push to POS
              </Button>
            )}
          </div>

          {/* Quick Item Count Badge */}
          <div className="absolute -top-2 -right-2 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-slate-950">
            {Array.isArray(order.order_items) ? order.order_items.length : 0} items
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookOrderList;