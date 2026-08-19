import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Store, Calendar, ArrowRight, Map as MapIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import MapModal from '@/components/products/MapModal';

const OfferCard = ({ offer }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mapModalOpen, setMapModalOpen] = useState(false);

  const getDiscountText = () => {
    if (offer.discount_type === 'percentage') {
      return `${offer.discount_value}% OFF`;
    } else if (offer.discount_type === 'fixed') {
      return `₹${offer.discount_value} OFF`;
    }
    return 'Special Offer';
  };

  const handleCardClick = () => {
    // Debug logging
    console.log('OfferCard seller_id:', offer.seller_id);
    console.log('Full offer object:', offer);

    // Validation check
    if (!offer.seller_id) {
      console.error('seller_id is undefined or null');
      toast({
        title: 'Navigation Error',
        description: 'Unable to navigate to shop. Seller information is missing.',
        variant: 'destructive',
      });
      return;
    }

    // Additional UUID validation (optional but good practice)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(offer.seller_id)) {
      console.error('Invalid seller_id format:', offer.seller_id);
      toast({
        title: 'Navigation Error',
        description: 'Invalid shop identifier format.',
        variant: 'destructive',
      });
      return;
    }

    // Navigate to digital shop - Route is /shop/:retailerId in App.jsx
    console.log('Navigating to:', `/shop/${offer.seller_id}`);
    navigate(`/shop/${offer.seller_id}`);
  };

  const handleViewOnMap = (e) => {
    e.stopPropagation();
    setMapModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return null;
    }
  };

  // Prepare seller data for MapModal
  const sellerData = {
    latitude: offer.seller_latitude,
    longitude: offer.seller_longitude,
    business_name: offer.seller_name,
    address: offer.seller_address,
    city: offer.seller_city,
    pincode: offer.seller_pincode
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.03, y: -4 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Card 
          className="h-full overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-800 group"
          onClick={handleCardClick}
        >
          {/* Image Section with Badge Overlay */}
          <div className="relative h-48 md:h-52 lg:h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
            {offer.promotional_image_url ? (
              <img 
                src={offer.promotional_image_url} 
                alt={offer.title}
                crossOrigin="anonymous"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                <Store className="w-16 h-16 text-blue-300 dark:text-blue-700" />
              </div>
            )}
            
            {/* Discount Badge Overlay */}
            <div className="absolute top-3 right-3 z-10">
              <Badge 
                className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-white font-bold shadow-lg text-sm md:text-base border-0"
              >
                {getDiscountText()}
              </Badge>
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60"></div>
          </div>

          {/* Content Section */}
          <CardContent className="p-4 md:p-5 flex flex-col gap-3">
            {/* Title */}
            <h3 className="font-bold text-base md:text-lg text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight min-h-[2.5rem] md:min-h-[3rem]" title={offer.title}>
              {offer.title}
            </h3>

            {/* Seller Name */}
            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <Store className="w-4 h-4" />
              <span className="font-medium truncate">{offer.seller_name || 'Shop'}</span>
            </div>

            {/* Prominent Discount Display */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 p-3 rounded-lg border-l-4 border-orange-500">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {offer.discount_type === 'percentage' ? `${offer.discount_value}%` : `₹${offer.discount_value}`}
                </span>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {offer.discount_type === 'percentage' ? 'OFF' : 'DISCOUNT'}
                </span>
              </div>
            </div>

            {/* Valid Until Date */}
            {offer.validity_end && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>Valid till {formatDate(offer.validity_end)}</span>
              </div>
            )}

            {/* Description */}
            {offer.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {offer.description}
              </p>
            )}

            {/* CTA Buttons - Side by Side */}
            <div className="grid grid-cols-2 gap-2 mt-auto">
              <Button 
                variant="outline"
                className="bg-white hover:bg-slate-50 h-9 md:h-10 text-xs md:text-sm"
                onClick={handleViewOnMap}
              >
                <MapIcon className="h-3.5 w-3.5 mr-1.5 md:mr-2" /> 
                <span className="hidden md:inline">View on</span> Map
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md group-hover:shadow-lg transition-all h-9 md:h-10 text-xs md:text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                View Offer
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 md:ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Map Modal */}
      <MapModal 
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        sellerData={sellerData}
      />
    </>
  );
};

export default OfferCard;