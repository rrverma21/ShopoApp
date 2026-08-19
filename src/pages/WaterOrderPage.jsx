import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Droplets, MapPin, Phone, User, CheckCircle, Search, Mail, Map as MapIcon, ArrowUp, Building, ChevronDown, Wallet, CreditCard, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Helmet } from 'react-helmet-async';
import SearchableSelect from '@/components/ui/SearchableSelect';
import ProductPickerModal from '@/components/ui/ProductPickerModal';
import { useNavigate } from 'react-router-dom';

const WaterOrderPage = () => {
  const [products, setProducts] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // State for mobile lookup
  const [isSearching, setIsSearching] = useState(false);
  const [profileFound, setProfileFound] = useState(false);
  const [searchMessage, setSearchMessage] = useState(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    customer_phone: '',
    customer_name: '',
    customer_email: '',
    customer_address: '',
    customer_landmark: '',
    customer_pincode: '',
    delivery_area_id: '',
    product_id: '',
    quantity: 1,
    lift_available: false,
    floor_number: '0',
    notes: '',
    payment_method: 'cash_on_delivery'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [productsRes, areasRes] = await Promise.all([
        supabase.from('water_products').select('*').eq('is_available', true).order('name'),
        supabase.from('water_delivery_areas').select('*').eq('is_active', true).order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (areasRes.error) throw areasRes.error;

      setProducts(productsRes.data || []);
      setAreas(areasRes.data || []);

      if (productsRes.data && productsRes.data.length > 0) {
        setFormData(prev => {
          // Conditional check to prevent duplicate state updates in same cycle
          if (prev.product_id === productsRes.data[0].id) return prev;
          return {
            ...prev,
            product_id: productsRes.data[0].id
          };
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load order page information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
    // Intentionally excluding toast from dependencies to prevent circular re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      fetchData();
    }
    return () => { mounted = false; };
  }, [fetchData]);

  // Memoized Handlers to prevent recreation and infinite loops
  const handleInputChange = useCallback(e => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (prev[name] === value) return prev;
      return { ...prev, [name]: value };
    });
  }, []);

  const handleSelectChange = useCallback((name, value) => {
    setFormData(prev => {
      if (prev[name] === value) return prev;
      return { ...prev, [name]: value };
    });
  }, []);

  const handleAreaSelect = useCallback((val) => {
    handleSelectChange('delivery_area_id', val);
  }, [handleSelectChange]);

  const handleProductSelect = useCallback((id) => {
    handleSelectChange('product_id', id);
  }, [handleSelectChange]);

  const handleFloorChange = useCallback((val) => {
    handleSelectChange('floor_number', val);
  }, [handleSelectChange]);

  const handleProductPickerClose = useCallback(() => {
    setIsProductPickerOpen(false);
  }, []);

  const openProductPicker = useCallback(() => {
    setIsProductPickerOpen(true);
  }, []);

  const handleLiftChange = useCallback((checked) => {
    const isChecked = checked === true;
    setFormData(prev => {
      if (prev.lift_available === isChecked) return prev;
      return {
        ...prev,
        lift_available: isChecked
      };
    });
  }, []);

  const handlePaymentChange = useCallback((method) => {
    setFormData(prev => {
      if (prev.payment_method === method) return prev;
      return {
        ...prev,
        payment_method: method
      };
    });
  }, []);

  const handleCashPaymentClick = useCallback(() => {
    handlePaymentChange('cash_on_delivery');
  }, [handlePaymentChange]);

  const handleMobileBlur = useCallback(async (e) => {
    const mobileNumber = e.target.value;
    const phoneRegex = /^[6-9]\d{9}$/;
    
    if (!mobileNumber) {
      setSearchMessage(null);
      return;
    }
    
    if (!phoneRegex.test(mobileNumber)) {
      setSearchMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile number' });
      return;
    }
    
    setIsSearching(true);
    setSearchMessage(null);
    setProfileFound(false);
    
    try {
      const { data, error } = await supabase
        .from('water_customer_profiles')
        .select('*')
        .eq('mobile_number', mobileNumber)
        .maybeSingle();
        
      if (error) {
        console.error("Lookup error:", error);
        setSearchMessage({ type: 'error', text: 'Unable to check profile status. Please fill details manually.' });
      } else if (data) {
        setProfileFound(true);
        setSearchMessage({ type: 'success', text: 'Welcome back! We found your details.' });
        setFormData(prev => ({
          ...prev,
          customer_name: data.name || prev.customer_name,
          customer_email: data.email || prev.customer_email,
          customer_address: data.address || prev.customer_address,
          customer_landmark: data.landmark || prev.customer_landmark,
          customer_pincode: data.pincode || prev.customer_pincode
        }));
      } else {
        setSearchMessage({ type: 'info', text: 'New customer? Please fill in your details below.' });
      }
    } catch (err) {
      setSearchMessage({ type: 'error', text: 'Network error occurred during lookup.' });
    } finally {
      setIsSearching(false);
    }
  }, []);

  const totals = useMemo(() => {
    try {
      const product = products.find(p => p.id === formData.product_id);
      const area = areas.find(a => a.id === formData.delivery_area_id);
      const price = product ? Number(product.price) : 0;
      const qty = Number(formData.quantity) || 1;
      const productTotal = price * qty;
      const deliveryCharge = area ? Number(area.delivery_charge) : 0;

      let floorCharge = 0;
      if (!formData.lift_available) {
        const floor = parseInt(formData.floor_number);
        if (!isNaN(floor)) {
          if (floor === 3 || floor === 4) floorCharge = 20;
          else if (floor === 5) floorCharge = 25;
          else if (floor === 6) floorCharge = 30;
        }
      }
      const grandTotal = productTotal + deliveryCharge + floorCharge;
      
      return {
        productTotal: isNaN(productTotal) ? 0 : productTotal,
        deliveryCharge: isNaN(deliveryCharge) ? 0 : deliveryCharge,
        floorCharge: isNaN(floorCharge) ? 0 : floorCharge,
        grandTotal: isNaN(grandTotal) ? 0 : grandTotal
      };
    } catch (e) {
      return { productTotal: 0, deliveryCharge: 0, floorCharge: 0, grandTotal: 0 };
    }
  }, [products, areas, formData.product_id, formData.delivery_area_id, formData.quantity, formData.lift_available, formData.floor_number]);

  const handleSubmit = useCallback(async e => {
    e.preventDefault();
    if (!formData.customer_name || !formData.customer_phone || !formData.customer_address || !formData.product_id || !formData.delivery_area_id) {
      toast({ title: "Validation Error", description: "Please fill in all required fields including delivery area.", variant: "destructive" });
      return;
    }

    if (!formData.lift_available && (formData.floor_number === '' || formData.floor_number === null)) {
      toast({ title: "Validation Error", description: "Please select your floor number since lift is not available.", variant: "destructive" });
      return;
    }
    
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.customer_phone)) {
      toast({ title: "Validation Error", description: "Please enter a valid 10-digit Indian mobile number.", variant: "destructive" });
      return;
    }

    if (!formData.payment_method) {
      toast({ title: "Validation Error", description: "Please select a payment method.", variant: "destructive" });
      return;
    }
    
    try {
      setSubmitting(true);

      const profileData = {
        mobile_number: formData.customer_phone,
        name: formData.customer_name,
        address: formData.customer_address,
        landmark: formData.customer_landmark,
        pincode: formData.customer_pincode,
        email: formData.customer_email,
        phone: formData.customer_phone,
        updated_at: new Date()
      };
      
      const { data: existingProfile } = await supabase.from('water_customer_profiles').select('id').eq('mobile_number', formData.customer_phone).maybeSingle();
      if (existingProfile) {
        await supabase.from('water_customer_profiles').update(profileData).eq('mobile_number', formData.customer_phone);
      } else {
        await supabase.from('water_customer_profiles').insert({ ...profileData, created_at: new Date() });
      }

      const product = products.find(p => p.id === formData.product_id);
      const area = areas.find(a => a.id === formData.delivery_area_id);
      const price = product ? Number(product.price) : 0;
      const qty = Number(formData.quantity) || 1;
      const productTotal = price * qty;
      const deliveryCharge = area ? Number(area.delivery_charge) : 0;
      let floorCharge = 0;
      if (!formData.lift_available) {
        const floor = parseInt(formData.floor_number);
        if (!isNaN(floor)) {
          if (floor === 3 || floor === 4) floorCharge = 20;
          else if (floor === 5) floorCharge = 25;
          else if (floor === 6) floorCharge = 30;
        }
      }
      const grandTotal = productTotal + deliveryCharge + floorCharge;

      const fullAddress = `
${formData.customer_address}
${formData.customer_landmark ? `Landmark: ${formData.customer_landmark}` : ''}
${formData.customer_pincode ? `Pincode: ${formData.customer_pincode}` : ''}
`.trim();

      const payload = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_address: fullAddress,
        delivery_area_id: formData.delivery_area_id,
        product_id: formData.product_id,
        quantity: formData.quantity,
        total_price: grandTotal,
        delivery_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: formData.notes,
        lift_available: formData.lift_available,
        floor_number: formData.lift_available ? null : formData.floor_number,
        floor_charge: floorCharge,
        payment_method: formData.payment_method
      };

      const { error: orderError } = await supabase.from('water_orders').insert([payload]);
      if (orderError) throw orderError;

      toast({
        title: "Order Request Sent!",
        description: `Your order has been broadcasted to nearby suppliers.`,
        duration: 5000
      });

      setFormData(prev => ({
        ...prev,
        customer_phone: '',
        customer_name: '',
        customer_email: '',
        customer_address: '',
        customer_landmark: '',
        customer_pincode: '',
        delivery_area_id: '',
        product_id: products.length > 0 ? products[0].id : '',
        quantity: 1,
        lift_available: false,
        floor_number: '0',
        notes: '',
        payment_method: 'cash_on_delivery'
      }));
      setSearchMessage(null);
      setProfileFound(false);
    } catch (error) {
      console.error('Error placing order:', error);
      toast({ title: "Order Failed", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [formData, products, areas, toast]);

  const areaOptions = useMemo(() => areas.map(area => ({
    value: area.id,
    label: `${area.name} ${Number(area.delivery_charge) > 0 ? `(+₹${area.delivery_charge})` : ''}`
  })), [areas]);

  const selectedProduct = useMemo(() => products.find(p => p.id === formData.product_id), [products, formData.product_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Order Water | B2B Nexus</title>
      </Helmet>

      <ProductPickerModal 
        isOpen={isProductPickerOpen} 
        onClose={handleProductPickerClose} 
        products={products} 
        selectedProductId={formData.product_id} 
        onSelect={handleProductSelect} 
      />

      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg ring-4 ring-blue-50">
            <Droplets className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ShopoApp</h1>
          <p className="mt-2 text-lg text-slate-600 font-medium">Premium Water Delivery Platform</p>
        </div>

        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden ring-1 ring-slate-100">
          <div className="h-2 bg-gradient-to-r from-cyan-500 to-blue-600" />
          <CardHeader className="pb-4 bg-slate-50/50">
            <CardTitle className="text-xl text-slate-800">New Order Request</CardTitle>
            <CardDescription>Enter your mobile number to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="customer_phone" className="text-slate-700 font-bold">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="customer_phone" 
                    name="customer_phone" 
                    type="tel" 
                    placeholder="Enter 10-digit mobile number" 
                    className={`pl-9 h-11 text-lg font-medium tracking-wide focus:ring-cyan-500 ${searchMessage?.type === 'error' ? 'border-red-300' : profileFound ? 'border-green-300 bg-green-50/30' : ''}`} 
                    value={formData.customer_phone} 
                    onChange={handleInputChange} 
                    onBlur={handleMobileBlur}
                    required 
                    maxLength="10" 
                    autoComplete="tel" 
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
                    </div>
                  )}
                  {profileFound && !isSearching && (
                    <div className="absolute right-3 top-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                </div>
                
                {isSearching && (
                  <p className="text-sm text-cyan-600 flex items-center gap-2 animate-pulse">
                    <Search className="w-3 h-3" /> Searching profile...
                  </p>
                )}
                
                {!isSearching && searchMessage && (
                  <p className={`text-sm flex items-center gap-2 ${searchMessage.type === 'error' ? 'text-red-600' : searchMessage.type === 'success' ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
                    {searchMessage.text}
                  </p>
                )}
              </div>

              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="product_id" className="text-slate-700 font-semibold">Select Product</Label>
                  
                  <div onClick={openProductPicker} className="w-full min-h-[72px] px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group active:scale-[0.99]">
                    {selectedProduct ? (
                      <div className="flex items-center gap-3 w-full overflow-hidden">
                        <div className="h-12 w-12 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {selectedProduct.image_url ? (
                            <img src={selectedProduct.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Droplets className="h-6 w-6 text-slate-300" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-bold text-slate-900 leading-tight text-base truncate pr-2">{selectedProduct.name}</span>
                          <span className="text-sm font-bold text-blue-600">₹{selectedProduct.price}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Droplets className="h-5 w-5" />
                        <span className="font-medium">Choose a water can...</span>
                      </div>
                    )}
                    <div className="bg-slate-50 p-2 rounded-full group-hover:bg-blue-50 transition-colors shrink-0">
                      <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
                    </div>
                  </div>

                  {products.length === 0 && <p className="text-xs text-red-500">No products available.</p>}
                </div>

                <div className="flex gap-4">
                  <div className="w-1/2 space-y-2">
                    <Label htmlFor="quantity" className="font-medium text-slate-700">Quantity</Label>
                    <Input id="quantity" name="quantity" type="number" min="1" value={formData.quantity} onChange={handleInputChange} className="bg-white border-slate-200 focus:ring-cyan-500 h-12 text-lg font-semibold" required />
                  </div>
                  <div className="w-1/2 flex flex-col items-end justify-center pb-1 text-right bg-white rounded-lg border border-slate-100 px-3">
                    <span className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">Total</span>
                    <span className="text-2xl font-extrabold text-slate-800">₹ {totals.productTotal}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_area_id" className="font-medium text-slate-700">Service Area</Label>
                <SearchableSelect 
                  options={areaOptions} 
                  value={formData.delivery_area_id} 
                  onSelect={handleAreaSelect} 
                  placeholder="Select Delivery Area" 
                  searchPlaceholder="Search your area..." 
                  className="bg-white border-slate-200 focus:ring-cyan-500 h-12" 
                />
                <p className="text-xs text-slate-500">Select your area to find nearby sellers.</p>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-slate-700 font-semibold text-base">Payment Method</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div onClick={handleCashPaymentClick} className={`relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${formData.payment_method === 'cash_on_delivery' ? 'border-cyan-500 bg-cyan-50/50 shadow-sm ring-1 ring-cyan-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${formData.payment_method === 'cash_on_delivery' ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${formData.payment_method === 'cash_on_delivery' ? 'text-slate-900' : 'text-slate-700'}`}>Cash on Delivery</p>
                      <p className="text-xs text-slate-500">Pay directly to the delivery partner</p>
                    </div>
                    {formData.payment_method === 'cash_on_delivery' && (
                      <div className="absolute top-3 right-3 text-cyan-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="relative flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 opacity-70 cursor-not-allowed grayscale-[0.5]">
                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-500">Online Payment</p>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-300">Coming Soon</span>
                      </div>
                      <p className="text-xs text-slate-400">UPI, Cards, Netbanking</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input id="customer_name" name="customer_name" placeholder="Full Name" className="pl-9 focus:ring-cyan-500" value={formData.customer_name} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input id="customer_email" name="customer_email" type="email" placeholder="Email Address" className="pl-9 focus:ring-cyan-500" value={formData.customer_email} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="customer_address">Street Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Textarea id="customer_address" name="customer_address" placeholder="House/Flat No., Street, Building" className="pl-9 min-h-[80px] focus:ring-cyan-500" value={formData.customer_address} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_landmark">Landmark</Label>
                    <div className="relative">
                      <MapIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input id="customer_landmark" name="customer_landmark" placeholder="Near..." className="pl-9 focus:ring-cyan-500" value={formData.customer_landmark} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_pincode">Pincode</Label>
                    <Input id="customer_pincode" name="customer_pincode" placeholder="e.g. 400001" className="focus:ring-cyan-500" value={formData.customer_pincode} onChange={handleInputChange} maxLength="6" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="lift_available" 
                    checked={formData.lift_available} 
                    onCheckedChange={handleLiftChange}
                    className="mt-1" 
                  />
                  <div className="grid gap-1.5 leading-none w-full">
                    <Label htmlFor="lift_available" className="text-base font-semibold text-slate-800 flex items-center gap-2 cursor-pointer">
                      Lift Available <ArrowUp className="w-4 h-4 text-blue-500" />
                    </Label>
                    <p className="text-sm text-slate-500">
                      Check this if your building has a working lift. No extra floor charges apply.
                    </p>
                  </div>
                </div>

                {!formData.lift_available && (
                  <div className="pl-7 space-y-2">
                    <Label htmlFor="floor_number" className="text-slate-700 font-semibold flex items-center gap-2">
                      Floor Number <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Select value={formData.floor_number} onValueChange={handleFloorChange}>
                        <SelectTrigger className="pl-9 bg-white border-slate-200 h-11 focus:ring-cyan-500">
                          <SelectValue placeholder="Select Floor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Ground Floor</SelectItem>
                          <SelectItem value="1">1st Floor</SelectItem>
                          <SelectItem value="2">2nd Floor</SelectItem>
                          <SelectItem value="3">3rd Floor</SelectItem>
                          <SelectItem value="4">4th Floor</SelectItem>
                          <SelectItem value="5">5th Floor</SelectItem>
                          <SelectItem value="6">6th Floor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {parseInt(formData.floor_number) > 2 && (
                      <p className="text-xs text-orange-600 font-medium">
                        Note: Floor charges apply for 3rd floor and above without lift.
                        (3rd-4th: ₹20, 5th: ₹25, 6th: ₹30)
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Base Order Value</span>
                  <span>₹{totals.productTotal}</span>
                </div>
                {Number(totals.deliveryCharge) > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Delivery Fee</span>
                    <span>₹{totals.deliveryCharge}</span>
                  </div>
                )}
                {totals.floorCharge > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Floor Charge (No Lift)</span>
                    <span>₹{totals.floorCharge}</span>
                  </div>
                )}
                 
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Payment</span>
                  <span className="font-medium text-slate-800">{formData.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online'}</span>
                </div>

                <div className="flex justify-between text-xl font-bold text-slate-900 pt-3 border-t border-slate-200">
                  <span>Total Payable</span>
                  <span>₹{totals.grandTotal}</span>
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-blue-800 hover:to-blue-950 h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl mt-4" disabled={submitting || searchMessage?.type === 'error'}>
                {submitting ? <Loader2 className="animate-spin mr-2" /> : 'Request Order'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WaterOrderPage;