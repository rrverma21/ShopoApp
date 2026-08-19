import React, { useState, useEffect, useRef } from 'react';
import OffersSection from '@/components/OffersSection';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { 
  MapPin, Search, Navigation, Store, ArrowRight, X, Star, 
  Clock, ShoppingBag, PackageSearch, Loader2, Sparkles, Building2, 
  Scissors, Map as MapIcon, Globe, ChevronLeft, ChevronRight, 
  ShieldCheck, Zap, HeartHandshake 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { calculateShopStatus } from '@/utils/shopStatusCalculator';

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

const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { duration: 1.5 });
            setTimeout(() => map.invalidateSize(), 250);
        }
    }, [center, map]);
    return null;
};

const getShopTypeLabel = (shop) => {
  const type = shop.pos_retailer_settings?.shop_type;
  if (type === 'wholesale') return { label: 'Wholesale', icon: Building2 };
  if (type === 'both') return { label: 'Retail & Wholesale', icon: Store };
  if (type === 'retail') return { label: 'Retail Shop', icon: ShoppingBag };
  if (type === 'service') return { label: 'Service Provider', icon: Scissors };
  if (shop.role === 'retailer') return { label: 'Retail Shop', icon: ShoppingBag };
  if (shop.role === 'seller') return { label: 'Wholesale', icon: Building2 };
  return { label: 'Local Business', icon: Store };
};

const AnimatedCounter = ({ value, label }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      <span className="text-4xl font-bold text-blue-600 mb-2">{count.toLocaleString()}+</span>
      <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
};

