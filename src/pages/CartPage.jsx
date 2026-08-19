import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trash2, Plus, Minus, ArrowRight, Store, FileText, AlertCircle, Tag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatPrice } from '@/lib/utils';

const CartPage = () => {
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    getCartSubtotalOriginal,
    getTotalItemDiscountAmount,
    getCartNetSubtotal,
    calculateItemDiscountAmount,
    calculateItemPrice
  } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  // Group items by seller
  const sellerId = cartItems.length > 0 ? cartItems[0].seller_id : null;
  const sellerName = cartItems.length > 0 ? cartItems[0].seller?.business_name || 'Wholesaler' : null;

  const handlePlaceRequest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      toast({ title: "Empty List", description: "Your request list is empty.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Fetch user profile for shipping address
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (!profile?.street_address) {
        toast({ title: "Incomplete Profile", description: "Please complete your profile address before sending a request.", variant: "destructive" });
        navigate('/profile');
        return;
      }

      const shippingAddress = {
        business_name: profile.business_name,
        contact_person: profile.contact_person,
        phone: profile.phone,
        street_address: profile.street_address,
        city: profile.city,
        pincode: profile.pincode
      };

      // Create Order Record (Status: Pending, Payment: Unpaid/COD)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          seller_id: sellerId,
          total_amount: getCartNetSubtotal(),
          discount_amount: getTotalItemDiscountAmount(),
          status: 'Pending',
          payment_status: 'Unpaid', // COD
          shipping_address: shippingAddress,
          created_by: user.id,
          // Using notes field for custom message
          coupon_code: notes ? `Note: ${notes}` : null 
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert Order Items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: calculateItemPrice(item) // Store the final discounted price per unit
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Success
      toast({ 
        title: "Request Sent Successfully!", 
        description: "The wholesaler has received your order request. You will pay via COD upon delivery." 
      });
      clearCart();
      navigate('/orders');

    } catch (error) {
      console.error('Order error:', error);
      toast({ title: "Request Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const subtotalOriginal = getCartSubtotalOriginal();
  const totalDiscount = getTotalItemDiscountAmount();
  const finalAmount = getCartNetSubtotal();

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Helmet><title>Order Requests - ShopoApp</title></Helmet>
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Requests Pending</h2>
          <p className="text-slate-600 mb-8">Your request list is empty. Browse the wholesale market to find products.</p>
          <Button onClick={() => navigate('/products')} className="bg-blue-600 hover:bg-blue-700 text-white">
            Browse Wholesale Market
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <Helmet>
        <title>Review Request - ShopoApp</title>
      </Helmet>

      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" /> Review Order Request
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Wholesaler Info */}
            <Card>
              <CardHeader className="bg-slate-100 border-b border-slate-200 py-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Store className="w-5 h-5" />
                  <span className="font-semibold">Request to: {sellerName}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {cartItems.map((item) => {
                  const originalPrice = item.selling_price || item.price || 0;
                  const unitDiscount = calculateItemDiscountAmount(item);
                  const finalUnitPrice = calculateItemPrice(item);
                  
                  const rowOriginalTotal = originalPrice * item.quantity;
                  const rowDiscountTotal = unitDiscount * item.quantity;
                  const rowFinalTotal = finalUnitPrice * item.quantity;
                  
                  const isOfferExpired = item.offer_validity && new Date(item.offer_validity) < new Date();

                  return (
                    <div key={item.cartItemId || item.id} className="flex gap-4 p-6 border-b border-slate-100 last:border-0">
                      <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-400 text-xs">No Img</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h3 className="font-semibold text-slate-900">{item.name}</h3>
                            <p className="text-sm text-slate-500">{item.variant_name ? `Variant: ${item.variant_name}` : `Unit: ${item.unit}`}</p>
                          </div>
                          <div className="text-right">
                            {rowDiscountTotal > 0 ? (
                              <>
                                <p className="font-bold text-slate-900">{formatPrice(rowFinalTotal)}</p>
                                <p className="text-xs text-slate-400 line-through">{formatPrice(rowOriginalTotal)}</p>
                                <p className="text-xs text-green-600 font-medium">Saved {formatPrice(rowDiscountTotal)}</p>
                              </>
                            ) : (
                              <p className="font-bold text-slate-900">{formatPrice(rowOriginalTotal)}</p>
                            )}
                          </div>
                        </div>
                        
                        {item.offer_name && !isOfferExpired && unitDiscount > 0 && (
                          <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs mb-3 border border-green-200">
                            <Tag className="w-3 h-3" />
                            {item.offer_name} ({item.offer_percentage > 0 ? `${item.offer_percentage}% OFF` : `₹${item.offer_amount} OFF`})
                          </div>
                        )}
                        {isOfferExpired && item.offer_name && (
                          <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs mb-3 border border-slate-200">
                            Offer Expired
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-slate-300 rounded-md">
                            <button 
                              className="p-1 hover:bg-slate-100"
                              onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4 text-slate-600" />
                            </button>
                            <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                            <button 
                              className="p-1 hover:bg-slate-100"
                              onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.cartItemId || item.id)}
                            className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-800 text-sm">Payment Information</h4>
                <p className="text-blue-700 text-sm mt-1">
                  You are sending a request to the wholesaler. <strong>Payment will be collected via Cash on Delivery (COD)</strong> when the goods are delivered to your shop.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-lg border-t-4 border-t-blue-600">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal (MRP)</span>
                  <span>{formatPrice(subtotalOriginal)}</span>
                </div>
                
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Total Discount</span>
                    <span>-{formatPrice(totalDiscount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-base font-bold pt-4 border-t border-slate-100">
                  <span>Final Amount</span>
                  <span className="text-blue-600">{formatPrice(finalAmount)}</span>
                </div>
                
                <div className="pt-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Add Note to Wholesaler (Optional)</label>
                  <Input 
                    placeholder="e.g., Please deliver before 5 PM" 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-sm text-slate-900 placeholder:text-slate-400 bg-white"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button 
                  onClick={handlePlaceRequest} 
                  disabled={loading}
                  className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  {loading ? 'Sending Request...' : 'Send Request to Wholesaler'} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <p className="text-xs text-center text-slate-500">
                  By sending this request, you agree to pay via COD upon delivery.
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;