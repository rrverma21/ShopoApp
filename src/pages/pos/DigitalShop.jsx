import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  ShoppingBag, 
  Search, 
  MapPin, 
  Phone, 
  Clock, 
  ChevronLeft, 
  Filter, 
  Star, 
  Info,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  ArrowRight,
  Loader2,
  Share2,
  MessageSquare,
  Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/customSupabaseClient';
import { calculateShopStatus } from '@/utils/shopStatusCalculator';
import { cn } from '@/lib/utils';

const DigitalShop = () => {
  const { retailerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchShopData();
  }, [retailerId]);

  const fetchShopData = async () => {
    setLoading(true);
    try {
      // Fetch the public shop profile and public storefront settings separately.
      const [profileResult, settingsResult] = await Promise.all([
        supabase
          .from('public_shop_profiles')
          .select('id, business_name, avatar_url, city, pincode, latitude, longitude, is_disabled, phone')
          .eq('id', retailerId)
          .single(),
        supabase
          .from('pos_retailer_settings')
          .select('description, opening_time, closing_time, working_days, timezone, storefront_image_url')
          .eq('user_id', retailerId)
          .maybeSingle()
      ]);

      const { data: profile, error: profileError } = profileResult;
      const { data: settings, error: settingsError } = settingsResult;

      if (profileError) throw profileError;
      if (profile.is_disabled) throw new Error('Shop is disabled');
      if (settingsError) throw settingsError;

      setShop({ ...profile, pos_retailer_settings: settings });
      setStatus(calculateShopStatus(settings));

      // Fetch online-visible products
      const { data: productList, error: prodError } = await supabase
        .from('point_of_sale_products')
        .select('*')
        .eq('user_id', retailerId)
        .eq('is_visible_online', true)
        .eq('archived', false);

      if (prodError) throw prodError;
      setProducts(productList || []);

      // Extract unique categories
      const uniqueCats = ['All', ...new Set((productList || []).map(p => p.category).filter(Boolean))];
      setCategories(uniqueCats);

    } catch (error) {
      console.error('Error loading shop:', error);
      toast({
        title: "Error",
        description: "Failed to load shop details. It might not be active.",
        variant: "destructive"
      });
      navigate('/local-shops');
    } finally {
      setLoading(false);
    }
  };

  const updateCart = (productId, delta) => {
    setCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      const newCart = { ...prev };
      if (newQty === 0) {
        delete newCart[productId];
      } else {
        newCart[productId] = newQty;
      }
      return newCart;
    });
  };

  const totalCartItems = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const cartTotal = products
    .filter(p => cart[p.id])
    .reduce((sum, p) => sum + (p.selling_price * cart[p.id]), 0);

  const filteredProducts = products
    .filter(p => {
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const aInStock = a.stock_level > 0;
      const bInStock = b.stock_level > 0;
      if (aInStock && !bInStock) return -1;
      if (!aInStock && bInStock) return 1;
      return 0; // preserve existing order if both have same stock status
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="h-48 bg-slate-200 animate-pulse" />
        <div className="container mx-auto px-4 -mt-12 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: shop.business_name,
        text: `Check out products from ${shop.business_name} on ShopoApp!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link Copied", description: "Shop link copied to clipboard!" });
    }
  };

  const mapAddress = [shop.city, shop.pincode].filter(Boolean).join(', ') || 'Location unavailable';
  const mapDestination = shop.latitude != null && shop.longitude != null
    ? `${shop.latitude},${shop.longitude}`
    : mapAddress;
  const mapLink = `https://maps.google.com/?q=${encodeURIComponent(mapDestination)}`;

  return (
    <div className="min-h-screen h-full bg-slate-50 dark:bg-slate-950 pb-48 md:pb-32 overflow-y-auto overflow-x-hidden">
      <Helmet>
        <title>{shop?.business_name || 'Shop'} | Online Store</title>
      </Helmet>

      {/* Hero Header */}
      <div className="relative h-48 md:h-64 bg-indigo-900 overflow-hidden shrink-0">
        {shop?.pos_retailer_settings?.storefront_image_url ? (
          <img 
            src={shop.pos_retailer_settings.storefront_image_url} 
            className="w-full h-full object-cover opacity-60"
            alt="Shop Cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-900 to-indigo-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        <Button 
          variant="ghost" 
          className="absolute top-4 left-4 text-white hover:bg-white/20 touch-target touch-manipulation"
          onClick={() => navigate('/local-shops')}
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Back to Directory
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/20 touch-target touch-manipulation"
          onClick={handleShare}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <Card className="border-0 shadow-xl overflow-hidden mb-8">
          <CardContent className="p-0">
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white dark:border-slate-900 bg-slate-100 overflow-hidden shadow-lg shrink-0">
                {shop.avatar_url ? (
                  <img src={shop.avatar_url} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold">
                    {shop.business_name?.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className="flex-grow space-y-3 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                    {shop.business_name}
                  </h1>
                  <Badge className={cn("px-2 py-1", status?.color)}>
                    {status?.displayText}
                  </Badge>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base max-w-2xl">
                  {shop.pos_retailer_settings?.description || "Welcome to our online store! Browse our digital catalog below."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="truncate">{mapAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>{shop.pos_retailer_settings?.opening_time} - {shop.pos_retailer_settings?.closing_time}</span>
                  </div>
                  {shop.phone && (
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>{shop.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3">
                  <Button 
                    onClick={() => window.open(mapLink, '_blank', 'noopener,noreferrer')}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-sm touch-target touch-manipulation w-full sm:w-auto"
                    size="sm"
                    aria-label="View on Google Maps"
                  >
                    <Navigation className="mr-2 h-4 w-4" /> View on Map
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Category Nav */}
        <div className="sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md py-4 z-20 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search products in this shop..." 
                className="pl-10 h-11 bg-white dark:bg-slate-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="relative w-full overflow-hidden">
              {/* Left/Right scroll fades */}
              <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent pointer-events-none z-10" />
              <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent pointer-events-none z-10" />
              
              <div className="flex flex-nowrap gap-2 pb-2 px-4 overflow-x-auto overflow-y-hidden scroll-smooth hide-desktop-scrollbar">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap rounded-full px-5 min-h-[40px] shrink-0 touch-manipulation"
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              layout
            >
              <Card className="h-full group overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all flex flex-col">
                <div className="relative h-40 md:h-48 overflow-hidden bg-slate-100 dark:bg-slate-900">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      alt={product.name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                  {product.stock_level <= 5 && product.stock_level > 0 && (
                    <Badge variant="destructive" className="absolute top-2 left-2 text-[10px]">
                      Only {Math.floor(product.stock_level)} left
                    </Badge>
                  )}
                  {product.stock_level <= 0 && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="text-white font-bold text-sm bg-red-600 px-3 py-1 rounded-full">Out of Stock</span>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-3 md:p-4 flex flex-col flex-grow">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">
                    {product.category || 'General'}
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm md:text-base line-clamp-2 mb-2 leading-snug">
                    {product.name}
                  </h3>
                  
                  <div className="mt-auto flex flex-col gap-3">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">₹{product.selling_price}</span>
                      {product.mrp > product.selling_price && (
                        <span className="text-xs text-slate-400 line-through">₹{product.mrp}</span>
                      )}
                    </div>
                    
                    {cart[product.id] ? (
                      <div className="flex items-center justify-between w-full bg-blue-50 dark:bg-blue-900/30 rounded-full p-1 border border-blue-100 dark:border-blue-800">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-blue-600 hover:bg-blue-100 touch-target touch-manipulation shrink-0"
                          onClick={() => updateCart(product.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-bold text-sm text-blue-700 dark:text-blue-300">
                          {cart[product.id]}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-blue-600 hover:bg-blue-100 touch-target touch-manipulation shrink-0"
                          onClick={() => updateCart(product.id, 1)}
                          disabled={cart[product.id] >= product.stock_level}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        className="h-10 md:h-9 min-h-[44px] md:min-h-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white w-full touch-manipulation"
                        disabled={product.stock_level <= 0}
                        onClick={() => updateCart(product.id, 1)}
                      >
                        Add <Plus className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
            <ShoppingBag className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No products found</h3>
            <p className="text-slate-500">Try searching for something else or browse another category.</p>
            <Button variant="link" className="text-blue-600 mt-4 touch-target touch-manipulation" onClick={() => {setSearchQuery(''); setActiveCategory('All');}}>
              View All Products
            </Button>
          </div>
        )}
      </div>

      {/* Floating Checkout Bar */}
      <AnimatePresence>
        {totalCartItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 md:bottom-6 left-0 md:left-1/2 md:-translate-x-1/2 w-full md:w-[90%] max-w-2xl z-50 transition-all duration-300"
          >
            <div className="bg-blue-600 text-white rounded-t-2xl md:rounded-2xl shadow-[0_-8px_30px_-5px_rgba(37,99,235,0.3)] md:shadow-2xl md:shadow-blue-500/30 p-4 md:p-4 pb-safe flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              <div className="flex flex-row items-center justify-between md:justify-start gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                    {totalCartItems}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm md:text-xs text-blue-100 font-medium leading-none mb-1">Items in Cart</p>
                    <p className="text-xl font-bold leading-none">₹{cartTotal.toFixed(2)}</p>
                  </div>
                </div>
                
                {/* On mobile, show a small text indicator on the right if needed, but keeping it clean is better */}
              </div>
              
              <Button 
                onClick={() => navigate(`/shop/${retailerId}/checkout`, { state: { cart, products } })}
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold w-full md:w-auto px-8 h-14 md:h-12 min-h-[44px] rounded-xl touch-target touch-manipulation text-base shadow-sm shrink-0 flex items-center justify-center"
              >
                Checkout <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DigitalShop;
