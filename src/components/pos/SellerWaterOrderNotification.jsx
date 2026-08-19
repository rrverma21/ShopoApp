import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Phone, Droplet, User, Check, X, Loader2, RefreshCw } from "lucide-react";
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/components/ui/use-toast";

const SellerWaterOrderNotification = ({ notification, onUpdate }) => {
  const order = notification;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!order) return null;

  const handleAction = async (action) => {
    try {
      setLoading(true);
      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      
      const { error } = await supabase
        .from('water_orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: action === 'accept' ? "Order Accepted" : "Order Rejected",
        description: `Order ${order.id.slice(0,6)} has been ${newStatus}.`,
        variant: action === 'accept' ? "default" : "destructive",
      });
      
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} order. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow border-slate-200 overflow-hidden mb-4 animate-in slide-in-from-top-2 duration-300">
      <div className={`h-1.5 w-full ${order.is_urgent ? 'bg-orange-500' : 'bg-blue-500'}`} />
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Badge variant="outline" className="text-xs font-normal bg-slate-50">#{order.id.slice(0,6)}</Badge>
               {order.is_urgent && (
                 <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                   <Clock className="w-3 h-3" /> Urgent
                 </Badge>
               )}
            </div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blue-500" />
              {order.quantity} x {order.water_products?.name || 'Water Product'}
            </h3>
          </div>
          <div className="text-right">
             <div className="text-xl font-bold text-slate-900">₹{order.total_price}</div>
             <div className="text-xs text-slate-500">
                {order.created_at ? format(new Date(order.created_at), 'h:mm a') : 'Just now'}
             </div>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
           <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-800">{order.customer_name}</span>
           </div>
           <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{order.customer_phone}</span>
           </div>
           <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
              <span className="break-words line-clamp-2">{order.customer_address}</span>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
           <Button 
             variant="outline" 
             className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" 
             onClick={() => handleAction('reject')} 
             disabled={loading}
           >
              <X className="w-4 h-4 mr-2" />
              Reject
           </Button>
           <Button 
             className="bg-green-600 hover:bg-green-700 text-white" 
             onClick={() => handleAction('accept')} 
             disabled={loading}
           >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Accept
                </>
              )}
           </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SellerWaterOrderNotification;