import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Briefcase, Calendar, Package, IndianRupee, ArrowRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';

const BookOrderDetailsModal = ({ isOpen, onClose, order, onPushToPOS }) => {
  if (!order) return null;

  const items = Array.isArray(order.order_items) ? order.order_items : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="text-xl font-bold">Order Details</DialogTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
              {order.order_status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 my-4">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Customer</p>
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <User className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-sm truncate">{order.retailer_name}</span>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Booked By</p>
              <div className="flex items-center justify-end gap-2 text-slate-900 dark:text-slate-100">
                <Briefcase className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-sm truncate">{order.executive_name}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date</p>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(order.created_at), 'dd MMM yyyy')}</span>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Total</p>
              <div className="flex items-center justify-end gap-1 text-blue-600 dark:text-blue-400 font-bold">
                {formatPrice(order.order_total)}
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items List ({items.length})
            </h5>
            <ScrollArea className="h-[250px] pr-4 border rounded-lg p-2 bg-slate-50/30">
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{item.product_name}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} {item.unit || 'pcs'} × {formatPrice(item.unit_price)}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        {formatPrice(item.quantity * item.unit_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {order.notes && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Notes</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/20 italic">
                "{order.notes}"
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {order.order_status === 'Pending' && (
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => onPushToPOS(order)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Transfer to Cart
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookOrderDetailsModal;