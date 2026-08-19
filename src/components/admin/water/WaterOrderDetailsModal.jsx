import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Phone, MapPin, Building, Calendar, Package, CreditCard, StickyNote, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const WaterOrderDetailsModal = ({ order, isOpen, onClose }) => {
  if (!order) return null;

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered':
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <DialogHeader className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Order #{order.id.slice(0, 8)}
                </DialogTitle>
                <DialogDescription className="mt-1 flex items-center gap-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(order.created_at), 'PPP p')}
                </DialogDescription>
              </div>
              <Badge className={`${getStatusColor(order.status)} border px-3 py-1 capitalize`}>
                {order.status}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Customer Info
              </h4>
              <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 space-y-3">
                <div>
                  <p className="font-semibold text-slate-900">{order.customer_name}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                    <Phone className="w-3.5 h-3.5" /> {order.customer_phone}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Delivery Address</p>
                  <p className="text-sm text-slate-700 leading-relaxed flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                    {order.customer_address}
                  </p>
                  {order.water_delivery_areas?.name && (
                    <Badge variant="outline" className="mt-2 bg-white text-slate-600 font-normal">
                      Area: {order.water_delivery_areas.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Seller Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-3.5 h-3.5" /> Seller Info
              </h4>
              <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 space-y-3">
                 <div>
                    <p className="font-semibold text-slate-900">{order.seller?.business_name || 'Unknown Seller'}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                       {order.seller?.contact_person}
                    </p>
                 </div>
                 <Separator />
                 <div className="text-sm text-slate-500 space-y-1">
                    <p className="flex items-center gap-2">
                       <Phone className="w-3.5 h-3.5" /> {order.seller?.phone || 'N/A'}
                    </p>
                    <p className="flex items-center gap-2">
                       <span className="font-mono text-xs bg-slate-100 px-1 rounded">ID: {order.seller_id?.slice(0,8)}</span>
                    </p>
                 </div>
              </div>
            </div>
          </div>

          {/* Order Items & Totals */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-3.5 h-3.5" /> Order Summary
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Product</th>
                            <th className="px-4 py-3 font-medium text-right">Quantity</th>
                            <th className="px-4 py-3 font-medium text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <tr>
                            <td className="px-4 py-3 text-slate-900 font-medium">
                                {order.water_products?.name || 'Water Can'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">{order.quantity}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-semibold">₹{order.total_price}</td>
                        </tr>
                    </tbody>
                    <tfoot className="bg-slate-50/80 border-t border-slate-200">
                        <tr>
                           <td colSpan="2" className="px-4 py-3 text-right font-medium text-slate-600">Total Amount</td>
                           <td className="px-4 py-3 text-right font-bold text-blue-600 text-base">₹{order.total_price}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {order.notes && (
                   <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-800 flex gap-2">
                       <StickyNote className="w-4 h-4 shrink-0 mt-0.5" />
                       <p>{order.notes}</p>
                   </div>
               )}
               {order.is_urgent && (
                   <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-800 flex gap-2 items-center">
                       <AlertTriangle className="w-4 h-4 shrink-0" />
                       <p className="font-medium">Marked as Urgent</p>
                   </div>
               )}
               <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-600 flex gap-2 items-center">
                   <CreditCard className="w-4 h-4 shrink-0 text-slate-400" />
                   <p>Payment: <span className="font-medium capitalize text-slate-900">{order.payment_status || 'Unpaid'}</span></p>
               </div>
          </div>

        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Close Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WaterOrderDetailsModal;