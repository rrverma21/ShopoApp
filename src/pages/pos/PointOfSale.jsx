import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useActiveMembership } from '@/hooks/useActiveMembership';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { usePendingOrdersCount } from '@/hooks/usePendingOrdersCount';
import { useRegion } from '@/contexts/RegionContext';
import { Plus, Search, X, History, ShoppingCart, UserPlus, CreditCard, Banknote, Smartphone, Users, RefreshCw, Save, PlayCircle, Briefcase, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { formatPrice } from '@/lib/utils';
import AddCustomerDialog from '@/components/pos/AddCustomerDialog';
import DiscountPopover from '@/components/pos/DiscountPopover';
import GlobalDiscountPopover from '@/components/pos/GlobalDiscountPopover';
import PaymentMethodSelector from '@/components/pos/PaymentMethodSelector';
import CashPaymentDialog from '@/components/pos/CashPaymentDialog';
import SplitPaymentDialog from '@/components/pos/SplitPaymentDialog';
import CreditConfirmDialog from '@/components/pos/CreditConfirmDialog';
import CustomerPredictionList from '@/components/pos/CustomerPredictionList';
import usePaymentMethodShortcuts from '@/hooks/usePaymentMethodShortcuts';
import useQuantityKeyboardShortcuts from '@/hooks/useQuantityKeyboardShortcuts';
import BarcodeScanner from '@/components/pos/BarcodeScanner';
import FloatingCalculator from '@/components/pos/FloatingCalculator';
import FloatingCalculatorToggle from '@/components/pos/FloatingCalculatorToggle';
import FloatingNotepad from '@/components/pos/FloatingNotepad';
import FloatingNotepadToggle from '@/components/pos/FloatingNotepadToggle';
import FloatingChatToggle from '@/components/pos/FloatingChatToggle';
import FloatingChat from '@/components/pos/FloatingChat';
import { useCategorySearch } from '@/hooks/useCategorySearch';
import { useCustomerSearch } from '@/hooks/useCustomerSearch';
import CommandListElement from '@/components/pos/CommandListElement';
import SalesCalendarPopup from '@/components/pos/SalesCalendarPopup';
import PremiumPosGuide from '@/components/pos/PremiumPosGuide';
import Sidebar from '@/components/pos/Sidebar';
import SaveSaleModal from '@/components/pos/SaveSaleModal';
import ResumeSaleModal from '@/components/pos/ResumeSaleModal';
import POSModeSwitch from '@/components/pos/POSModeSwitch';
import { usePOSMode } from '@/contexts/POSModeContext';
import { generateInvoiceNumber, syncLocalInvoiceNumber, generateBillNumber, syncLocalBillNumber } from '@/lib/invoiceNumberGenerator';

const PointOfSale = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { membership } = useActiveMembership();
  const { toast } = useToast();
  const { billingMode, posMode } = usePOSMode();
  const { count: pendingOrdersCount } = usePendingOrdersCount();
  const { currency } = useRegion();

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customer, setCustomer] = useState(null);
  const [isCustomerSearchFocused, setIsCustomerSearchFocused] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [isCreditConfirmOpen, setIsCreditConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState({ type: 'percentage', value: 0 });
  const [isCalculatorVisible, setCalculatorVisible] = useState(false);
  const [isNotepadVisible, setNotepadVisible] = useState(false);
  const [isChatVisible, setChatVisible] = useState(false);
  
  const [todaysSales, setTodaysSales] = useState(0);
  const [salesData, setSalesData] = useState([]);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [isSalesLoading, setIsSalesLoading] = useState(true);

  const [isSaveSaleModalOpen, setIsSaveSaleModalOpen] = useState(false);
  const [isResumeSaleModalOpen, setIsResumeSaleModalOpen] = useState(false);
  const [runGuide, setRunGuide] = useState(false);

  // Credit Note States
  const [availableCreditNotes, setAvailableCreditNotes] = useState([]);
  const [appliedCreditNote, setAppliedCreditNote] = useState(null);
  const [isCreditNotesLoading, setIsCreditNotesLoading] = useState(false);

  const searchInputRef = useRef(null);
  const customerSearchInputRef = useRef(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const { filteredCategories, resetCategorySearch, searchCategoryAndProducts } = useCategorySearch(products, debouncedSearchTerm);
  const { customerResults, searchCustomers, clearCustomerSearch } = useCustomerSearch();
  const debouncedCustomerSearchTerm = useDebounce(customerSearchTerm, 300);

  // Wholesaler feature check
  const hasWholesalerAccess = user?.profile?.role === 'seller' && membership?.plan && (
    membership.plan.allowed_business_category?.toLowerCase().includes('wholesale') ||
    membership.plan.name?.toLowerCase().includes('wholesale') ||
    (Array.isArray(membership.plan.features) && membership.plan.features.some(f => f.toLowerCase().includes('wholesale')))
  );

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('point_of_sale_products')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('name', { ascending: true });
    if (error) toast({ title: 'Error fetching products', description: error.message, variant: 'destructive' });
    else setProducts(data);
  }, [user, toast]);

  const fetchSalesData = useCallback(async () => {
    if (!user) return;
    setIsSalesLoading(true);
    const { data, error } = await supabase
      .from('point_of_sale_sales')
      .select('id, created_at, total_amount')
      .eq('user_id', user.id);
    
    if (error) {
      toast({ title: 'Error fetching sales data', description: error.message, variant: 'destructive' });
    } else {
      setSalesData(data.map(d => ({...d, grand_total: d.total_amount})));
      
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      
      const salesToday = data
        .filter(sale => sale.created_at >= startOfToday && sale.created_at < endOfToday)
        .reduce((sum, sale) => sum + sale.total_amount, 0);
      
      setTodaysSales(salesToday);
    }
    setIsSalesLoading(false);
  }, [user, toast]);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('posGuideSeen');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => {
        setRunGuide(true);
        localStorage.setItem('posGuideSeen', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchSalesData();

    const channel = supabase.channel('point_of_sale_sales')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'point_of_sale_sales', filter: `user_id=eq.${user?.id}` }, 
        (payload) => {
          fetchSalesData();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts, fetchSalesData, user?.id]);

  useEffect(() => { searchCategoryAndProducts(debouncedSearchTerm) }, [debouncedSearchTerm, searchCategoryAndProducts]);
  useEffect(() => { if (debouncedCustomerSearchTerm) searchCustomers(debouncedCustomerSearchTerm) }, [debouncedCustomerSearchTerm, searchCustomers]);

  // Credit Notes Fetching Logic
  useEffect(() => {
    let phoneToSearch = null;
    if (customer?.phone) {
      phoneToSearch = customer.phone;
    } else if (/^\d{10}$/.test(debouncedCustomerSearchTerm.trim())) {
      phoneToSearch = debouncedCustomerSearchTerm.trim();
    }

    const checkCreditNotes = async (phone) => {
      setIsCreditNotesLoading(true);
      try {
         const { data, error } = await supabase.rpc('get_credit_notes_by_phone', { p_phone: phone });
         if (!error && data && data.length > 0) {
            setAvailableCreditNotes(data);
         } else {
            setAvailableCreditNotes([]);
            setAppliedCreditNote(null);
         }
      } catch (e) {
         console.error('Error fetching credit notes:', e);
         setAvailableCreditNotes([]);
      } finally {
         setIsCreditNotesLoading(false);
      }
    };

    if (phoneToSearch) {
       checkCreditNotes(phoneToSearch);
    } else {
       setAvailableCreditNotes([]);
       setAppliedCreditNote(null);
    }
  }, [customer, debouncedCustomerSearchTerm]);

  const { subtotal, tax, total, totalDiscount, totalItems } = useMemo(() => {
    let sub = 0, tx = 0, disc = 0, items = 0;
    cart.forEach(item => {
      let itemPrice = item.variant ? item.variant.selling_price : item.selling_price;
      if (billingMode === 'wholesale' && item.wholesale_price) itemPrice = item.wholesale_price;

      const baseTotal = itemPrice * item.quantity;
      let itemDiscount = 0;
      if (item.discount.type === 'percentage') {
        itemDiscount = baseTotal * (item.discount.value / 100);
      } else {
        itemDiscount = Math.min(item.discount.value, baseTotal);
      }
      const discountedTotal = baseTotal - itemDiscount;
      sub += discountedTotal;
      tx += discountedTotal * (item.tax_rate / 100);
      disc += itemDiscount;
      items += item.quantity;
    });

    let globalDiscAmount = 0;
    if (globalDiscount.type === 'percentage') {
      globalDiscAmount = sub * (globalDiscount.value / 100);
    } else {
      globalDiscAmount = Math.min(globalDiscount.value, sub);
    }

    const finalSubtotal = sub - globalDiscAmount;
    const finalTax = finalSubtotal * (tx / sub) || 0;
    let finalTotal = finalSubtotal + finalTax;

    if (appliedCreditNote) {
        finalTotal = Math.max(0, finalTotal - appliedCreditNote.amount);
    }

    return { subtotal: finalSubtotal, tax: finalTax, total: finalTotal, totalDiscount: disc + globalDiscAmount, totalItems: items };
  }, [cart, globalDiscount, billingMode, appliedCreditNote]);

  usePaymentMethodShortcuts(cart.length > 0, setPaymentMethod);
  useQuantityKeyboardShortcuts(() => {
    if (cart.length > 0) {
      const lastItem = cart[cart.length - 1];
      updateQuantity(lastItem.cart_id, lastItem.quantity + 1);
    }
  }, () => {
    if (cart.length > 0) {
      const lastItem = cart[cart.length - 1];
      updateQuantity(lastItem.cart_id, Math.max(1, lastItem.quantity - 1));
    }
  });

  const handleStartGuide = () => { setRunGuide(true); };

  const addToCart = (product, variant = null) => {
    const existingCartItemIndex = cart.findIndex(item => item.id === product.id && (!variant || item.variant?.id === variant.id));
    if (existingCartItemIndex > -1) {
      const newCart = [...cart];
      newCart[existingCartItemIndex].quantity += 1;
      setCart(newCart);
    } else {
      const cartItem = {
        ...product,
        cart_id: variant ? `${product.id}-${variant.id}` : product.id,
        quantity: 1,
        discount: { type: 'percentage', value: product.discount_value || 0 },
        variant: variant || null
      };
      setCart(prevCart => [...prevCart, cartItem]);
    }
    clearSearch();
  };

  const updateQuantity = (cartId, newQuantity) => {
    if (newQuantity <= 0) removeFromCart(cartId);
    else setCart(cart.map(item => item.cart_id === cartId ? { ...item, quantity: newQuantity } : item));
  };
  
  const removeFromCart = (cartId) => setCart(cart.filter(item => item.cart_id !== cartId));

  const updateDiscount = (cartId, discount) => setCart(cart.map(item => item.cart_id === cartId ? { ...item, discount } : item));

  const processPayment = async (details = {}) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const amountPaid = details.received !== undefined ? details.received : (paymentMethod === 'Credit' ? 0 : total);
      const balanceDue = Math.max(0, total - amountPaid);
      const payStatus = balanceDue > 0 ? (amountPaid > 0 ? 'Partial' : 'Unpaid') : 'Paid';

      const isGst = tax > 0;
      const billingType = isGst ? 'gst_invoice' : 'without_gst';
      
      let invNumber = null, invSerial = null, invMonth = null;
      let billNum = null, billSerial = null, billMonth = null;

      if (isGst) {
        const { formatted, serial, yearMonth } = await generateInvoiceNumber(user.id);
        invNumber = formatted;
        invSerial = serial;
        invMonth = yearMonth;
      } else {
        const { formatted, serial, yearMonth } = await generateBillNumber(user.id);
        billNum = formatted;
        billSerial = serial;
        billMonth = yearMonth;
      }

      const { data: saleData, error: saleError } = await supabase
        .from('point_of_sale_sales')
        .insert({
          user_id: user.id,
          customer_id: customer?.id || null,
          customer_phone: customer?.phone || null,
          subtotal: subtotal,
          tax_amount: tax,
          discount_amount: totalDiscount,
          total_amount: total,
          payment_method: paymentMethod || 'Cash',
          status: 'Completed',
          order_type: 'POS',
          amount_paid: amountPaid,
          balance_due: balanceDue,
          payment_status: payStatus,
          billing_type: billingType,
          invoice_number: invNumber,
          invoice_serial_number: invSerial,
          invoice_month: invMonth,
          bill_number: billNum,
          bill_serial_number: billSerial,
          bill_month: billMonth
        })
        .select()
        .single();

      if (saleError) throw saleError;
      
      if (isGst) {
          syncLocalInvoiceNumber(user.id, invMonth, invSerial);
      } else {
          syncLocalBillNumber(user.id, billMonth, billSerial);
      }

      const itemsToInsert = cart.map(item => {
        const itemPrice = item.variant ? item.variant.selling_price : item.selling_price;
        const priceToUse = billingMode === 'wholesale' && item.wholesale_price ? item.wholesale_price : itemPrice;
        
        return {
          sale_id: saleData.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: priceToUse,
          tax_rate: item.tax_rate || 0,
          total_price: priceToUse * item.quantity,
          is_refunded: false,
          variant_id: item.variant?.id || null,
          variant_name: item.variant?.name || null
        };
      });

      const { error: itemsError } = await supabase.from('point_of_sale_sale_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // Update the credit note status to Used if one was applied
      if (appliedCreditNote) {
         await supabase.from('credit_notes').update({ status: 'Used', used_in_sale_id: saleData.id }).eq('id', appliedCreditNote.id);
      }

      const docNumber = isGst ? invNumber : billNum;
      const docType = isGst ? 'Invoice No.' : 'Bill No.';
      toast({ title: 'Sale Completed', description: `${docType} ${docNumber} Generated` });
      
      setIsCashDialogOpen(false);
      setIsSplitDialogOpen(false);
      setIsCreditConfirmOpen(false);
      setCart([]);
      clearCustomer();
      setGlobalDiscount({ type: 'percentage', value: 0 });
      setPaymentMethod('');
      setAppliedCreditNote(null);
      setAvailableCreditNotes([]);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error processing sale', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentClick = () => {
    if (!paymentMethod) {
      toast({ title: 'Select Payment Method', description: 'Please select a payment method to continue.', variant: 'destructive' });
      return;
    }
    if (paymentMethod === 'Cash') setIsCashDialogOpen(true);
    else if (paymentMethod === 'Split') setIsSplitDialogOpen(true);
    else if (paymentMethod === 'Credit') setIsCreditConfirmOpen(true);
    else processPayment({});
  };

  const clearSearch = () => { setSearchTerm(''); if (searchInputRef.current) searchInputRef.current.focus(); };
  const clearCustomer = () => { setCustomer(null); setCustomerSearchTerm(''); clearCustomerSearch(); };
  const handleSelectCustomer = (selectedCust) => {
    setCustomer(selectedCust);
    setCustomerSearchTerm(selectedCust.name);
    setIsCustomerSearchFocused(false);
    clearCustomerSearch();
  };
  
  const handleBarcodeScan = (barcode) => {
    const foundProduct = products.find(p => p.barcode === barcode);
    if(foundProduct) {
      addToCart(foundProduct);
      toast({ title: "Product Added", description: `${foundProduct.name} added to cart.`});
    } else {
      toast({ title: "Barcode Not Found", description: `No product matches the barcode: ${barcode}`, variant: "destructive"});
    }
  };

  const handleSaveSuccess = (shouldClearCart) => {
    if (shouldClearCart) {
      setCart([]);
      setCustomer(null);
      setCustomerSearchTerm('');
      setGlobalDiscount({ type: 'percentage', value: 0 });
      setAppliedCreditNote(null);
      setAvailableCreditNotes([]);
    }
  };

  const handleResumeSale = (saleData) => {
    if (cart.length > 0) {
        if (!confirm('Resume will replace current cart. Continue?')) return;
    }
    setCart(saleData.cart_items || []);
    if (saleData.customer_details) {
        setCustomer(saleData.customer_details);
        setCustomerSearchTerm(saleData.customer_details.name || '');
    } else {
        setCustomer(null);
        setCustomerSearchTerm('');
    }
    setGlobalDiscount({ type: 'percentage', value: 0 });
    toast({ title: "Sale Resumed", description: `Loaded "${saleData.sale_name}" with ${saleData.cart_items?.length || 0} items.` });
  };

  return (
    <>
      <PremiumPosGuide run={runGuide} setRun={setRunGuide} />
      
      <SalesCalendarPopup isOpen={showCalendarPopup} onClose={() => setShowCalendarPopup(false)} salesData={salesData} />
      <FloatingCalculatorToggle isOpen={isCalculatorVisible} onToggle={() => setCalculatorVisible(v => !v)} />
      <FloatingCalculator isOpen={isCalculatorVisible} onClose={() => setCalculatorVisible(false)} />
      
      <FloatingNotepadToggle isOpen={isNotepadVisible} onToggle={() => setNotepadVisible(v => !v)} />
      <FloatingNotepad isOpen={isNotepadVisible} onClose={() => setNotepadVisible(false)} />

      <SaveSaleModal isOpen={isSaveSaleModalOpen} onClose={() => setIsSaveSaleModalOpen(false)} cart={cart} customer={customer} total={total} onSaveSuccess={handleSaveSuccess} />
      <ResumeSaleModal isOpen={isResumeSaleModalOpen} onClose={() => setIsResumeSaleModalOpen(false)} onResumeSale={handleResumeSale} />

      <div className="flex h-screen bg-slate-100 dark:bg-slate-950 font-sans relative">
        <Sidebar onHelpClick={handleStartGuide} className="hidden md:flex" />

        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          <header className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input ref={searchInputRef} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Scan barcode or search products/categories..." className="pl-10 h-12 text-base bg-white dark:bg-slate-900" />
              {searchTerm && <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full" onClick={clearSearch}><X className="h-4 w-4" /></Button>}
            </div>
            
            <div className="flex gap-2 shrink-0">
                {hasWholesalerAccess && posMode === 'POS Terminal' && (
                    <div className="relative">
                      <Button onClick={() => navigate('/book-orders')} variant="outline" className="h-12 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                          <Briefcase className="mr-2 h-4 w-4"/> View Orders Booked by Sales Executives
                      </Button>
                      {pendingOrdersCount > 0 && (
                          <span 
                              className="notification-badge" 
                              aria-label={`${pendingOrdersCount} pending orders`}
                          >
                              {pendingOrdersCount}
                          </span>
                      )}
                    </div>
                )}
                <Button onClick={() => setIsSaveSaleModalOpen(true)} className="h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" disabled={cart.length === 0}>
                    <Save className="mr-2 h-4 w-4"/> Save Sale
                </Button>
                <Button onClick={() => setIsResumeSaleModalOpen(true)} className="h-12 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/20">
                    <PlayCircle className="mr-2 h-4 w-4"/> Resume Sale
                </Button>
            </div>

            <div className="flex gap-2 shrink-0">
                <BarcodeScanner onScan={handleBarcodeScan} />
                <Button onClick={fetchProducts} variant="outline" className="h-12 w-12 p-0"><RefreshCw className="h-4 w-4"/></Button>
            </div>
          </header>

          <AnimatePresence>
            {debouncedSearchTerm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Card className="shadow-lg max-h-[calc(100vh-250px)] overflow-y-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardContent className="p-2">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map(category => (
                        <div key={category.name}>
                          <h3 className="text-xs uppercase font-bold text-slate-400 p-2">{category.name}</h3>
                          {category.products.map(product => <CommandListElement key={product.id} product={product} onSelect={addToCart} />)}
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-8 text-slate-500">No products found for "{debouncedSearchTerm}"</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside data-tour="pos-billing" className="w-[450px] bg-white dark:bg-slate-900 flex flex-col shadow-2xl z-10">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg">Current Order</h2>
              <POSModeSwitch />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-400" />
                {customer ? (
                  <div className="flex-1 flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <div>
                      <p className="font-semibold text-sm text-blue-800 dark:text-blue-200">{customer.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{customer.phone}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={clearCustomer}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="relative flex-1">
                    <Input 
                      ref={customerSearchInputRef}
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      onFocus={() => setIsCustomerSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsCustomerSearchFocused(false), 150)}
                      placeholder="Search or Add Customer (optional)" 
                      className="h-10"
                    />
                    {isCustomerSearchFocused && (
                      <CustomerPredictionList results={customerResults} onSelect={handleSelectCustomer} onAddNew={() => { setIsAddCustomerOpen(true); setIsCustomerSearchFocused(false); }} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
                <p className="font-medium">Your cart is empty</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              <AnimatePresence>
                {cart.map(item => {
                  let displayPrice = item.variant ? item.variant.selling_price : item.selling_price;
                  if (billingMode === 'wholesale' && item.wholesale_price) displayPrice = item.wholesale_price;
                    
                  return (
                  <motion.div key={item.cart_id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                    <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg shadow-sm flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2">
                           {item.variant && <Badge variant="secondary" className="text-xs">{item.variant.name}</Badge>}
                           {billingMode === 'wholesale' && <Badge variant="outline" className="text-[10px] h-4 px-1 border-purple-200 text-purple-600 bg-purple-50">Wholesale</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatPrice(displayPrice)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.cart_id, parseInt(e.target.value))} className="w-16 h-8 text-center" />
                        <DiscountPopover item={item} onUpdateDiscount={updateDiscount} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => removeFromCart(item.cart_id)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </motion.div>
                )})}
              </AnimatePresence>
            )}
          </div>
          
          {cart.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {availableCreditNotes.length > 0 && !appliedCreditNote && (
                <div className="credit-note-alert mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-full">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="font-bold text-amber-900 dark:text-amber-100 text-base">Credit Note Available</span>
                  </div>
                  <div className="space-y-2">
                    {availableCreditNotes.map(cn => (
                      <div key={cn.id} className="flex justify-between items-center bg-white/60 dark:bg-slate-900/40 p-3 rounded-lg border border-amber-200 dark:border-amber-700/50 shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-sm">{cn.credit_note_number}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">Generated: {new Date(cn.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-700 dark:text-amber-400">{formatPrice(cn.amount)}</span>
                          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm" onClick={() => setAppliedCreditNote(cn)}>
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal + totalDiscount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <span>Discount</span>
                  <GlobalDiscountPopover discount={globalDiscount} onUpdateDiscount={setGlobalDiscount} />
                </div>
                <span className="font-medium text-green-600 dark:text-green-400">-{formatPrice(totalDiscount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400">Tax</span>
                <span className="font-medium">{formatPrice(tax)}</span>
              </div>
              
              {appliedCreditNote && (
                <div className="flex justify-between items-center text-sm bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 mt-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-amber-900 dark:text-amber-100">Credit Note Applied</span>
                    <span className="text-xs text-amber-700 dark:text-amber-300 font-mono">{appliedCreditNote.credit_note_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-700 dark:text-amber-400">-{formatPrice(appliedCreditNote.amount)}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-full" onClick={() => setAppliedCreditNote(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center font-bold text-2xl border-t pt-3 mt-3 border-slate-200 dark:border-slate-700">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              
              <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} customer={customer} />

              <Button size="lg" className="w-full h-14 text-lg" onClick={handlePaymentClick} disabled={isLoading}>
                {isLoading ? 'Processing...' : `Charge ${formatPrice(total)}`}
              </Button>
            </div>
          )}
        </aside>

        <AddCustomerDialog isOpen={isAddCustomerOpen} onClose={() => setIsAddCustomerOpen(false)} onSuccess={(newCustomer) => { handleSelectCustomer(newCustomer); setIsAddCustomerOpen(false); }} />
        <CashPaymentDialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen} totalAmount={total} onComplete={(received) => processPayment({ received })} isProcessing={isLoading} />
        <SplitPaymentDialog isOpen={isSplitDialogOpen} onClose={() => setIsSplitDialogOpen(false)} totalAmount={total} onConfirm={processPayment} />
        <CreditConfirmDialog isOpen={isCreditConfirmOpen} onClose={() => setIsCreditConfirmOpen(false)} customer={customer} totalAmount={total} onConfirm={processPayment} />
      </div>

      {/* Render AI Chat fixed elements outside the main layout container so they are definitively on top of all DOM trees */}
      <FloatingChatToggle isOpen={isChatVisible} onToggle={() => setChatVisible(v => !v)} />
      <FloatingChat isOpen={isChatVisible} onClose={() => setChatVisible(false)} />
    </>
  );
};

export default PointOfSale;
