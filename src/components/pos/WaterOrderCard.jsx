import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Droplet, Clock, MapPin, Phone, User, ChevronDown, ChevronUp, 
  Check, X as XIcon, Loader2, MessageCircle, Navigation, 
  Package, Truck, Star, Sparkles
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

const TimelineStep = ({ label, active, completed, last, onClick }) => (
  <div className="flex-1 relative flex flex-col items-center group cursor-pointer" onClick={onClick}>
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all duration-300 border-2",
      active ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30" : 
      completed ? "bg-green-500 border-green-500 text-white" : 
      "bg-white border-slate-200 text-slate-400 group-hover:border-blue-300"
    )}>
      {completed ? <Check className="w-4 h-4" /> : (active ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> : null)}
    </div>
    <span className={cn(
      "text-[10px] mt-2 font-medium transition-colors duration-200",
      active ? "text-blue-700 font-bold" : completed ? "text-green-600" : "text-slate-400"
    )}>{label}</span>
    
    {!last && (
      <div className="absolute top-4 left-1/2 w-full h-[2px] -z-0">
        <div className={cn(
          "h-full transition-all duration-500",
          completed ? "bg-green-500" : "bg-slate-100"
        )} />
      </div>
    )}
  </div>
);

const WaterOrderCard = React.memo(({ 
  order, 
  onUpdateStatus, 
  onAssignAgent, 
  onViewDetails,
  isUpdating = false 
}) => {
  const [expanded, setExpanded] = useState(false);

  // Status Logic
  const status = (order.status || 'pending').toLowerCase();
  
  const getStatusStep = (s) => {
    switch(s) {
      case 'pending': return 0;
      case 'confirmed': 
      case 'accepted': 
      case 'processing': return 1;
      case 'out_for_delivery': 
      case 'packed': return 2;
      case 'delivered': 
      case 'completed': return 3;
      default: return 0;
    }
  };

  const currentStep = getStatusStep(status);
  const isCancelled = ['cancelled', 'rejected'].includes(status);
  const isDelivered = ['delivered', 'completed'].includes(status);

  // Quick Actions
  const handleCall = () => window.location.href = `tel:${order.customer_phone}`;
  const handleWhatsApp = () => {
    const msg = `Hi ${order.customer_name}, regarding your water order #${order.id.slice(0,6)}...`;
    window.open(`https://wa.me/${order.customer_phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  const handleMap = () => {
    const query = order.customer_address ? encodeURIComponent(order.customer_address) : '';
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const getStatusColor = (s) => {
    if (['pending'].includes(s)) return 'bg-yellow-500';
    if (['confirmed', 'accepted'].includes(s)) return 'bg-blue-500';
    if (['out_for_delivery'].includes(s)) return 'bg-orange-500';
    if (['delivered', 'completed'].includes(s)) return 'bg-green-500';
    if (['cancelled'].includes(s)) return 'bg-red-500';
    return 'bg-slate-500';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-2xl overflow-hidden transition-all duration-300",
        "bg-white/80 backdrop-blur-sm border",
        status === 'pending' ? "border-blue-200/60 shadow-lg shadow-blue-500/5" : "border-slate-200/60 shadow-sm",
        "hover:shadow-xl hover:border-blue-300/50 hover:bg-white",
        isUpdating && "opacity-70 pointer-events-none"
      )}
    >
      {/* Loading Overlay */}
      {isUpdating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Top Bar Indicator */}
      <div className={cn("h-1.5 w-full", getStatusColor(status))} />

      <CardContent className="p-0">
        {/* Header Section */}
        <div className="p-5 flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                #{order.id.slice(0, 6)}
              </span>
              <Badge variant="outline" className={cn(
                "capitalize border-0 font-medium px-2 py-0.5 h-6",
                status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                status === 'confirmed' ? "bg-blue-100 text-blue-700" :
                status === 'out_for_delivery' ? "bg-orange-100 text-orange-700" :
                status === 'delivered' ? "bg-green-100 text-green-700" :
                "bg-slate-100 text-slate-700"
              )}>
                {status.replace(/_/g, ' ')}
              </Badge>
              {order.is_urgent && (
                <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-sm animate-pulse px-2 py-0.5 h-6 gap-1">
                  <Sparkles className="w-3 h-3" /> Urgent
                </Badge>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 leading-tight truncate">
              {order.water_products?.name || 'Water Can'}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
               <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                 <Package className="w-3.5 h-3.5" /> Qty: <strong className="text-slate-800">{order.quantity}</strong>
               </span>
               <span className="flex items-center gap-1">
                 <Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
               </span>
            </div>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end">
            <div className="text-xl font-bold text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-600">
              ₹{order.total_price}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-1">
              {order.payment_method || 'COD'}
            </div>
          </div>
        </div>

        {/* Customer & Location Block */}
        <div className="px-5 py-4 bg-slate-50/50 border-y border-slate-100/50 space-y-4">
          <div className="flex items-start gap-3">
             <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">
                <User className="w-4 h-4" />
             </div>
             <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                   <p className="font-semibold text-slate-800 truncate">{order.customer_name || 'Guest Customer'}</p>
                   <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-blue-600 hover:bg-blue-100" onClick={handleCall} title="Call">
                         <Phone className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-green-600 hover:bg-green-100" onClick={handleWhatsApp} title="WhatsApp">
                         <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                   </div>
                </div>
                <p className="text-xs text-slate-500">{order.customer_phone}</p>
             </div>
          </div>

          <div className="flex items-start gap-3">
             <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200 shadow-sm">
                <MapPin className="w-4 h-4" />
             </div>
             <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                   <p className="text-sm text-slate-700 leading-relaxed line-clamp-2" title={order.customer_address}>
                      {order.customer_address || 'No address provided'}
                   </p>
                   <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-orange-600 hover:bg-orange-100 shrink-0 ml-1" onClick={handleMap} title="Get Directions">
                      <Navigation className="w-3.5 h-3.5" />
                   </Button>
                </div>
                {order.water_delivery_areas?.name && (
                   <span className="inline-flex mt-1 text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                     {order.water_delivery_areas.name}
                   </span>
                )}
             </div>
          </div>
        </div>

        {/* Timeline (Visible only if not cancelled) */}
        {!isCancelled && (
           <div className="px-6 py-5">
              <div className="flex items-center justify-between gap-2">
                 <TimelineStep 
                   label="Ordered" 
                   active={currentStep === 0} 
                   completed={currentStep > 0} 
                   onClick={() => currentStep > 0 && onUpdateStatus(order.id, 'pending')}
                 />
                 <TimelineStep 
                   label="Confirmed" 
                   active={currentStep === 1} 
                   completed={currentStep > 1} 
                   onClick={() => onUpdateStatus(order.id, 'confirmed')}
                 />
                 <TimelineStep 
                   label="Out" 
                   active={currentStep === 2} 
                   completed={currentStep > 2} 
                   onClick={() => onUpdateStatus(order.id, 'out_for_delivery')}
                 />
                 <TimelineStep 
                   label="Delivered" 
                   active={currentStep === 3} 
                   completed={currentStep > 3} 
                   last 
                   onClick={() => onUpdateStatus(order.id, 'delivered')}
                 />
              </div>
           </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/60 grid grid-cols-2 gap-2">
           {!isDelivered && !isCancelled && (
             <>
               {status === 'pending' && (
                 <Button 
                   className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                   onClick={() => onUpdateStatus(order.id, 'confirmed')}
                 >
                   Accept Order
                 </Button>
               )}
               {status === 'confirmed' && (
                 <Button 
                   className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200"
                   onClick={() => onUpdateStatus(order.id, 'out_for_delivery')}
                 >
                   <Truck className="w-4 h-4 mr-2" /> Dispatch
                 </Button>
               )}
               {status === 'out_for_delivery' && (
                 <Button 
                   className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200"
                   onClick={() => onUpdateStatus(order.id, 'delivered')}
                 >
                   Mark Delivered
                 </Button>
               )}
               
               <Button variant="outline" className="w-full bg-white hover:bg-slate-50" onClick={() => onViewDetails(order)}>
                  Details
               </Button>
             </>
           )}

           {(isDelivered || isCancelled) && (
              <Button variant="outline" className="col-span-2 w-full bg-white hover:bg-slate-50" onClick={() => onViewDetails(order)}>
                View Order Details
              </Button>
           )}
        </div>
      </CardContent>
    </motion.div>
  );
});

WaterOrderCard.displayName = "WaterOrderCard";

export default WaterOrderCard;