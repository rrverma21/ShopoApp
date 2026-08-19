import React, { useState, useEffect } from 'react';
import { Tag, Clock, Package, IndianRupee, Store, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function OfferCard({ offer }) {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!offer?.end_date) return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(offer.end_date);
      const start = offer.start_date ? new Date(offer.start_date) : new Date();

      if (isBefore(now, start)) {
        setTimeLeft(`Starts in ${formatDistanceToNow(start)}`);
        setIsActive(false);
      } else if (isAfter(now, end)) {
        setTimeLeft('Expired');
        setIsActive(false);
      } else {
        setTimeLeft(`Ends in ${formatDistanceToNow(end)}`);
        setIsActive(true);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 60000); // update every minute
    return () => clearInterval(intervalId);
  }, [offer]);

  const handleAction = () => {
    toast({
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  if (!offer) return null;

  const originalPrice = parseFloat(offer.original_price) || 0;
  const discountPrice = parseFloat(offer.discount_price) || 0;
  const discountPercent = offer.discount_percentage ? parseFloat(offer.discount_percentage).toFixed(0) : null;
  const hasImages = offer.images && offer.images.length > 0;
  
  // Safe extraction of profile data depending on how it's joined
  const businessName = offer.profiles?.business_name || offer.profiles?.contact_person || 'ShopoApp User';
  const avatarUrl = offer.profiles?.avatar_url || '';

  return (
    <div className={`shopo-card shopo-card-hover flex flex-col h-full relative ${!isActive ? 'opacity-70 grayscale-[20%]' : ''}`}>
      {/* Discount Badge */}
      {discountPercent && (
        <div className="absolute -top-3 -right-3 z-10 bg-[hsl(var(--highlight-brand))] text-white font-bold px-3 py-1.5 rounded-full shadow-lg transform rotate-3 flex items-center gap-1 border-2 border-white dark:border-slate-950">
          <Tag className="w-3.5 h-3.5 fill-current" />
          {discountPercent}% OFF
        </div>
      )}

      {/* Image Section */}
      <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {hasImages ? (
          <img 
            src={offer.images[0]} 
            alt={offer.product_name} 
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-sm font-medium">No Image</span>
          </div>
        )}
        
        {/* Top-left category badge */}
        <Badge variant="secondary" className="absolute top-2 left-2 bg-black/60 hover:bg-black/70 text-white backdrop-blur-sm border-none shadow-sm">
          {offer.category}
        </Badge>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col">
        
        <h3 className="font-bold text-lg leading-tight mb-1 text-foreground line-clamp-2">
          {offer.product_name}
        </h3>
        
        {offer.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {offer.description}
          </p>
        )}

        <div className="mt-auto pt-3 flex flex-col gap-3 border-t border-border/50">
          
          {/* Pricing Row */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5 font-medium">Offer Price</div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold offer-highlight-text flex items-center">
                  <IndianRupee className="w-5 h-5 mr-0.5" />
                  {discountPrice.toFixed(2)}
                </span>
                <span className="offer-strike-price flex items-center">
                  <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                  {originalPrice.toFixed(2)}
                </span>
              </div>
            </div>
            
            {offer.quantity && (
              <Badge variant="outline" className="flex items-center gap-1 font-mono bg-slate-50 dark:bg-slate-900">
                <Package className="w-3 h-3" /> {offer.quantity} left
              </Badge>
            )}
          </div>

          {/* Footer Info Row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2 max-w-[50%]">
              <Avatar className="w-6 h-6 border shadow-sm">
                <AvatarImage src={avatarUrl} alt={businessName} />
                <AvatarFallback className="text-[10px]"><Store className="w-3 h-3" /></AvatarFallback>
              </Avatar>
              <span className="font-medium truncate text-foreground">{businessName}</span>
            </div>
            
            <div className={`flex items-center gap-1 font-medium ${isActive ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`}>
              <Clock className="w-3.5 h-3.5" />
              {timeLeft}
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Overlay action on hover */}
      <div className="absolute inset-0 bg-background/0 hover:bg-background/40 opacity-0 hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
        <Button onClick={handleAction} className="shadow-lg transform -translate-y-4 hover:translate-y-0 transition-transform">
          Claim Offer
        </Button>
      </div>
    </div>
  );
}