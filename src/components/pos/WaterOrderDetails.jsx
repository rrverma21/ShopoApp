import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Phone, MapPin, Package, Clock, Calendar, CheckCircle, Truck, X, Droplet, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const WaterOrderDetails = React.memo(({ isOpen, onClose, order, onStatusUpdate, isUpdating = false }) => {
  if (!order) return null;

  const getStatusBadge = (status) => {
     const s = (status || 'pending').toLowerCase();
     switch(s) {
       case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
       case 'accepted': 
       case 'confirmed': return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Confirmed</Badge>;
       case 'delivered': 
       case 'completed': return <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">Delivered</Badge>;
       case 'cancelled': 
       case 'rejected': return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
       default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
     }
  };

  const isPending = (order.status || '').toLowerCase() === 'pending';
  const isConfirmed = ['accepted', 'confirmed'].includes((order.status || '').toLowerCase());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isUpdating && onClose(open)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white rounded-xl shadow-xl">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
           <DialogHeader>
             <div className="flex justify-between items-start mb-3">
                <Badge variant="outline" className="bg-white/80 backdrop-blur text-slate-500 font-mono tracking-wide">
                    ID: {order.id.slice(0, 8)}
                </Badge>
                {getStatusBadge(order.status)}
             </div>
             <DialogTitle className="text-xl font-bold text-slate-900">Order Details</DialogTitle>
             <DialogDescription className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                {order.created_at ? format(new Date(order.created_at), 'PPP p') : 'Date unavailable'}
             </DialogDescription>
           </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
            {/* Urgency Alert */}
            {order.is_urgent && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-start gap-3 text-orange-800 animate-in fade-in slide-in-from-top-2">
                    <Clock className="w-5 h-5 shrink-0 mt-0.5 text-orange-600" />
                    <div>
                        <p className="font-semibold text-sm">Urgent Delivery Requested</p>
                        <p className="text-xs opacity-90 mt-0.5">Priority handling required (+₹{order.urgency_charge})</p>
                    </div>
                </div>
            )}

            {/* Customer Section */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Information</h4>
                <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <User className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 text-sm">{order.customer_name || 'N/A'}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                                <Phone className="h-3 w-3" /> {order.customer_phone || 'N/A'}
                            </p>
                        </div>
                    </div>
                    
                    <Separator className="bg-slate-200/60" />

                    <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 mb-0.5">Delivery Address</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{order.customer_address || 'No address provided'}</p>
                            {order.water_delivery_areas?.name && (
                                <Badge variant="secondary" className="mt-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-normal">
                                    Area: {order.water_delivery_areas.name}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Items Section */}
            <div className="space-y-3">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items Ordered</h4>
                 <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="flex items-center gap-4 p-4">
                        <div className="h-12 w-12 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0 border border-cyan-100">
                            <Droplet className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{order.water_products?.name || 'Water Product'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Qty: <span className="font-medium text-slate-700">{order.quantity}</span></p>
                        </div>
                        <div className="text-right shrink-0">
                             <p className="font-bold text-slate-900">₹{order.total_price}</p>
                        </div>
                    </div>
                 </div>
            </div>
            
            {/* Payment Summary */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-2.5 border border-slate-100">
                <div className="flex justify-between text-xs text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{order.total_price - (order.is_urgent ? Number(order.urgency_charge || 0) : 0)}</span>
                </div>
                {order.is_urgent && (
                     <div className="flex justify-between text-xs text-orange-600">
                        <span>Urgency Charge</span>
                        <span>+₹{order.urgency_charge}</span>
                    </div>
                )}
                <Separator className="bg-slate-200" />
                <div className="flex justify-between font-bold text-base text-slate-900 pt-1">
                    <span>Total Amount</span>
                    <span>₹{order.total_price}</span>
                </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-2">
                {isPending && (
                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                        onClick={() => onStatusUpdate(order.id, 'confirmed')}
                        disabled={isUpdating}
                    >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" /> Accept Order</>}
                    </Button>
                )}
                
                {isConfirmed && (
                    <Button 
                        className="w-full bg-green-600 hover:bg-green-700 gap-2"
                        onClick={() => onStatusUpdate(order.id, 'delivered')}
                        disabled={isUpdating}
                    >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Truck className="h-4 w-4" /> Mark Delivered</>}
                    </Button>
                )}
                
                {(isPending || isConfirmed) && (
                    <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => onStatusUpdate(order.id, 'cancelled')}
                        disabled={isUpdating}
                    >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel'}
                    </Button>
                )}
            </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-xl">
             <Button variant="outline" onClick={() => onClose(false)} className="min-w-[100px]" disabled={isUpdating}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

WaterOrderDetails.displayName = "WaterOrderDetails";

export default WaterOrderDetails;