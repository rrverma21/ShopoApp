import React, { useState, useEffect, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { Trash2, Search, User, Building, AlertTriangle } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Card, CardContent } from '@/components/ui/card';
    import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/supabaseClient';
    import { formatPrice } from '@/lib/utils';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
    import { useAuth } from '@/contexts/SupabaseAuthContext';

    const PlaceOrderForm = ({ isOpen, onClose, onOrderPlaced }) => {
      const { user } = useAuth();
      const isSalesman = user?.profile?.role === 'salesman';
      const salesmanSellerId = user?.profile?.seller_id;

      const [clientType, setClientType] = useState('unregistered');
      const [selectedClient, setSelectedClient] = useState(null);
      const [clientSearch, setClientSearch] = useState('');
      const [clients, setClients] = useState([]);
      const [filteredClients, setFilteredClients] = useState([]);

      const [unregisteredClientDetails, setUnregisteredClientDetails] = useState({
        business_name: '',
        contact_person: '',
        phone: '',
        street_address: '',
        city: '',
        pincode: '',
      });
      const [unregisteredClients, setUnregisteredClients] = useState([]);
      const [unregisteredClientSearch, setUnregisteredClientSearch] = useState('');
      const [filteredUnregisteredClients, setFilteredUnregisteredClients] = useState([]);


      const [orderItems, setOrderItems] = useState([]);
      const [products, setProducts] = useState([]);
      const [productSearch, setProductSearch] = useState('');
      const [filteredProducts, setFilteredProducts] = useState([]);
      const [subtotal, setSubtotal] = useState(0);
      const [totalAmount, setTotalAmount] = useState(0);
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [sellerId, setSellerId] = useState(isSalesman ? salesmanSellerId : null);
      const [sellerProfile, setSellerProfile] = useState(null);
      const { toast } = useToast();

      const fetchProducts = useCallback(async () => {
        let query = supabase.from('products').select('id, name, pricing_tiers, stock, seller_id, price').order('name');
        if (isSalesman && salesmanSellerId) {
          query = query.eq('seller_id', salesmanSellerId);
        }
        const { data, error } = await query;
        if (error) toast({ title: "Error fetching products", description: error.message, variant: "destructive" });
        else setProducts(data);
      }, [toast, isSalesman, salesmanSellerId]);

      const fetchClients = useCallback(async () => {
        const { data, error } = await supabase.rpc('get_all_clients');
        if (error) toast({ title: "Error fetching clients", description: error.message, variant: "destructive" });
        else setClients(data || []);
      }, [toast]);
      
      const fetchUnregisteredClients = useCallback(async () => {
        const { data, error } = await supabase.rpc('get_unregistered_clients');
        if (error) {
            toast({ title: "Error fetching past clients", description: error.message, variant: "destructive" });
        } else {
            setUnregisteredClients(data.map(c => c.shipping_address) || []);
        }
      }, [toast]);


      useEffect(() => {
        if (isOpen) {
          fetchProducts();
          fetchClients();
          fetchUnregisteredClients();
        }
      }, [isOpen, fetchProducts, fetchClients, fetchUnregisteredClients]);

      useEffect(() => {
        let prods = products;
        if (sellerId) {
          prods = products.filter(p => p.seller_id === sellerId);
        }
        setFilteredProducts(prods.filter(p => 
          p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
          !orderItems.some(item => item.product_id === p.id)
        ));
      }, [productSearch, products, orderItems, sellerId]);
      
      useEffect(() => {
        setFilteredClients(clients.filter(c => 
          c.business_name.toLowerCase().includes(clientSearch.toLowerCase())
        ));
      }, [clientSearch, clients]);
      
      useEffect(() => {
        if (!unregisteredClientSearch) {
          setFilteredUnregisteredClients([]);
          return;
        }
        setFilteredUnregisteredClients(unregisteredClients.filter(c =>
            (c.businessName && c.businessName.toLowerCase().includes(unregisteredClientSearch.toLowerCase())) ||
            (c.phone && c.phone.includes(unregisteredClientSearch))
        ));
      }, [unregisteredClientSearch, unregisteredClients]);

      useEffect(() => {
        const newSubtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setSubtotal(newSubtotal);
        const shipping = sellerProfile?.shipping_charge || 0;
        setTotalAmount(newSubtotal + shipping);
      }, [orderItems, sellerProfile]);

      useEffect(() => {
        const fetchSellerProfile = async () => {
          if (sellerId) {
            const { data, error } = await supabase
              .from('profiles')
              .select('min_purchase_amount, serviceable_pincodes, shipping_charge')
              .eq('id', sellerId)
              .single();
            if (error) console.error("Error fetching seller profile:", error);
            else setSellerProfile(data);
          } else {
            setSellerProfile(null);
          }
        };
        fetchSellerProfile();
      }, [sellerId]);

      const handleUnregisteredClientChange = (e) => {
        const { id, value } = e.target;
        setUnregisteredClientDetails(prev => ({ ...prev, [id]: value }));
      };
      
      const handleSelectUnregisteredClient = (client) => {
        setUnregisteredClientDetails({
            business_name: client.businessName || '',
            contact_person: client.contactPerson || '',
            phone: client.phone || '',
            street_address: client.streetAddress || '',
            city: client.city || '',
            pincode: client.pincode || '',
        });
        setUnregisteredClientSearch('');
      };

      const handleAddItem = (product) => {
        if (!sellerId) {
          setSellerId(product.seller_id);
        } else if (sellerId !== product.seller_id) {
          toast({ title: "Multi-seller cart not supported", description: "You can only add products from one seller at a time in this order.", variant: "destructive" });
          return;
        }
        setOrderItems(prev => [...prev, { product_id: product.id, name: product.name, quantity: 1, price: product.price, stock: product.stock }]);
        setProductSearch('');
      };

      const handleQuantityChange = (productId, quantity) => {
        setOrderItems(prev => prev.map(item =>
          item.product_id === productId ? { ...item, quantity: Math.max(1, Number(quantity)) } : item
        ));
      };

      const handleRemoveItem = (productId) => {
        const newItems = orderItems.filter(item => item.product_id !== productId);
        setOrderItems(newItems);
        if (newItems.length === 0 && !isSalesman) {
          setSellerId(null);
        }
      };

      const handleSelectClient = (client) => {
        setSelectedClient(client);
        setClientSearch('');
        setClientType('registered');
      };
      
      const resetForm = useCallback(() => {
        setClientType('unregistered');
        setSelectedClient(null);
        setClientSearch('');
        setUnregisteredClientDetails({ business_name: '', contact_person: '', phone: '', street_address: '', city: '', pincode: '' });
        setUnregisteredClientSearch('');
        setOrderItems([]);
        setProductSearch('');
        setSubtotal(0);
        setTotalAmount(0);
        if (!isSalesman) {
          setSellerId(null);
          setSellerProfile(null);
        }
      }, [isSalesman]);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (orderItems.length === 0) {
          toast({ title: "Empty Order", description: "Please add at least one product.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }

        if (sellerProfile && sellerProfile.min_purchase_amount > 0 && subtotal < sellerProfile.min_purchase_amount) {
          toast({
            title: "Minimum Order Amount Not Met",
            description: `The minimum order amount for this seller is ${formatPrice(sellerProfile.min_purchase_amount)}.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        let userId = null;
        let shippingDetails = null;
        let clientPincode = null;

        if (clientType === 'registered') {
          if (!selectedClient) {
            toast({ title: "No Client Selected", description: "Please select a registered client.", variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
          userId = selectedClient.id;
          clientPincode = selectedClient.pincode;
        } else {
          const requiredFields = ['business_name', 'street_address', 'city', 'pincode', 'phone'];
          const missingField = requiredFields.find(field => !unregisteredClientDetails[field]);
          if (missingField) {
            toast({ title: "Missing Information", description: `Please fill in the ${missingField.replace('_', ' ')}.`, variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
          shippingDetails = unregisteredClientDetails;
          clientPincode = unregisteredClientDetails.pincode;
        }

        if (sellerProfile?.serviceable_pincodes?.length > 0 && !sellerProfile.serviceable_pincodes.includes(clientPincode)) {
            toast({
                title: "Not Serviceable",
                description: `This seller does not deliver to the client's pincode (${clientPincode}).`,
                variant: "destructive",
            });
            setIsSubmitting(false);
            return;
        }

        const itemsForDb = orderItems.map(({ product_id, quantity, price }) => ({ product_id, quantity, price }));
        const shippingCharge = sellerProfile?.shipping_charge || 0;

        try {
          const { error } = await supabase.rpc('create_order_as_admin', {
            p_user_id: userId,
            p_shipping_address: shippingDetails,
            p_total_amount: totalAmount,
            p_order_items: itemsForDb,
            p_seller_id: sellerId,
            p_shipping_charge: shippingCharge
          });

          if (error) throw error;

          toast({ title: "Order Placed!", description: `The order has been created successfully.` });
          resetForm();
          onOrderPlaced();
        } catch (error) {
          toast({ title: "Order Creation Failed", description: error.message, variant: "destructive" });
        } finally {
          setIsSubmitting(false);
        }
      };
      
      useEffect(() => {
        if(!isOpen) {
          setTimeout(resetForm, 300);
        }
      }, [isOpen, resetForm]);

      if (!isOpen) return null;

      const minPurchaseAmount = sellerProfile?.min_purchase_amount || 0;
      const isMinAmountMet = subtotal >= minPurchaseAmount;
      
      let clientPincodeForCheck = null;
      if (clientType === 'registered' && selectedClient) {
        clientPincodeForCheck = selectedClient.pincode;
      } else if (clientType === 'unregistered') {
        clientPincodeForCheck = unregisteredClientDetails.pincode;
      }

      const isServiceable = !sellerProfile?.serviceable_pincodes?.length || !clientPincodeForCheck || sellerProfile.serviceable_pincodes.includes(clientPincodeForCheck);
      const shippingCharge = sellerProfile?.shipping_charge || 0;

      return (
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col glass-effect">
          <DialogHeader>
            <DialogTitle className="gradient-text text-2xl">Place New Order</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-1 pr-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Client Details</h3>
              <Tabs value={clientType} onValueValueChange={setClientType} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="unregistered" onClick={() => setClientType('unregistered')}><Building className="mr-2 h-4 w-4"/>Unregistered</TabsTrigger>
                  <TabsTrigger value="registered" onClick={() => setClientType('registered')}><User className="mr-2 h-4 w-4"/>Registered</TabsTrigger>
                </TabsList>
                <TabsContent value="unregistered" className="space-y-4 pt-4">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                          placeholder="Search past unregistered clients..." 
                          value={unregisteredClientSearch} 
                          onChange={(e) => setUnregisteredClientSearch(e.target.value)} 
                          className="pl-10"
                      />
                      {unregisteredClientSearch && (
                          <Card className="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto">
                              <CardContent className="p-2">
                                  {filteredUnregisteredClients.length > 0 ? filteredUnregisteredClients.map((c, index) => (
                                      <div key={index} onClick={() => handleSelectUnregisteredClient(c)} className="p-2 hover:bg-slate-100 rounded-md cursor-pointer">
                                          <p className="font-semibold">{c.businessName}</p>
                                          <p className="text-sm text-slate-500">{c.phone}</p>
                                      </div>
                                  )) : <p className="p-2 text-sm text-slate-500">No past clients found.</p>}
                              </CardContent>
                          </Card>
                      )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="business_name">Business Name</Label>
                      <Input id="business_name" value={unregisteredClientDetails.business_name} onChange={handleUnregisteredClientChange} />
                    </div>
                    <div>
                      <Label htmlFor="contact_person">Contact Person (Optional)</Label>
                      <Input id="contact_person" value={unregisteredClientDetails.contact_person} onChange={handleUnregisteredClientChange} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={unregisteredClientDetails.phone} onChange={handleUnregisteredClientChange} />
                  </div>
                  <div>
                    <Label htmlFor="street_address">Street Address</Label>
                    <Input id="street_address" value={unregisteredClientDetails.street_address} onChange={handleUnregisteredClientChange} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={unregisteredClientDetails.city} onChange={handleUnregisteredClientChange} />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input id="pincode" value={unregisteredClientDetails.pincode} onChange={handleUnregisteredClientChange} />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="registered" className="pt-4">
                  {selectedClient ? (
                     <Card>
                        <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">{selectedClient.business_name}</p>
                                    <p className="text-sm text-slate-500">{selectedClient.contact_person}</p>
                                </div>
                                <Button variant="link" size="sm" onClick={() => setSelectedClient(null)}>Change</Button>
                            </div>
                            <p className="text-sm">{selectedClient.street_address}, {selectedClient.city}, {selectedClient.pincode}</p>
                            <p className="text-sm">{selectedClient.email}</p>
                            <p className="text-sm">{selectedClient.phone}</p>
                        </CardContent>
                    </Card>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input placeholder="Search for a registered client..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-10"/>
                      {clientSearch && (
                        <Card className="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto">
                          <CardContent className="p-2">
                            {filteredClients.length > 0 ? filteredClients.map(c => (
                              <div key={c.id} onClick={() => handleSelectClient(c)} className="p-2 hover:bg-slate-100 rounded-md cursor-pointer">
                                <p className="font-semibold">{c.business_name}</p>
                                <p className="text-sm text-slate-500">{c.email}</p>
                              </div>
                            )) : <p className="p-2 text-sm text-slate-500">No clients found.</p>}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="space-y-4 flex flex-col">
               <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Order Items</h3>
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input 
                    placeholder="Search products to add..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                  {productSearch && (
                    <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto">
                      <CardContent className="p-2">
                        {filteredProducts.length > 0 ? filteredProducts.map(p => (
                          <div key={p.id} onClick={() => handleAddItem(p)} className="p-2 hover:bg-slate-100 rounded-md cursor-pointer flex justify-between">
                            <span>{p.name}</span>
                            <span className="text-slate-500">{formatPrice(p.price)}</span>
                          </div>
                        )) : <p className="p-2 text-sm text-slate-500">No products found.</p>}
                      </CardContent>
                    </Card>
                  )}
               </div>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
                {orderItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <p>No products added yet.</p>
                  </div>
                ) : orderItems.map(item => (
                  <motion.div key={item.product_id} layout className="flex items-center gap-4 p-2 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-slate-600">{formatPrice(item.price)}</p>
                    </div>
                    <Input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.product_id, e.target.value)}
                      min="1"
                      className="w-20 text-center"
                    />
                    <p className="w-24 text-right font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.product_id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </form>

          <DialogFooter className="pt-4 border-t mt-auto">
            <div className="w-full flex flex-col gap-4">
              <div className="space-y-2">
                {!isServiceable && clientPincodeForCheck && (
                    <div className="p-3 rounded-md flex items-start gap-3 text-sm bg-red-100 text-red-800">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>Seller does not service pincode {clientPincodeForCheck}.</div>
                    </div>
                )}
                {minPurchaseAmount > 0 && (
                  <div className={`p-3 rounded-md flex items-start gap-3 text-sm ${isMinAmountMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      {isMinAmountMet ? (
                        <span>Minimum order amount of {formatPrice(minPurchaseAmount)} is met.</span>
                      ) : (
                        <span>Minimum order amount is {formatPrice(minPurchaseAmount)}. You need to add {formatPrice(minPurchaseAmount - subtotal)} more to proceed.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-full flex justify-between items-center">
                <div className="text-right">
                    <div className="text-sm text-slate-500">Subtotal: {formatPrice(subtotal)}</div>
                    <div className="text-sm text-slate-500">Shipping: {formatPrice(shippingCharge)}</div>
                    <div className="text-lg font-bold">Total: {formatPrice(totalAmount)}</div>
                </div>
                <div>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" onClick={handleSubmit} disabled={isSubmitting || !isMinAmountMet || !isServiceable} className="ml-2 btn-primary">
                    {isSubmitting ? 'Placing Order...' : 'Place Order'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      );
    };

    export default PlaceOrderForm;