import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// MapInitializer component that handles map initialization and invalidateSize
const MapInitializer = () => {
  const map = useMap();

  useEffect(() => {
    // Handler for map load event
    const handleLoad = () => {
      try {
        // Only call invalidateSize after map is fully loaded
        map.invalidateSize();
        console.log('Map invalidateSize called successfully');
      } catch (error) {
        console.error('Error calling invalidateSize:', error);
      }
    };

    // Handler for when map container is resized
    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch (error) {
        console.error('Error calling invalidateSize on resize:', error);
      }
    };

    // Listen for load event
    map.on('load', handleLoad);
    
    // Also listen for window resize events
    window.addEventListener('resize', handleResize);

    // Trigger initial resize after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (error) {
        console.error('Error calling invalidateSize on initial render:', error);
      }
    }, 250);

    // Cleanup function
    return () => {
      map.off('load', handleLoad);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [map]);

  return null;
};

// Main MapContent component
const MapContent = ({ location }) => {
  const { latitude, longitude, business_name, address, city, pincode } = location;

  // Check if coordinates are available
  const hasCoordinates = latitude && longitude;
  const coords = hasCoordinates ? [parseFloat(latitude), parseFloat(longitude)] : null;

  if (!hasCoordinates) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-slate-100 rounded-lg">
        <div className="text-center p-6">
          <div className="text-4xl mb-3">📍</div>
          <p className="text-lg font-semibold text-slate-700 mb-2">Map location unavailable</p>
          <p className="text-sm text-slate-500">
            {address && <>{address}<br /></>}
            {city}{pincode && `, ${pincode}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] md:h-[500px] w-full rounded-lg overflow-hidden bg-slate-100">
      <MapContainer 
        center={coords} 
        zoom={15} 
        style={{ height: "100%", width: "100%" }}
        key={`${latitude}-${longitude}`}
        whenReady={(map) => {
          console.log('Map ready event fired');
        }}
      >
        {/* Map initialization handler */}
        <MapInitializer />
        
        {/* OpenStreetMap tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Marker with location info */}
        <Marker position={coords}>
          <Popup>
            <div className="p-2">
              <div className="font-bold text-base mb-1">{business_name}</div>
              <div className="text-sm text-slate-600">
                {address && <div>{address}</div>}
                <div>{city}{pincode && `, ${pincode}`}</div>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapContent;