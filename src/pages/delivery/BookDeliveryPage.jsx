import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { MapPin, Package, User, Calculator, ArrowRight, Truck, Home, Check, ChevronsUpDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice, calculateDistance, cn } from '@/lib/utils';
import DeliveryMapPicker from '@/components/delivery/DeliveryMapPicker';

const PACKAGE_TYPES = [
  "Documents",
  "Food",
  "Groceries",
  "Medicines",
  "Electronics",
  "Clothing",
  "Other"
];

const BookDeliveryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Form State
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [openShopSelect, setOpenShopSelect] = useState(false);
  
  // Drop Location State
  const [dropLocation, setDropLocation] = useState({ lat: null, lng: null });
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [dropCity, setDropCity] = useState('');
  const [dropState, setDropState] = useState('');
  const [dropPincode, setDropPincode] = useState('');
  const [landmark, setLandmark] = useState('');

  // Address Management
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('Home');

  // Package Info
  const [weight, setWeight] = useState('');
  const [packageType, setPackageType] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedFare, setFare] = useState(null);
  const [fareBreakdown, setFareBreakdown] = useState(null);
  const [distance, setDistance] = useState(null);

  // Config Data
  const [pricingConfig, setPricingConfig] = useState(null);
  const [weightSlabs, setWeightSlabs] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch Shops
      const { data: shopsData } = await supabase
        .from('profiles')
        .select('id, business_name, street_address, city, latitude, longitude')
        .eq('role', 'seller')
        .not('latitude', 'is', null);

      setShops(shopsData || []);

      // 2. Fetch Pricing
      const { data: config } = await supabase.from('delivery_pricing_config').select('*').single();
      const { data: slabs } = await supabase.from('delivery_weight_slabs').select('*');
      
      setPricingConfig(config);
      setWeightSlabs(slabs || []);

      // 3. Fetch User Addresses & Profile for prefill
      if (user) {
        // Get Saved Addresses
        const { data: addresses } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        setSavedAddresses(addresses || []);

        // Pre-fill Logic
        if (addresses && addresses.length > 0) {
            // Select default or first address
            const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
            handleAddressSelection(defaultAddr.id, addresses);
        } else if (user.profile) {
            // Fallback to profile address if no saved addresses
            setRecipientName(user.profile.business_name || user.profile.contact_person || '');
            setRecipientPhone(user.profile.phone || '');
            setDropAddress(user.profile.street_address || '');
            setDropCity(user.profile.city || '');
            setDropPincode(user.profile.pincode || '');
            setDropState(user.profile.state || '');
        }
      }

    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleAddressSelection = (addressId, addressList = savedAddresses) => {
    setSelectedAddressId(addressId);
    
    if (addressId === 'new') {
        // Clear fields for new entry
        setDropAddress('');
        setDropCity('');
        setDropState('');
        setDropPincode('');
        setDropLocation({ lat: null, lng: null });
        setLandmark('');
        return;
    }

    const addr = addressList.find(a => a.id === addressId);
    if (addr) {
        setDropAddress(addr.street_address);
        setDropCity(addr.city);
        setDropState(addr.state || '');
        setDropPincode(addr.pincode);
        // Assuming user_addresses might not have landmark, but if it did, we'd set it
        // setLandmark(addr.landmark || ''); 
        
        if (addr.latitude && addr.longitude) {
            setDropLocation({ lat: addr.latitude, lng: addr.longitude });
        }
        // Also prefill name/phone from profile if empty
        if (!recipientName && user?.profile) setRecipientName(user.profile.contact_person || user.profile.business_name);
        if (!recipientPhone && user?.profile) setRecipientPhone(user.profile.phone);
    }
  };

  const handleCalculateFare = () => {
    if (!selectedShop || !dropLocation.lat || !weight || !pricingConfig) {
      toast({ title: "Missing Info", description: "Please ensure pickup shop, map location, and weight are filled.", variant: "destructive" });
      return;
    }

    setCalculating(true);
    
    // 1. Calculate Distance
    const dist = calculateDistance(selectedShop.latitude, selectedShop.longitude, dropLocation.lat, dropLocation.lng);
    setDistance(dist);

    // 2. Base Fare Logic
    const baseFare = Number(pricingConfig.base_fare);
    
    // 3. Distance Surcharge
    const extraKm = Math.max(0, dist - pricingConfig.base_distance_km);
    const distanceCost = extraKm * pricingConfig.per_km_rate;

    // 4. Weight Surcharge
    let weightCost = 0;
    const w = parseFloat(weight);
    const slab = weightSlabs.find(s => w >= s.min_weight && w < s.max_weight);
    if (slab) {
      weightCost = Number(slab.surcharge);
    } else if (weightSlabs.length > 0) {
       // Handle cases exceeding max defined slab if needed, or take highest slab
       const maxSlab = weightSlabs.reduce((prev, current) => (prev.max_weight > current.max_weight) ? prev : current);
       if (w >= maxSlab.max_weight) weightCost = Number(maxSlab.surcharge) + 50; // Simple fallback logic
    }

    const totalFare = Math.round(baseFare + distanceCost + weightCost);
    
    setFare(totalFare);
    setFareBreakdown({
        base: baseFare,
        distance: Math.round(distanceCost),
        weight: weightCost
    });
    
    setCalculating(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to book a delivery.", variant: "destructive" });
      return;
    }
    if (!estimatedFare) {
      handleCalculateFare(); 
      if (!estimatedFare) return;
    }
    if (!packageType) {
        toast({ title: "Package Type", description: "Please select a package type.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      // 1. Save new address if requested
      if (selectedAddressId === 'new' && saveNewAddress) {
        const { error: addrError } = await supabase.from('user_addresses').insert({
            user_id: user.id,
            label: newAddressLabel,
            street_address: dropAddress,
            city: dropCity,
            state: dropState,
            pincode: dropPincode,
            latitude: dropLocation.lat,
            longitude: dropLocation.lng,
            is_default: savedAddresses.length === 0
        });
        if (addrError) console.error("Failed to save address:", addrError);
      }

      // 2. Create Booking
      const fullAddress = `${dropAddress}, ${landmark ? 'Landmark: ' + landmark + ', ' : ''}${dropCity}, ${dropState} - ${dropPincode}`;
      
      const { error } = await supabase.from('delivery_bookings').insert({
        customer_id: user.id,
        pickup_shop_id: selectedShop.id,
        pickup_address: `${selectedShop.business_name}, ${selectedShop.street_address}, ${selectedShop.city}`,
        pickup_lat: selectedShop.latitude,
        pickup_lng: selectedShop.longitude,
        drop_address: fullAddress,
        drop_lat: dropLocation.lat,
        drop_lng: dropLocation.lng,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        package_weight: parseFloat(weight),
        package_type: packageType,
        notes: notes,
        distance_km: distance,
        fare_amount: estimatedFare,
        status: 'open'
      });

      if (error) throw error;

      toast({ title: "Booking Confirmed!", description: "Riders near the shop will be notified." });
      navigate('/delivery/my-bookings');
    } catch (err) {
      console.error(err);
      toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Helmet>
        <title>Book Delivery - B2B Nexus</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Book Home Delivery</h1>
        <p className="text-slate-500">Fast and reliable delivery from your favorite local shops.</p>
      </div>

      <div className="grid gap-6">
        {/* Pickup Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="text-blue-600" /> Pickup Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label>Select Pickup Shop</Label>
              <Popover open={openShopSelect} onOpenChange={setOpenShopSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openShopSelect}
                    className="w-full justify-between"
                  >
                    {selectedShop
                      ? selectedShop.business_name
                      : "Search for a shop..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search shop name or city..." />
                    <CommandEmpty>No shop found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-y-auto">
                      {shops.map((shop) => (
                        <CommandItem
                          key={shop.id}
                          value={shop.business_name}
                          onSelect={() => {
                            setSelectedShop(shop);
                            setOpenShopSelect(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedShop?.id === shop.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{shop.business_name}</span>
                            <span className="text-xs text-muted-foreground">{shop.city}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {selectedShop && (
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                <p className="font-medium text-slate-800">Shop Address:</p>
                {selectedShop.street_address}, {selectedShop.city}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drop Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="text-blue-600" /> Drop Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {/* Address Selection Dropdown */}
            {savedAddresses.length > 0 && (
                <div className="mb-4">
                    <Label>Select Saved Address</Label>
                    <Select value={selectedAddressId} onValueChange={handleAddressSelection}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose an address..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new"><span className="flex items-center font-medium text-blue-600"><PlusIcon className="w-4 h-4 mr-2"/> Add New Address</span></SelectItem>
                            {savedAddresses.map(addr => (
                                <SelectItem key={addr.id} value={addr.id}>
                                    <span className="font-medium">{addr.label}</span> - {addr.street_address}, {addr.city}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Recipient Name</Label>
                <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div>
                <Label>Recipient Phone</Label>
                <Input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="e.g. 9876543210" />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <h4 className="font-medium text-sm text-slate-700">Address Details</h4>
                <div>
                    <Label className="text-xs">Street Address</Label>
                    <Input value={dropAddress} onChange={e => setDropAddress(e.target.value)} placeholder="House No, Street..." />
                </div>
                <div>
                    <Label className="text-xs">Landmark (Optional)</Label>
                    <Input value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="Near City Park..." />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                        <Label className="text-xs">City</Label>
                        <Input value={dropCity} onChange={e => setDropCity(e.target.value)} placeholder="City" />
                    </div>
                    <div className="col-span-1">
                        <Label className="text-xs">State</Label>
                        <Input value={dropState} onChange={e => setDropState(e.target.value)} placeholder="State" />
                    </div>
                    <div className="col-span-1">
                        <Label className="text-xs">Pincode</Label>
                        <Input value={dropPincode} onChange={e => setDropPincode(e.target.value)} placeholder="123456" />
                    </div>
                </div>
            </div>

            {/* Save Address Option (Only if 'new' is selected) */}
            {selectedAddressId === 'new' && (
                <div className="flex flex-col gap-2 p-3 bg-blue-50/50 rounded-md border border-blue-100">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="saveAddress" 
                            checked={saveNewAddress} 
                            onCheckedChange={setSaveNewAddress} 
                        />
                        <Label htmlFor="saveAddress" className="cursor-pointer font-normal text-slate-700">Save this address for future bookings</Label>
                    </div>
                    {saveNewAddress && (
                        <div className="ml-6 mt-2">
                             <Label htmlFor="addrLabel" className="text-xs">Label (e.g. Home, Work)</Label>
                             <Input 
                                id="addrLabel" 
                                value={newAddressLabel} 
                                onChange={(e) => setNewAddressLabel(e.target.value)} 
                                className="h-8 text-sm mt-1" 
                                placeholder="Home"
                            />
                        </div>
                    )}
                </div>
            )}

            <div>
              <Label className="mb-2 block">Confirm Location on Map (Required)</Label>
              <DeliveryMapPicker 
                initialLat={dropLocation.lat || selectedShop?.latitude} 
                initialLng={dropLocation.lng || selectedShop?.longitude}
                onLocationSelect={(lat, lng) => setDropLocation({ lat, lng })}
              />
              <p className="text-xs text-slate-500 mt-1">
                * Please adjust the pin if the auto-detected location is incorrect.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Package Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="text-blue-600" /> Package Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Package Type</Label>
                    <Select onValueChange={setPackageType} value={packageType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            {PACKAGE_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Approx Weight (kg)</Label>
                    <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 2.5" />
                </div>
            </div>
            
            <div>
                <Label>Notes (Optional)</Label>
                <Textarea 
                    placeholder="E.g., Fragile, Call before arriving, Leave at security..." 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                />
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleCalculateFare} variant="outline" className="gap-2" disabled={calculating}>
                <Calculator className="w-4 h-4" /> Calculate Fare
              </Button>
            </div>

            {estimatedFare !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 border border-blue-100 p-4 rounded-lg mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600 flex items-center gap-1"><Info className="w-3 h-3"/> Distance</span>
                  <span className="font-semibold">{distance} km</span>
                </div>
                {fareBreakdown && (
                    <div className="text-xs text-slate-500 mb-3 space-y-1 pl-4 border-l-2 border-blue-200">
                        <div className="flex justify-between"><span>Base Fare:</span> <span>{formatPrice(fareBreakdown.base)}</span></div>
                        <div className="flex justify-between"><span>Distance Charge:</span> <span>{formatPrice(fareBreakdown.distance)}</span></div>
                        <div className="flex justify-between"><span>Weight Surcharge:</span> <span>{formatPrice(fareBreakdown.weight)}</span></div>
                    </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-blue-100">
                  <span className="text-slate-600 font-medium">Total Estimate</span>
                  <span className="text-2xl font-bold text-blue-700">{formatPrice(estimatedFare)}</span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Button size="lg" className="w-full h-14 text-lg btn-primary" onClick={handleSubmit} disabled={loading || !estimatedFare}>
          {loading ? 'Booking...' : 'Confirm Booking'} <ArrowRight className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

// Helper Icon Component
const PlusIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14M12 5v14"/>
    </svg>
);

export default BookDeliveryPage;