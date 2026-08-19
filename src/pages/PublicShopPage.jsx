import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Search, ShoppingCart, Plus, Minus, X, Trash2, RotateCw, PackageOpen, Eye, Store, CreditCard, Truck, ShoppingBag, LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet-async';

const MobileProductCard = ({ product, onQuickView, onAdd }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col h-full touch-manipulation hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden group">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
            <PackageOpen className="w-12 h-12 opacity-50" />
          </div>
        )}
        
        <button
          onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-sm z-10"
          aria-label="Quick view"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Always show stock status if low, otherwise accessible in details */}
        {product.stock_level < 5 && (
           <div className="absolute bottom-2 left-2 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
             Only {product.stock_level} left
           </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex-1 min-w-0 mb-1">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 h-10">
            {product.name}
          </h3>
        </div>
        
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
           <span className="truncate max-w-[50%]">{product.category || 'General'}</span>
           <span className={product.stock_level > 0 ? "text-emerald-600 font-medium" : "text-red-500"}>
              {product.stock_level} in stock
           </span>
        </div>

        <div className="flex items-end justify-between gap-2 mb-3">
             <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                {formatPrice(product.selling_price)}
             </div>
        </div>

        <Button 
            onClick={() => onAdd(product)} 
            disabled={product.stock_level <= 0}
            className="w-full h-10 rounded-xl btn-primary font-semibold shadow-blue-500/20 shadow-md active:scale-95 transition-all touch-manipulation text-sm"
        >
            {product.stock_level > 0 ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </div>
    </div>
  );
};

const ProductQuickViewSheet = ({ product, open, onClose, onAdd }) => {
  return (
    <AnimatePresence>
      {open && product && (
        <>
           <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={onClose} 
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" 
           />
           <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              transition={{ type: 'spring', stiffness: 300, damping: 30 }} 
              className="fixed inset-x-0 bottom-0 z-[51] bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
           >
             <div className="p-5 overflow-y-auto">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" />
                
                <div className="flex gap-4 mb-6">
                   <div className="w-28 h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                      {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} /> : <div className="w-full h-full flex items-center justify-center"><PackageOpen className="opacity-20 w-8 h-8"/></div>}
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="font-bold text-lg leading-tight mb-1">{product.name}</h3>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatPrice(product.selling_price)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={product.stock_level > 0 ? "success" : "destructive"} className={product.stock_level > 0 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : ""}>
                            {product.stock_level > 0 ? `In Stock: ${product.stock_level}` : 'Out of Stock'}
                        </Badge>
                      </div>
                   </div>
                </div>

                <div className="space-y-4 mb-20">
                   <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-wider">Description</h4>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {product.description || 'No detailed description available for this product.'}
                      </p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                         <span className="text-xs text-muted-foreground block mb-1">Category</span>
                         <span className="font-medium text-sm">{product.category || 'Uncategorized'}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                         <span className="text-xs text-muted-foreground block mb-1">SKU</span>
                         <span className="font-medium text-sm font-mono">{product.sku || '-'}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="absolute bottom-0 inset-x-0 p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <Button variant="outline" onClick={onClose} className="h-14 flex-1 rounded-xl text-base">Close</Button>
                <Button 
                    onClick={() => { onAdd(product); onClose(); }} 
                    disabled={product.stock_level <= 0}
                    className="h-14 flex-[2] rounded-xl btn-primary text-base font-bold shadow-lg shadow-blue-500/20"
                >
                   {product.stock_level > 0 ? 'Add to Cart' : 'Out of Stock'}
                </Button>
             </div>
           </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const CartDrawer = ({ open, onClose, cart, updateQuantity, removeItem, total, onCheckout }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }} 
            transition={{ type: 'spring', stiffness: 300, damping: 30 }} 
            className="fixed inset-x-0 bottom-0 z-[51] h-[85vh] bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                   <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                   <h3 className="font-bold text-lg">Your Cart</h3>
                   <p className="text-xs text-muted-foreground">{cart.length} items selected</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10 bg-slate-100 dark:bg-slate-800"><X className="w-5 h-5" /></Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-60">
                  <ShoppingCart className="w-16 h-16" />
                  <p className="text-lg font-medium">Your cart is empty</p>
                  <Button variant="outline" onClick={onClose}>Start Shopping</Button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex gap-3">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0">
                      {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" alt={item.name}/> : <PackageOpen className="w-full h-full p-5 opacity-20"/>}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div className="flex justify-between items-start gap-2">
                         <h4 className="font-semibold text-sm line-clamp-2">{item.name}</h4>
                         <button onClick={() => removeItem(item.id)} className="text-red-500 p-1 -mr-2 -mt-2 h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      
                      <div className="flex items-end justify-between">
                         <div className="font-bold text-blue-600 dark:text-blue-400">{formatPrice(item.selling_price)}</div>
                         
                         <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded shadow-sm active:scale-90 transition-transform"><Minus className="w-3 h-3"/></button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded shadow-sm active:scale-90 transition-transform"><Plus className="w-3 h-3"/></button>
                         </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatPrice(total)}</span>
                </div>
                <Button className="w-full h-14 rounded-xl btn-primary text-lg font-bold shadow-lg shadow-blue-500/20" onClick={onCheckout}>
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const PublicShopPage = () => {
  const { retailerId } = useParams();
  const { user: currentUser, signIn } = useAuth(); 
  const { toast } = useToast();
  const navigate = useNavigate();

  const [shopProfile, setShopProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState(null);
  
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shippingMethod, setShippingMethod] = useState('pickup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');

  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Debounce search
  useEffect(() => { 
    const t = setTimeout(() => setDebounced(query.trim()), 300); 
    return () => clearTimeout(t); 
  }, [query]);

  // 1. Fetch Shop Profile
  useEffect(() => {
    const fetchProfile = async () => {
        if (!retailerId) return;
        setLoadingProfile(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, business_name, avatar_url, role, city, is_disabled')
                .eq('id', retailerId)
                .single();
            
            if (error) throw error;
            if (!data || data.is_disabled) {
                toast({ title: 'Shop Unavailable', description: 'This shop is currently not available.', variant: 'destructive' });
                navigate('/local-shops');
                return;
            }
            setShopProfile(data);
        } catch (err) {
            console.error('Error fetching shop profile:', err);
            toast({ title: 'Error', description: 'Could not load shop details.', variant: 'destructive' });
        } finally {
            setLoadingProfile(false);
        }
    };
    fetchProfile();
  }, [retailerId, navigate, toast]);

  // 2. Fetch Products for this Retailer
  useEffect(() => {
    const fetchProducts = async () => {
        if (!retailerId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('point_of_sale_products')
                .select('*')
                .eq('user_id', retailerId)
                .gt('stock_level', 0) // Excluding 0 inventory as requested
                .eq('archived', false)
                .order('created_at', { ascending: false });
            
            if (error) throw error;

            const formatted = (data || []).map(p => ({ ...p, is_featured: p.is_featured || false }));
            setProducts(formatted);
            setFilteredProducts(formatted);
        } catch (err) {
            console.error('Error fetching products:', err);
            toast({ title: 'Error', description: 'Failed to load products.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    fetchProducts();
  }, [retailerId, toast]);

  // 3. Filter & Sort Logic
  useEffect(() => {
    if (!products.length) return;
    let result = [...products];

    if (debounced) {
        const lower = debounced.toLowerCase();
        result = result.filter(p => 
            (p.name && p.name.toLowerCase().includes(lower)) ||
            (p.category && p.category.toLowerCase().includes(lower))
        );
    }

    switch(sortBy) {
      case 'price_asc': result.sort((a,b)=>a.selling_price-b.selling_price); break;
      case 'price_desc': result.sort((a,b)=>b.selling_price-a.selling_price); break;
      case 'name': result.sort((a,b)=>a.name.localeCompare(b.name)); break;
      default: result.sort((a,b)=> (b.is_featured===a.is_featured)?0: b.is_featured?1:-1);
    }
    setFilteredProducts(result);
  }, [debounced, sortBy, products]);

  // Cart Operations
  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i=>i.id===product.id);
      if (ex) {
        if (ex.quantity >= product.stock_level) { 
            toast({ title:'Stock Limit', description: `Only ${product.stock_level} items available in stock.`, variant: 'destructive' }); 
            return prev; 
        }
        return prev.map(i=> i.id===product.id ? { ...i, quantity: i.quantity+1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast({ title: 'Added to Cart', description: product.name, duration: 1000 });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i=>i.id!==id));
  
  const updateQuantity = (id, delta) => setCart(prev => prev.map(i=> {
    if (i.id!==id) return i;
    const n = i.quantity + delta;
    if (n < 1) return i;
    if (n > i.stock_level) { toast({ title:'Stock Limit', description: `Only ${i.stock_level} items available.`, variant:'destructive' }); return i; }
    return { ...i, quantity: n };
  }));

  const cartTotal = useMemo(() => cart.reduce((acc,i)=> acc + i.selling_price * i.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((acc,i)=> acc + i.quantity, 0), [cart]);

  // Auth Logic
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      if (authMode === 'login') {
        const { error } = await signIn(authEmail, authPassword);
        if (error) throw error;
        toast({ title: 'Welcome back!', description: 'Logged in successfully.' });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
             data: { 
                 role: 'client', // New signups here are strictly customers
                 business_name: authEmail.split('@')[0], // Fallback name
                 role_display: 'Customer'
             }
          }
        });
        if (error) throw error;
        toast({ title: 'Account created!', description: 'Please check your email to verify.' });
      }
    } catch (err) {
      toast({ title: 'Authentication failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Checkout Logic
  const checkout = async () => {
    if (cart.length === 0) return;
    if (!currentUser?.profile?.id) {
        toast({ title: 'Sign In Required', description: 'Please log in to place an order.', variant: 'destructive' });
        return;
    }
    
    setIsProcessing(true);
    try {
      // Use the customer's profile ID directly
      const customerId = currentUser.profile.id;

      // Create Sale with status
      const saleData = { 
        user_id: retailerId,
        customer_id: customerId,
        subtotal: cartTotal, 
        tax_amount: 0, 
        total_amount: cartTotal, 
        payment_method: shippingMethod === 'delivery' ? 'Cash on Delivery' : 'Self Pickup',
        shipping_method: shippingMethod,
        status: 'Pending', // New order status
        order_type: 'digital', // Mark as a digital shop order
        customer_phone: customerPhone || null,
        created_at: new Date().toISOString() 
      };
      
      const { data: sale, error: saleError } = await supabase.from('point_of_sale_sales').insert(saleData).select().single();
      if (saleError) throw saleError;

      // Create Items
      const saleItems = cart.map(i=> ({ 
        sale_id: sale.id, 
        product_id: i.id, 
        quantity: i.quantity, 
        unit_price: i.selling_price, 
        total_price: i.selling_price * i.quantity,
        tax_rate: i.tax_rate || 0,
        is_refunded: false
      }));
      
      const { error: itemsErr } = await supabase.from('point_of_sale_sale_items').insert(saleItems);
      if (itemsErr) throw itemsErr;

      setCart([]);
      setCartOpen(false);
      setCheckoutOpen(false);
      toast({ title: 'Order Placed! 🎉', description: `Your order #${String(sale.id).slice(0,8)} has been confirmed.` });
      
    } catch (err) {
      console.error(err);
      toast({ title: 'Checkout failed', description: err.message, variant: 'destructive' });
    } finally { setIsProcessing(false); }
  };

  if (loadingProfile) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse mx-auto" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mx-auto" />
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 text-slate-900 dark:text-slate-100 font-sans">
      <Helmet>
          <title>{shopProfile?.business_name ? `${shopProfile.business_name} | Digital Shop` : 'Digital Shop'}</title>
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm transition-all">
         <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/local-shops')} className="-ml-2 h-9 w-9 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
                    <AvatarImage src={shopProfile?.avatar_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                        {shopProfile?.business_name?.substring(0,2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <h1 className="font-bold text-lg leading-none truncate max-w-[160px] sm:max-w-[300px]">
                    {shopProfile?.business_name}
                </h1>
            </div>
            <button onClick={() => setCartOpen(true)} className="relative p-2 -mr-2">
                <ShoppingCart className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                {cartCount > 0 && (
                    <span className="absolute top-1 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border-2 border-white dark:border-slate-950 animate-in zoom-in">
                        {cartCount}
                    </span>
                )}
            </button>
         </div>
         
         <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input 
                value={query} 
                onChange={(e)=>setQuery(e.target.value)} 
                placeholder="Search shop items..." 
                className="pl-10 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border-transparent focus:bg-white dark:focus:bg-black focus:border-blue-500/50 shadow-sm transition-all" 
            />
         </div>
      </div>

      {/* Filters */}
      <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar touch-pan-x">
         {['featured', 'price_asc', 'price_desc'].map((f) => (
             <button 
                key={f}
                onClick={() => setSortBy(f)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${sortBy === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
             >
                {f === 'featured' ? 'Featured' : f === 'price_asc' ? 'Low Price' : 'High Price'}
             </button>
         ))}
      </div>

      {/* Product Grid */}
      <main className="px-4">
         {loading ? (
            <div className="grid grid-cols-2 gap-4">
               {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
         ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
               <Store className="w-16 h-16 mb-4 stroke-1" />
               <p>No products found in this shop</p>
            </div>
         ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
               {filteredProducts.map(product => (
                   <MobileProductCard 
                      key={product.id} 
                      product={product} 
                      onQuickView={(p) => { setQuickProduct(p); setQuickOpen(true); }}
                      onAdd={addToCart}
                   />
               ))}
            </div>
         )}
      </main>

      {/* Floating Cart Summary */}
      <AnimatePresence>
         {cart.length > 0 && !cartOpen && (
            <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="fixed bottom-4 left-4 right-4 z-40"
            >
               <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]" onClick={() => setCartOpen(true)}>
                  <div className="flex flex-col">
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{cartCount} items</span>
                      <span className="font-bold text-lg">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 dark:bg-black/10 px-4 py-2 rounded-xl font-semibold text-sm">
                      View Cart <ShoppingCart className="w-4 h-4" />
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Drawers */}
      <ProductQuickViewSheet 
         product={quickProduct} 
         open={quickOpen} 
         onClose={() => setQuickOpen(false)} 
         onAdd={addToCart} 
      />
      
      <CartDrawer 
         open={cartOpen} 
         onClose={() => setCartOpen(false)} 
         cart={cart} 
         updateQuantity={updateQuantity} 
         removeItem={removeFromCart} 
         total={cartTotal} 
         onCheckout={() => setCheckoutOpen(true)} 
      />

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-sm w-[95%] rounded-2xl overflow-y-auto max-h-[85vh] z-[60]">
          <DialogHeader>
            <DialogTitle>{!currentUser ? 'Sign In to Checkout' : 'Complete Order'}</DialogTitle>
            <DialogDescription>
              {!currentUser ? 'Login or create an account to finish your purchase.' : 'Choose a shipping method.'}
            </DialogDescription>
          </DialogHeader>

          {!currentUser ? (
             <div className="py-2 space-y-4">
                <Tabs defaultValue="login" className="w-full" onValueChange={setAuthMode}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div className="space-y-2">
                       <Label htmlFor="email">Email</Label>
                       <Input id="email" type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="name@example.com" className="h-12 rounded-xl"/>
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="password">Password</Label>
                       <Input id="password" type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" className="h-12 rounded-xl"/>
                    </div>
                    
                    <Button type="submit" disabled={isAuthenticating} className="w-full h-12 rounded-xl btn-primary font-bold">
                       {isAuthenticating ? <RotateCw className="w-4 h-4 animate-spin mr-2"/> : (authMode === 'login' ? <LogIn className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />)}
                       {authMode === 'login' ? 'Login' : 'Create Account'}
                    </Button>
                  </form>
                </Tabs>
             </div>
          ) : (
            <>
              <div className="py-4 space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-100 dark:border-slate-800">
                    <div>
                       <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total to Pay</p>
                       <p className="font-bold text-2xl text-blue-600 dark:text-blue-400 mt-0.5">{formatPrice(cartTotal)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs px-3 py-1 h-auto rounded-full">{cartCount} Items</Badge>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Phone (Optional)</Label>
                    <Input 
                      placeholder="Mobile Number for updates" 
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Shipping Method</Label>
                  <div className="grid grid-cols-1 gap-3">
                      {[{id: 'delivery', name: 'Home Delivery', desc: 'Pay with cash upon delivery'}, {id: 'pickup', name: 'Self Pickup', desc: 'Collect from the store'}].map(method => (
                          <button 
                              key={method.id}
                              onClick={() => setShippingMethod(method.id)}
                              className={`relative p-4 rounded-xl border flex items-center gap-4 transition-all text-left ${shippingMethod === method.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                          >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${shippingMethod === method.id ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                  {method.id === 'delivery' ? <Truck className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                              </div>
                              <div className="flex-1">
                                  <p className="font-semibold text-sm capitalize">{method.name}</p>
                                  <p className="text-xs text-muted-foreground">{method.desc}</p>
                              </div>
                              {shippingMethod === method.id && <div className="w-4 h-4 rounded-full bg-blue-500" />}
                          </button>
                      ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-3 flex-col sm:flex-row">
                <Button variant="outline" onClick={() => setCheckoutOpen(false)} className="h-12 rounded-xl w-full">Cancel</Button>
                <Button onClick={checkout} disabled={isProcessing} className="h-12 rounded-xl btn-primary font-bold w-full shadow-lg shadow-blue-500/20">
                    {isProcessing ? <RotateCw className="w-4 h-4 animate-spin mr-2" /> : 'Confirm Order'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicShopPage;