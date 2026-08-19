import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, Phone, MapPin, Package, Clock, CheckCircle, XCircle, Truck, X, Droplet } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const WaterOrderDetail = React.memo(({ order, onStatusUpdate, onClose, currentUserId }) => {
  if (!order) return null;

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'confirmed': return <Badge variant="default" className="bg-blue-100 text-blue-700">Confirmed</Badge>;
      case 'delivered': return <Badge variant="success" className="bg-green-100 text-green-700">Delivered</Badge>;
      case 'cancelled': return <Badge variant="destructive" className="bg-red-100 text-red-700">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="h-full border-2 border-blue-100 shadow-md relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute right-2 top-2 h-8 w-8 text-slate-400 hover:text-slate-600" 
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-2 bg-slate-50 border-b">
        <div className="flex justify-between items-start pr-6">
            <div>
                <CardTitle className="text-lg text-slate-800">Order Details</CardTitle>
                <p className="text-xs text-slate-500 font-mono mt-1">ID: {order.id.slice(0, 8)}...</p>
            </div>
            {getStatusBadge(order.status)}
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6 overflow-y-auto max-h-[calc(100vh-250px)]">
        {/* Customer Info */}
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" /> Customer Information
            </h4>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500">Name:</span>
                    <span className="font-medium text-slate-900">{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone:</span>
                    <span className="font-medium text-slate-900">{order.customer_phone}</span>
                </div>
            </div>
        </div>

        {/* Delivery Info */}
        <div className="space-y-3">
             <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-500" /> Delivery Location
            </h4>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                <p className="text-slate-700 leading-relaxed">{order.customer_address}</p>
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Area:</span>
                    <Badge variant="outline" className="text-xs font-normal bg-white">{order.water_delivery_areas?.name}</Badge>
                </div>
            </div>
        </div>

        {/* Order Items */}
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" /> Order Items
            </h4>
            <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-white">
                    {order.water_products?.image_url ? (
                        <img src={order.water_products.image_url} alt="Product" className="h-12 w-12 rounded object-cover border" />
                    ) : (
                        <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                            <Droplet className="h-6 w-6" />
                        </div>
                    )}
                    <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900">{order.water_products?.name || 'Water Can'}</p>
                        <p className="text-xs text-slate-500">Qty: {order.quantity}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-sm text-slate-900">₹{order.total_price}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Timeline / Metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-400 justify-end">
            <Clock className="h-3 w-3" />
            <span>Ordered: {new Date(order.created_at).toLocaleString()}</span>
        </div>

        <Separator />

        {/* Actions */}
        <div className="grid grid-cols-1 gap-3">
            {order.status === 'pending' && (
                <>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                                <CheckCircle className="h-4 w-4" /> Accept Order
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Accept Order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will mark the order as confirmed and notify the customer that you are processing it.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onStatusUpdate(order.id, 'confirmed')}>
                                    Accept
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full gap-2">
                                <XCircle className="h-4 w-4" /> Reject Order
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reject Order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to reject this order? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onStatusUpdate(order.id, 'cancelled')} className="bg-red-600 hover:bg-red-700">
                                    Reject
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}

            {order.status === 'confirmed' && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="w-full bg-green-600 hover:bg-green-700 gap-2">
                            <Truck className="h-4 w-4" /> Mark as Delivered
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Complete Delivery?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Confirm that the water cans have been delivered to the customer and payment has been collected (if applicable).
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onStatusUpdate(order.id, 'delivered')}>
                                Confirm Delivery
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {['delivered', 'cancelled'].includes(order.status) && (
                <div className="text-center p-2 bg-slate-50 rounded text-sm text-slate-500 italic">
                    Order is {order.status}. No further actions available.
                </div>
            )}
        </div>

      </CardContent>
    </Card>
  );
});

WaterOrderDetail.displayName = "WaterOrderDetail";

export default WaterOrderDetail;