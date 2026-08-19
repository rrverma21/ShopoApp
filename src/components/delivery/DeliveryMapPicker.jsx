import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const DeliveryMapPicker = ({ initialLat, initialLng, onLocationSelect }) => {
  // Default to a central location (e.g., India center or Mumbai) if no initial pos
  const defaultPosition = [19.0760, 72.8777]; 
  const [position, setPosition] = useState(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  useEffect(() => {
    if (position) {
      onLocationSelect(position.lat, position.lng);
    }
  }, [position]);

  return (
    <div className="h-[300px] w-full rounded-lg overflow-hidden border border-slate-300 z-0 relative">
      <MapContainer 
        center={initialLat && initialLng ? [initialLat, initialLng] : defaultPosition} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
      
      {!position && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-[1000]">
          <span className="bg-white px-3 py-1 rounded shadow text-sm font-medium">Click on map to select location</span>
        </div>
      )}
    </div>
  );
};

export default DeliveryMapPicker;