import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, MapPin, Phone, Truck, Check, Loader2, Navigation, Milk } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateDistance, formatPrice } from '@/lib/utils';

const NearbyDairyShops = ({ userLocation }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [requestData, setRequestData] = useState({ quantity: '1', address: '', milkType: '' });
  const [shopMilkTypes, setShopMilkTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDairyShops();
  }, [userLocation]);

  useEffect(() => {
    if (selectedShop) {
      fetchMilkTypes(selectedShop.user_id);
    }
  }, [selectedShop]);

  const fetchDairyShops = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('pos_retailer_settings')
        .select(`
          user_id,
          shop_type,
          delivery_enabled,
          storefront_image_url,
          profile:profiles!pos_retailer_settings_user_id_fkey (
            id,
            business_name,
            street_address,
            city,
            pincode,
            phone,
            latitude,
            longitude
          )
        `)
        .eq('shop_type', 'dairy');

      const { data, error } = await query;

      if (error) throw error;

      let processedShops = data.map(item => {
        const shopLat = item.profile?.latitude;
        const shopLng = item.profile?.longitude;
        let distance = null;

        if (userLocation && userLocation.lat && userLocation.lng && shopLat && shopLng) {
          distance = calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            shopLat, 
            shopLng
          );
        }

        return {
          ...item,
          distance
        };
      });

      if (userLocation) {
        processedShops.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }

      setShops(processedShops);
    } catch (error) {
      console.error('Error fetching dairy shops:', error);
      toast({
        title: "Error",
        description: "Failed to load nearby dairy shops.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMilkTypes = async (retailerId) => {
    setLoadingTypes(true);
    try {
      const { data, error } = await supabase
        .from('retailer_milk_products')
        .select('*')
        .eq('retailer_id', retailerId)
        .eq('is_available', true);
      
      if (error) throw error;
      setShopMilkTypes(data || []);
      
      // Reset selected milk type when opening a new shop dialog
      if (data && data.length > 0) {
          setRequestData(prev => ({ ...prev, milkType: data[0].name }));
      } else {
          setRequestData(prev => ({ ...prev, milkType: '' }));
      }
    } catch (error) {
      console.error("Error fetching milk types", error);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedShop) return;
    if (!requestData.milkType) {
        toast({ title: "Milk Type Required", description: "Please select a milk type.", variant: "destructive" });
        return;
    }
    
    setRequesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login to send requests");

      const { error } = await supabase
        .from('milk_subscription_requests')
        .insert({
          retailer_id: selectedShop.profile.id,
          customer_id: user.id,
          customer_phone: user.user_metadata?.phone || user.phone || '',
          customer_name: user.user_metadata?.full_name || 'Customer',
          daily_quantity: requestData.quantity,
          product_name: requestData.milkType,
          address: requestData.address || (userLocation?.address || ''),
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Sent!",
        description: `Subscription request sent to ${selectedShop.profile.business_name}.`,
      });
      setSelectedShop(null);
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        title: "Failed",
        description: error.message || "Could not send request.",
        variant: "destructive"
      });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
        <Milk className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <p>No dairy shops found nearby.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Store className="h-5 w-5" /> Nearby Dairy Shops
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shops.map((shop) => (
          <Card key={shop.user_id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-24 bg-blue-50 relative">
               {shop.storefront_image_url ? (
                   <img src={shop.storefront_image_url} alt={shop.profile.business_name} className="w-full h-full object-cover" />
               ) : (
                   <div className="w-full h-full flex items-center justify-center text-blue-200">
                       <Milk className="h-12 w-12" />
                   </div>
               )}
               {shop.delivery_enabled && (
                   <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600">
                       <Truck className="h-3 w-3 mr-1" /> Delivery
                   </Badge>
               )}
            </div>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-base">{shop.profile.business_name}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3" /> 
                {shop.distance ? `${shop.distance} km away` : shop.profile.city}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2 text-sm text-slate-600">
               <p className="line-clamp-2 text-xs mb-2">
                   {shop.profile.street_address}, {shop.profile.city}
               </p>
               {shop.profile.phone && (
                   <div className="flex items-center gap-1.5 text-xs font-medium text-slate-900">
                       <Phone className="h-3 w-3" /> {shop.profile.phone}
                   </div>
               )}
            </CardContent>
            <CardFooter className="pt-2">
              <Dialog open={selectedShop?.user_id === shop.user_id} onOpenChange={(open) => !open && setSelectedShop(null)}>
                <DialogTrigger asChild>
                    <Button 
                        variant="outline" 
                        className="w-full text-xs"
                        onClick={() => setSelectedShop(shop)}
                    >
                        Request Subscription
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Milk Subscription</DialogTitle>
                        <DialogDescription>
                            Send a request to <strong>{shop.profile.business_name}</strong> for daily milk delivery.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Milk Type</Label>
                            {loadingTypes ? (
                                <div className="h-10 w-full animate-pulse bg-slate-100 rounded" />
                            ) : shopMilkTypes.length > 0 ? (
                                <Select 
                                    value={requestData.milkType} 
                                    onValueChange={(val) => setRequestData({...requestData, milkType: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select milk type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {shopMilkTypes.map(type => (
                                            <SelectItem key={type.id} value={type.name}>
                                                {type.name} {type.price > 0 && `(₹${type.price}/unit)`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input 
                                    placeholder="e.g. Cow Milk (Standard)"
                                    value={requestData.milkType}
                                    onChange={(e) => setRequestData({...requestData, milkType: e.target.value})}
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Daily Quantity (Liters)</Label>
                            <Input 
                                type="number" 
                                min="0.5" 
                                step="0.5" 
                                value={requestData.quantity}
                                onChange={(e) => setRequestData({...requestData, quantity: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Delivery Address</Label>
                            <Input 
                                placeholder="House No, Street, Landmark..." 
                                value={requestData.address}
                                onChange={(e) => setRequestData({...requestData, address: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedShop(null)}>Cancel</Button>
                        <Button onClick={handleSendRequest} disabled={requesting} className="bg-blue-600 text-white">
                            {requesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            Send Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NearbyDairyShops;