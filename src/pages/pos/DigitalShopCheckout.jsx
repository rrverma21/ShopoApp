import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  ChevronLeft, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  CreditCard, 
  Truck, 
  Gift, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  User,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const DigitalShopCheckout = () => {
  const { retailerId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shop, setShop] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: user?.profile?.contact_person || user?.profile?.business_name || '',
    phone: user?.profile?.phone || '',
    address: user?.profile?.street_address || '',
    city: user?.profile?.city || '',
    pincode: user?.profile?.pincode || '',
    notes: '',
    paymentMethod: 'COD',
    giftWrapping: false
  });

  const cart = state?.cart || {};
  const products = state?.products || [];
  
  const cartItems = products.filter(p => cart[p.id]).map(p => ({
    ...p,
    quantity: cart[p.id]
  }));

  const subtotal = cartItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  const giftWrappingCharge = formData.giftWrapping ? 50 : 0;
  const deliveryCharge = subtotal > 500 ? 0 : 40;
  const total = subtotal + giftWrappingCharge + deliveryCharge;

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate(`/shop/${retailerId}`);
      return;
    }
    fetchShopInfo();
  }, [retailerId]);

  const fetchShopInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, street_address, city')
        .eq('id', retailerId)
        .single();
      if (error) throw error;
      setShop(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required delivery details.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        retailer_id: retailerId,
        customer_id: user?.id || null,
        customer_phone: formData.phone,
        order_items: cartItems.map(item => ({
          product_id: item.id,
          name: item.name,
          price: item.selling_price,
          quantity: item.quantity,
          image_url: item.image_url
        })),
        total_amount: total,
        payment_method: formData.paymentMethod,
        status: 'Pending',
        payment_status: 'Unpaid',
        is_moved_to_sales: false,
        gift_wrapping: formData.giftWrapping,
        gift_wrapping_cost: giftWrappingCharge,
        shipping_address: {
          name: formData.name,
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          notes: formData.notes
        }
      };

      const { data, error } = await supabase
        .from('digital_shop_orders')
        .insert(orderPayload)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Order Placed Successfully!",
        description: `Your order for ${total.toFixed(2)} has been sent to the shop.`,
      });

      navigate(`/order-confirmation/${data.id}`);
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: "Order Failed",
        description: error.message || "Something went wrong while placing your order.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 pb-20 pt-6 overflow-y-auto">
      <Helmet>
        <title>Checkout | {shop?.business_name || 'Shop'}</title>
      </Helmet>

      <div className="container mx-auto px-4 sm:px-6 md:px-8 w-full max-w-6xl">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate(`/shop/${retailerId}`)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Store
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* Main Checkout Form */}
          <div className="lg:col-span-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-white/50 dark:bg-slate-900/50">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" /> Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <form id="checkout-form" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input 
                        id="name" 
                        name="name"
                        placeholder="John Doe" 
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input 
                        id="phone" 
                        name="phone"
                        placeholder="10-digit mobile" 
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="address">Full Address *</Label>
                      <Textarea 
                        id="address" 
                        name="address"
                        placeholder="House no, Building, Street, Area..." 
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={3}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input 
                        id="city" 
                        name="city"
                        placeholder="Your City" 
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input 
                        id="pincode" 
                        name="pincode"
                        placeholder="6-digit PIN" 
                        value={formData.pincode}
                        onChange={handleInputChange}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                      <Input 
                        id="notes" 
                        name="notes"
                        placeholder="Special instructions for delivery..." 
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-white/50 dark:bg-slate-900/50">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" /> Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <RadioGroup 
                    defaultValue="COD" 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, paymentMethod: val }))}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <Label
                      htmlFor="cod"
                      className={`flex flex-col items-start justify-between rounded-xl border-2 p-4 cursor-pointer hover:bg-slate-50 transition-all ${formData.paymentMethod === 'COD' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="COD" id="cod" />
                        <div>
                          <p className="font-bold">Cash on Delivery</p>
                          <p className="text-xs text-slate-500">Pay when you receive the items</p>
                        </div>
                      </div>
                    </Label>

                    <Label
                      htmlFor="online"
                      className="flex flex-col items-start justify-between rounded-xl border-2 border-slate-100 p-4 opacity-50 cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="ONLINE" id="online" disabled />
                        <div>
                          <p className="font-bold">Online Payment</p>
                          <p className="text-xs text-slate-500">Temporarily unavailable for this shop</p>
                        </div>
                      </div>
                    </Label>
                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 sm:p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-orange-100 dark:bg-orange-800/30 rounded-full flex shrink-0 items-center justify-center text-orange-600">
                        <Gift className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">Make it a Gift?</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Add premium wrapping for just ₹50</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pl-2">
                      <Label htmlFor="gift-wrap" className="sr-only">Gift Wrap</Label>
                      <input 
                        type="checkbox" 
                        id="gift-wrap" 
                        name="giftWrapping"
                        checked={formData.giftWrapping}
                        onChange={handleInputChange}
                        className="h-6 w-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-0 shadow-lg lg:sticky lg:top-24">
              <CardHeader className="border-b">
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto p-4 sm:p-6 space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="h-12 w-12 rounded bg-slate-100 shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} className="h-full w-full object-cover" alt={item.name} />
                        ) : (
                          <ShoppingBag className="h-full w-full p-3 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity} × ₹{item.selling_price}</p>
                      </div>
                      <div className="text-sm font-bold shrink-0">
                        ₹{(item.selling_price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="p-4 sm:p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Items Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Delivery Fee</span>
                    <span className={deliveryCharge === 0 ? "text-green-600 font-medium" : ""}>
                      {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                    </span>
                  </div>
                  {formData.giftWrapping && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Gift Wrapping</span>
                      <span>₹{giftWrappingCharge.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 pt-0">
                <Button 
                  className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      Place Order <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Secure Checkout:</strong> Your information is protected and sent directly to the verified seller.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-blue-600 shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Fast Delivery:</strong> Local sellers usually deliver within 24-48 hours in your area.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalShopCheckout;