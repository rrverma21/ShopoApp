import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, X } from 'lucide-react';
import MapContent from '@/components/MapContent';

const MapModal = ({ open, onClose, sellerData }) => {
  if (!sellerData) return null;

  const { latitude, longitude, business_name, address, city, pincode } = sellerData;
  
  // Check if coordinates are available for the "Get Directions" button
  const hasCoordinates = latitude && longitude;

  const handleGetDirections = () => {
    const destination = hasCoordinates 
      ? `${latitude},${longitude}` 
      : `${address}, ${city}, ${pincode}`;
    
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-[95%] rounded-xl p-4 md:p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg md:text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {business_name}
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            {address && `${address}, `}{city}{pincode && ` - ${pincode}`}
          </DialogDescription>
        </DialogHeader>
        
        {/* Map Content Component */}
        <MapContent 
          location={{
            latitude,
            longitude,
            business_name,
            address,
            city,
            pincode
          }} 
        />

        <DialogFooter className="flex-col-reverse sm:justify-between sm:flex-row gap-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button 
              onClick={handleGetDirections} 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Navigation className="w-4 h-4 mr-2" /> 
              Get Directions
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MapModal;