const PremiumShopCard = ({ shop, handleOpenMap, navigate }) => {
  const [status] = useState(() => calculateShopStatus(shop.pos_retailer_settings));
  const rating = shop.average_rating || 0;
  const shopTypeInfo = getShopTypeLabel(shop);
  
  return (
    <motion.div whileHover={{ y: -8 }} className="h-full">
      <Card className="h-full flex flex-col overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-900 group">
        <div className="relative h-48 overflow-hidden">
          <img 
            src={shop.pos_retailer_settings?.storefront_image_url || 'https://images.unsplash.com/photo-1704030458983-c7c4c820eb8b'} 
            alt={shop.business_name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute top-4 left-4">
             <Badge className="bg-white/90 text-slate-900 backdrop-blur-sm border-0 font-semibold">
               <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 mr-1" /> {rating > 0 ? rating : 'New'}
             </Badge>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-white bg-white overflow-hidden shrink-0 shadow-md">
              {shop.avatar_url ? (
                <img src={shop.avatar_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-xl">
                  {shop.business_name?.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg truncate drop-shadow-md">{shop.business_name}</h3>
              <p className="text-blue-100 text-xs truncate flex items-center gap-1">
                <shopTypeInfo.icon className="w-3 h-3" /> {shopTypeInfo.label}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="p-5 flex flex-col flex-grow">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className={`${status.color} border-0 bg-opacity-10 font-medium`}>
               <Clock className="w-3 h-3 mr-1" /> {status.displayText}
            </Badge>
            {shop.is_featured && <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0"><Sparkles className="w-3 h-3 mr-1"/> Featured</Badge>}
          </div>
          <div className="space-y-2 mb-6">
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{shop.street_address}, {shop.city}</span>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-3">
             <Button variant="outline" onClick={() => handleOpenMap(shop)} className="w-full rounded-xl border-slate-200 hover:bg-slate-50">
               <MapIcon className="w-4 h-4 mr-2" /> Map
             </Button>
             <Button onClick={() => navigate(`/shop/${shop.id}`)} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20">
               Visit Shop <ArrowRight className="w-4 h-4 ml-2" />
             </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const LocalShopsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState('shops');
  const [shopSearchQuery, setShopSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  
  const searchContainerRef = useRef(null);
  const [filters, setFilters] = useState({ country: '', pincode: '', city: '', sector: '' });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [shopCoordinates, setShopCoordinates] = useState({});
  const [selectedShop, setSelectedShop] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const detectLocationOnLoad = () => {
      if (!navigator.geolocation) {
        if (isMounted) {
          setFilters(prev => ({ ...prev, city: 'Delhi', country: 'India' }));
          toast({ 
            title: "Geolocation Not Supported", 
            description: "Defaulting to Delhi. Please enter your location manually.", 
            variant: "destructive" 
          });
        }
        return;
      }

      setIsDetectingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (!response.ok) throw new Error('Geocoding response was not ok');
            
            const data = await response.json();
            if (isMounted && data?.address) {
              const detectedCity = data.address.city || data.address.town || data.address.county || data.address.state_district || '';
              const detectedCountry = data.address.country || '';
              const detectedPostcode = data.address.postcode || '';

              setFilters(prev => ({ 
                ...prev, 
                country: detectedCountry || prev.country,
                city: detectedCity || prev.city,
                pincode: detectedPostcode || prev.pincode
              }));
              
              toast({ 
                title: "Location Detected", 
                description: `Auto-filled your current location: ${detectedCity}` 
              });
            }
          } catch (error) {
            console.error("Auto-detect error:", error);
            if (isMounted) {
              setFilters(prev => ({ ...prev, city: 'Delhi', country: 'India' }));
              toast({ 
                title: "Location Error", 
                description: "Could not auto-detect location. Defaulting to Delhi.", 
                variant: "destructive" 
              });
            }
          } finally {
            if (isMounted) setIsDetectingLocation(false);
          }
        },
        (error) => { 
          if (isMounted) {
            setIsDetectingLocation(false);
            // Fallback to a sensible default if denied or failed
            setFilters(prev => ({ ...prev, city: 'Delhi', country: 'India' }));
            
            if (error.code === error.PERMISSION_DENIED) {
              toast({ 
                title: "Location Access Denied", 
                description: "Defaulting to Delhi. Please enter your location manually." 
              });
            } else {
              toast({ 
                title: "Location Error", 
                description: "Failed to detect location. Defaulting to Delhi." 
              });
            }
          }
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    };

    detectLocationOnLoad();
    return () => { isMounted = false; };
  }, [toast]);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async (retailerIds = null) => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`id, business_name, contact_person, street_address, city, pincode, avatar_url, phone, is_featured, role, latitude, longitude, average_rating, total_reviews, order_mode, country, pos_retailer_settings (shop_type, shop_category, description, opening_time, closing_time, working_days, storefront_image_url, search_keywords, country)`)
        .in('role', ['seller', 'retailer', 'admin'])
        .or('is_disabled.eq.false,is_disabled.is.null');

      if (retailerIds) query = query.in('id', retailerIds);
      
      const { data, error } = await query;
      if (error) throw error;
      
      setShops(data || []);
      if (data && data.length > 0) geocodeShops(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load shops.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const geocodeShops = async (shopsList) => {
    const shopsToGeocode = shopsList.filter(s => s.street_address && (s.city || s.pincode) && (!s.latitude || !s.longitude)).slice(0, 15);
    const newCoords = {};
    for (const shop of shopsToGeocode) {
      if (shopCoordinates[shop.id]) continue;
      try {
        const query = `${shop.street_address}, ${shop.city}, ${shop.pincode}`;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          newCoords[shop.id] = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        await new Promise(r => setTimeout(r, 1100));
      } catch (e) {
        console.warn("Geocoding failed for", shop.business_name);
      }
    }
    if (Object.keys(newCoords).length > 0) {
      setShopCoordinates(prev => ({ ...prev, ...newCoords }));
    }
  };

  const handleItemSearch = async (overrideQuery = null, isService = false) => {
    const queryTerm = overrideQuery !== null ? overrideQuery : (isService ? serviceSearchQuery : productSearchQuery);
    if (!queryTerm.trim()) {
      fetchShops();
      return;
    }
    setIsSearchingProducts(true);
    try {
      let query = supabase.from('point_of_sale_products').select('user_id, name, is_visible_online').or(`name.ilike.%${queryTerm}%,category.ilike.%${queryTerm}%,description.ilike.%${queryTerm}%`).eq('archived', false);
      if (isService) query = query.eq('is_service', true);
      else query = query.gt('stock_level', 0);

      let { data: products, error } = await query;
      if (error) throw error;

      if (!products || products.length === 0) {
        setShops([]);
        toast({ title: "No results found", description: `No matches found for "${queryTerm}".` });
      } else {
        const retailerIds = [...new Set(products.map(p => p.user_id))];
        await fetchShops(retailerIds);
      }
    } catch (error) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearchingProducts(false);
    }
  };

  const clearFilters = () => {
    setFilters({ country: '', pincode: '', city: '', sector: '' });
    setShopSearchQuery(''); setProductSearchQuery(''); setServiceSearchQuery('');
    if (searchMode !== 'shops') setSearchMode('shops'); else fetchShops();
  };

  const handleOpenMap = (shop) => {
    if (shop.latitude && shop.longitude) {
      setSelectedShop({ ...shop, coords: { lat: shop.latitude, lng: shop.longitude } });
      return;
    }
    const coords = shopCoordinates[shop.id];
    if (coords) setSelectedShop({ ...shop, coords });
    else {
      toast({ title: "Location not available", description: "Try getting directions instead.", variant: "destructive" });
      setSelectedShop({ ...shop, coords: null });
    }
  };

  const handleGetDirections = (shop, coords = null) => {
    const destination = coords ? `${coords.lat},${coords.lng}` : `${shop.street_address}, ${shop.city}, ${shop.pincode}, ${shop.country || ''}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, '_blank');
  };

  const filteredShops = shops.filter(shop => {
    let matchesShopQuery = true;
    if (searchMode === 'shops' && shopSearchQuery) {
      const query = shopSearchQuery.toLowerCase();
      const settings = shop.pos_retailer_settings || {};
      matchesShopQuery = shop.business_name?.toLowerCase().includes(query) || settings.shop_category?.toLowerCase().includes(query) || settings.description?.toLowerCase().includes(query);
    }
    const matchesCountry = !filters.country || shop.country?.toLowerCase().includes(filters.country.toLowerCase()) || shop.pos_retailer_settings?.country?.toLowerCase().includes(filters.country.toLowerCase());
    const matchesPincode = !filters.pincode || shop.pincode?.includes(filters.pincode);
    const matchesCity = !filters.city || shop.city?.toLowerCase().includes(filters.city.toLowerCase());
    return matchesShopQuery && matchesCountry && matchesPincode && matchesCity;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <Helmet>
        <title>Discover Local Shops & Services | ShopoApp</title>
        <meta name="description" content="Connect directly with Wholesale Suppliers, Retail Shops, and Services in your area." />
      </Helmet>

      {/* 1. HERO SECTION & 2. SEARCH PANEL */}
      <section className="relative pt-24 pb-48 px-4 bg-gradient-to-br from-blue-600 via-purple-500 to-cyan-500 overflow-hidden min-h-[600px] flex flex-col justify-center rounded-b-[40px] shadow-2xl">
        {/* Animated Background Circles */}
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 8, repeat: Infinity }} className="absolute top-0 left-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl" />
        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }} className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-300 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-7xl relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="text-white text-center lg:text-left space-y-6">
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
              Your Local Market, <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">Reimagined.</span>
            </h1>
            <p className="text-lg lg:text-xl text-blue-50 max-w-2xl mx-auto lg:mx-0 opacity-90">
              Connect directly with trusted Wholesale Suppliers, Retail Shops, and Services in your neighborhood. Fast, secure, and always local.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-full px-8 h-14 shadow-lg" onClick={() => {document.getElementById('search-panel').scrollIntoView({behavior: 'smooth'})}}>
                Start Exploring
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 font-bold rounded-full px-8 h-14 backdrop-blur-sm" onClick={() => navigate('/seller-signup')}>
                Join as a Seller
              </Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="hidden lg:block relative h-[500px]">
            <img src="https://images.unsplash.com/photo-1663331323711-672df10bfd87?auto=format&fit=crop&q=80&w=800" alt="Local Commerce 3D Illustration" className="w-full h-full object-contain drop-shadow-2xl animate-[float_6s_ease-in-out_infinite]" />
          </motion.div>
        </div>
      </section>

      {/* Floating Search Panel */}
      <div id="search-panel" className="container mx-auto px-4 max-w-5xl -mt-24 relative z-30">
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <Card className="glass-effect rounded-3xl overflow-hidden border-white/40">
            <CardContent className="p-0">
              <Tabs defaultValue="shops" value={searchMode} onValueChange={setSearchMode} className="w-full">
                <div className="bg-white/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-700/50 px-6 pt-4 backdrop-blur-md">
                  <TabsList className="grid w-full max-w-md grid-cols-3 bg-transparent h-auto p-0 gap-4">
                    {['shops', 'products', 'services'].map((mode) => (
                      <TabsTrigger 
                        key={mode} 
                        value={mode} 
                        className="relative pb-4 pt-2 px-1 text-sm font-semibold text-slate-600 data-[state=active]:text-blue-600 bg-transparent data-[state=active]:bg-transparent shadow-none"
                      >
                        {mode === 'shops' && <><Store className="w-4 h-4 mr-2" /> Shops</>}
                        {mode === 'products' && <><PackageSearch className="w-4 h-4 mr-2" /> Products</>}
                        {mode === 'services' && <><Scissors className="w-4 h-4 mr-2" /> Services</>}
                        {searchMode === mode && (
                          <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                <div className="p-6 md:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-12 lg:col-span-5 relative" ref={searchContainerRef}>
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                          placeholder={searchMode === 'shops' ? "Search by shop name, category..." : `Search ${searchMode}...`} 
                          className="pl-12 h-14 text-base rounded-2xl bg-white dark:bg-slate-900 border-slate-200 focus:ring-2 focus:ring-blue-500 shadow-sm"
                          value={searchMode === 'shops' ? shopSearchQuery : searchMode === 'products' ? productSearchQuery : serviceSearchQuery}
                          onChange={(e) => {
                            if(searchMode === 'shops') setShopSearchQuery(e.target.value);
                            else if(searchMode === 'products') setProductSearchQuery(e.target.value);
                            else setServiceSearchQuery(e.target.value);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && (searchMode === 'shops' ? fetchShops() : handleItemSearch(null, searchMode === 'services'))}
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-4 lg:col-span-2 relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        placeholder="Country" 
                        className="h-14 pl-12 rounded-2xl border-slate-200" 
                        value={filters.country} 
                        onChange={(e) => setFilters({...filters, country: e.target.value})} 
                        disabled={isDetectingLocation} 
                      />
                    </div>
                    
                    <div className="md:col-span-4 lg:col-span-2 relative">
                      {isDetectingLocation ? (
                        <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 animate-spin" />
                      ) : (
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      )}
                      <Input 
                        placeholder={isDetectingLocation ? "Detecting..." : "City/PIN"} 
                        className="h-14 pl-12 rounded-2xl border-slate-200" 
                        value={filters.city || filters.pincode} 
                        onChange={(e) => setFilters({...filters, city: e.target.value, pincode: e.target.value})} 
                        disabled={isDetectingLocation}
                      />
                    </div>
                    
                    <div className="md:col-span-4 lg:col-span-3 flex gap-2">
                      <Button className="h-14 rounded-2xl px-8 w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold shadow-lg shadow-blue-500/25" onClick={() => searchMode === 'shops' ? fetchShops() : handleItemSearch(null, searchMode === 'services')}>
                        {isSearchingProducts ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 3. QUICK CATEGORIES */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Browse by Category</h2>
            <p className="text-slate-500">Discover everything you need from trusted local providers</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {[
              { icon: '🛒', name: 'Supermarket', img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80' },
              { icon: '👗', name: 'Fashion', img: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=200&q=80' },
              { icon: '📱', name: 'Electronics', img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=200&q=80' },
              { icon: '💊', name: 'Pharmacy', img: 'https://images.unsplash.com/photo-1584308666744-24d5e7a9b08f?auto=format&fit=crop&w=200&q=80' },
              { icon: '✂️', name: 'Services', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=200&q=80' },
              { icon: '🔧', name: 'Hardware', img: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=200&q=80' }
            ].map((cat, i) => (
              <motion.div key={i} whileHover={{ y: -5 }} className="group cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 dark:border-slate-800 bg-white">
                <div className="h-32 relative">
                  <img src={cat.img} alt={cat.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl drop-shadow-lg">{cat.icon}</span>
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURED SHOPS CAROUSEL */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Shops</h2>
              <p className="text-slate-500">Top-rated businesses in your area</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-200"><ChevronLeft className="w-5 h-5"/></Button>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-200"><ChevronRight className="w-5 h-5"/></Button>
            </div>
          </div>
          
          <div className="flex overflow-x-auto gap-6 pb-8 snap-x custom-scrollbar">
            {loading ? (
              [1,2,3].map(i => <Skeleton key={i} className="min-w-[340px] h-[400px] rounded-2xl shrink-0" />)
            ) : filteredShops.filter(s => s.is_featured).length > 0 ? (
              filteredShops.filter(s => s.is_featured).map(shop => (
                <div key={shop.id} className="min-w-[340px] max-w-[380px] shrink-0 snap-start">
                  <PremiumShopCard shop={shop} handleOpenMap={handleOpenMap} navigate={navigate} />
                </div>
              ))
            ) : (
              <p className="text-slate-500 w-full text-center py-10">No featured shops currently available.</p>
            )}
          </div>
        </div>
      </section>

      {/* 5. OFFERS SECTION */}
      <section className="py-20 bg-white dark:bg-slate-950">
         <div className="container mx-auto px-4 max-w-7xl">
            <OffersSection limit={8} />
         </div>
      </section>

      {/* 6. NEARBY SHOPS GRID */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Nearby Businesses</h2>
            <p className="text-slate-500">Explore all available shops and services</p>
          </div>
          
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-[400px] rounded-2xl" />)}
             </div>
          ) : filteredShops.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredShops.map(shop => (
                   <PremiumShopCard key={shop.id} shop={shop} handleOpenMap={handleOpenMap} navigate={navigate} />
                ))}
             </div>
          ) : (
             <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
               <Store className="h-16 w-16 text-slate-300 mx-auto mb-4" />
               <h3 className="text-xl font-bold text-slate-700">No Shops Found</h3>
               <p className="text-slate-500 mt-2">Adjust your filters to see more results.</p>
               <Button variant="outline" className="mt-6" onClick={clearFilters}>Clear Filters</Button>
             </div>
          )}
        </div>
      </section>

      {/* 7. MAP SECTION */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-7xl">
           <h2 className="text-3xl font-bold mb-10 text-center">Find Shops on Map</h2>
           <div className="grid lg:grid-cols-12 gap-8 h-[600px] rounded-3xl overflow-hidden border border-slate-100 shadow-xl bg-slate-50">
              <div className="lg:col-span-4 p-6 overflow-y-auto custom-scrollbar bg-white flex flex-col gap-4">
                 {filteredShops.map(shop => (
                    <div key={shop.id} onClick={() => handleOpenMap(shop)} className="p-4 rounded-xl border border-slate-100 hover:border-blue-500 cursor-pointer transition-all hover:shadow-md flex items-center gap-4">
                       <img src={shop.avatar_url || 'https://images.unsplash.com/photo-1469288205312-804b99a8d717?w=100&q=80'} className="w-16 h-16 rounded-lg object-cover" alt=""/>
                       <div>
                         <h4 className="font-bold text-sm truncate">{shop.business_name}</h4>
                         <p className="text-xs text-slate-500 line-clamp-1">{shop.street_address}</p>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="lg:col-span-8 h-full bg-slate-200 relative z-0">
                  <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%", zIndex: 1 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {filteredShops.map(shop => shop.latitude && shop.longitude && (
                      <Marker key={shop.id} position={[shop.latitude, shop.longitude]}>
                        <Popup><div className="font-bold">{shop.business_name}</div></Popup>
                      </Marker>
                    ))}
                  </MapContainer>
              </div>
           </div>
        </div>
      </section>

      {/* 8. TRUST SECTION */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Trusted by Millions</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">Empowering local commerce across the country</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
            <AnimatedCounter value={15000} label="Businesses" />
            <AnimatedCounter value={240000} label="Products" />
            <AnimatedCounter value={850} label="Cities" />
            <AnimatedCounter value={4.8} label="Avg Rating" />
          </div>
        </div>
      </section>

      {/* 9. WHY SHOP SECTION */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-3xl font-bold text-center mb-16">Why Shop with ShopoApp?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Verified Sellers', desc: 'Every business is physically verified for authenticity.', icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-100' },
              { title: 'Secure Payments', desc: 'Bank-grade security for all your online transactions.', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
              { title: 'Direct Contact', desc: 'Chat or call sellers directly with zero middlemen.', icon: HeartHandshake, color: 'text-purple-600', bg: 'bg-purple-100' },
              { title: 'Fast Local Delivery', desc: 'Get items delivered in hours, not days.', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100' }
            ].map((benefit, i) => (
              <motion.div key={i} whileHover={{ y: -8 }} className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center group">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${benefit.bg} flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}>
                  <benefit.icon className={`w-8 h-8 ${benefit.color}`} />
                </div>
                <h3 className="font-bold text-xl mb-3">{benefit.title}</h3>
                <p className="text-slate-500 leading-relaxed">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. TESTIMONIALS */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-3xl font-bold text-center mb-16">What Our Users Say</h2>
          <div className="flex overflow-x-auto gap-6 pb-12 snap-x custom-scrollbar">
            {[1,2,3,4].map((i) => (
              <Card key={i} className="min-w-[340px] max-w-[380px] shrink-0 snap-center rounded-3xl border-0 shadow-lg bg-white p-8">
                <div className="flex text-yellow-400 mb-6">{"★".repeat(5)}</div>
                <p className="text-slate-600 italic mb-8 text-lg line-clamp-4">"ShopoApp completely transformed how I source inventory. Finding local wholesalers with transparent pricing saved me thousands in shipping costs."</p>
                <div className="flex items-center gap-4">
                  <img src={`https://images.unsplash.com/photo-1490174566801-7bb1d14fd175?w=100&q=80&auto=format&fit=crop`} className="w-12 h-12 rounded-full object-cover" alt="User" />
                  <div>
                    <h4 className="font-bold text-slate-900">Sarah Jenkins</h4>
                    <p className="text-sm text-slate-500">Retail Store Owner</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FOOTER CTA */}
      <section className="py-24 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1557801200-9a8d901ded2a?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-cyan-900/90 mix-blend-multiply" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 drop-shadow-lg">Own a Business? Join ShopoApp Today</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">Get your free digital storefront, manage inventory, and reach thousands of local customers.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 font-bold h-14 px-10 rounded-full text-lg shadow-xl" onClick={() => navigate('/seller-signup')}>
              Register Shop for Free
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10 font-bold h-14 px-10 rounded-full text-lg backdrop-blur-sm" onClick={() => window.open('https://play.google.com', '_blank')}>
              Download App
            </Button>
          </div>
        </div>
      </section>

      {/* Shared Dialogs */}
      <Dialog open={!!selectedShop} onOpenChange={(open) => !open && setSelectedShop(null)}>
        <DialogContent className="sm:max-w-2xl w-[95%] rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="h-[300px] w-full bg-slate-100 relative">
            {selectedShop?.coords ? (
              <MapContainer key={selectedShop.id} center={[selectedShop.coords.lat, selectedShop.coords.lng]} zoom={16} style={{ height: "100%", width: "100%", zIndex: 1 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[selectedShop.coords.lat, selectedShop.coords.lng]}>
                  <Popup><div className="font-bold">{selectedShop.business_name}</div></Popup>
                </Marker>
                <MapController center={[selectedShop.coords.lat, selectedShop.coords.lng]} />
              </MapContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100"><MapPin className="w-10 h-10 mb-2 opacity-50" /></div>
            )}
            <Button variant="secondary" size="icon" className="absolute top-4 right-4 z-[400] rounded-full shadow-md bg-white text-slate-900 hover:bg-slate-100" onClick={() => setSelectedShop(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900">
            <h3 className="text-2xl font-bold mb-2">{selectedShop?.business_name}</h3>
            <p className="text-slate-500 mb-6 flex items-start gap-2">
              <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
              {selectedShop?.street_address}, {selectedShop?.city}{selectedShop?.pincode && `, ${selectedShop?.pincode}`}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-12 rounded-xl" onClick={() => setSelectedShop(null)}>Close</Button>
              <Button className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleGetDirections(selectedShop, selectedShop?.coords)}>
                <Navigation className="w-4 h-4 mr-2" /> Directions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalShopsPage;