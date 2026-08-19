import React from 'react';
import { Store, MapPin, Phone, Mail, Globe, Package, IndianRupee, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function BusinessListingCard({ listing }) {
  const { toast } = useToast();

  const handleAction = () => {
    toast({
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  if (!listing) return null;

  const hasImages = listing.product_images && listing.product_images.length > 0;
  const logoUrl = listing.business_logo_url;
  const bulkPricing = listing.bulk_pricing || [];

  return (
    <div className="shopo-card shopo-card-hover flex flex-col h-full relative">
      <div className="p-4 border-b border-border/50 flex items-start gap-3 bg-slate-50 dark:bg-slate-900/50">
        <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-800 border flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={listing.business_name} className="w-full h-full object-cover" />
          ) : (
            <Store className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base leading-tight truncate text-foreground">
            {listing.business_name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-[10px] py-0 h-4">
              {listing.business_category}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(listing.created_at))} ago
            </span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {hasImages ? (
          <img 
            src={listing.product_images[0]} 
            alt={listing.product_name} 
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-medium">No Product Image</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <h4 className="font-semibold text-sm text-foreground line-clamp-1">{listing.product_name}</h4>
          {listing.product_description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {listing.product_description}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Price</div>
            <div className="flex items-center text-lg font-bold text-primary">
              <IndianRupee className="w-4 h-4 mr-0.5" />
              {parseFloat(listing.product_price).toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">MOQ</div>
            <Badge variant="outline" className="font-mono bg-slate-50 dark:bg-slate-900 text-xs">
              <Package className="w-3 h-3 mr-1" /> {listing.minimum_order_quantity}
            </Badge>
          </div>
        </div>

        {bulkPricing.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 mt-2 border border-border/50">
            <div className="text-[10px] font-semibold text-muted-foreground mb-1">BULK PRICING</div>
            <div className="grid grid-cols-2 gap-1">
              {bulkPricing.slice(0, 2).map((tier, idx) => (
                <div key={idx} className="text-[10px] flex justify-between bg-white dark:bg-slate-800 p-1 rounded border shadow-sm">
                  <span>{tier.qty}+ units</span>
                  <span className="font-semibold">₹{tier.price}</span>
                </div>
              ))}
              {bulkPricing.length > 2 && (
                <div className="text-[10px] text-center text-muted-foreground pt-1 col-span-2">
                  +{bulkPricing.length - 2} more tiers
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground truncate">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{listing.business_location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground truncate">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{listing.phone_number}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground truncate">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{listing.email_address}</span>
          </div>
          {listing.website_url && (
            <div className="flex items-center gap-1.5 text-blue-500 hover:underline truncate cursor-pointer" onClick={handleAction}>
              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Website</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute inset-0 bg-background/0 hover:bg-background/40 opacity-0 hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
        <Button onClick={handleAction} className="shadow-lg transform -translate-y-4 hover:translate-y-0 transition-transform">
          Contact Supplier
        </Button>
      </div>
    </div>
  );
}