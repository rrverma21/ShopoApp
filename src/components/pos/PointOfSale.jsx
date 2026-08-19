import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { usePosData } from '@/contexts/PosDataContext';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePOSMode } from '@/contexts/POSModeContext';
import { useRegion } from '@/contexts/RegionContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, ShoppingCart, Ticket, Search, X, Loader2, ChevronUp, ChevronDown, Phone, Plus, Minus, CreditCard, Landmark, Smartphone, Banknote, AlertCircle, Layers, Info, User, UserPlus, Coins, Calculator as CalculatorIcon, Barcode, Percent, IndianRupee, ScrollText, Briefcase, Printer, Tag, Building2, CheckCircle, FileText, RotateCcw, RefreshCw, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/useDebounce';
import { Label } from '@/components/ui/label';
import { formatPrice, isServiceProduct } from '@/lib/utils';
import { getEffectiveUnitPrice } from '@/lib/pricingUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch";
import { roundAmount } from '@/utils/roundAmount';

import SplitPaymentDialog from "@/components/pos/SplitPaymentDialog";
import VariantSelectorDialog from "@/components/pos/VariantSelectorDialog";
import FloatingCalculator from '@/components/pos/FloatingCalculator';
import POSProductsModal from '@/components/pos/POSProductsModal';
import CommandListElement from './CommandListElement';
import PriceChangeDialog from './PriceChangeDialog';
import QuantityPickerDialog from './QuantityPickerDialog';
import CashPaymentDialog from './CashPaymentDialog';
import CreditConfirmDialog from './CreditConfirmDialog';
import AddCustomerDialog from './AddCustomerDialog';
import GlobalDiscountPopover from './GlobalDiscountPopover';
import BarcodeScanner from './BarcodeScanner';
import PaymentMethodButton from './PaymentMethodButton';
import CustomerPredictionList from './CustomerPredictionList';
import SaveSaleModal from './SaveSaleModal';
import ResumeSaleModal from './ResumeSaleModal';
import POSModeSwitch from './POSModeSwitch';
import BillingModeToggle from './BillingModeToggle';
import ManualDiscountPopover from './ManualDiscountPopover';
import BookOrdersModal from './book-orders/BookOrdersModal';
import AvailableCreditNotesPanel from './AvailableCreditNotesPanel';
import { generateReceiptPDF } from '@/utils/posReceiptGenerator';
import { useMultilingualSEO } from '@/hooks/useMultilingualSEO';
import usePaymentMethodShortcuts from '@/hooks/usePaymentMethodShortcuts';
import useQuantityKeyboardShortcuts from '@/hooks/useQuantityKeyboardShortcuts';
import { useCustomerSearch } from '@/hooks/useCustomerSearch';
import { generateInvoiceNumber, generateBillNumber } from '@/lib/invoiceNumberGenerator';
import { format } from 'date-fns';
import { usePendingOrdersCount } from '@/hooks/usePendingOrdersCount';

const PointOfSale = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshData } = usePosData();
  const { t } = useLanguage();
  const { billingMode } = usePOSMode();
  const { currency, isLoadingCurrency } = useRegion();
  const { title, description } = useMultilingualSEO('pos');
  const [allProducts, setAllProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productFetchError, setProductFetchError] = useState(null);
  const { count: pendingOrdersCount } = usePendingOrdersCount();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchInputRef = useRef(null);

  const [gstBillingMode, setGstBillingMode] = useState('gst');

  const posUserId = user?.posOwnerId || user?.id;

  const { 
    cartItems: cart, 
    setCartItems: setCart, 
    clearCart, 
    globalDiscount,
    updateGlobalDiscount,
    clearGlobalDiscount,
    posCustomer,
    setPosCustomer,
    loadOrderIntoCart,
    currentBookedOrderId,
    setCurrentBookedOrderId
  } = useCart();

  const grossTotalInclusive = useMemo(() => roundAmount(cart.reduce((acc, item) => acc + ((item.unitOriginalPrice || item.selling_price || 0) * item.quantity), 0)), [cart]);
  const itemDiscountsTotal = useMemo(() => roundAmount(cart.reduce((acc, item) => acc + (item.lineDiscount || 0), 0)), [cart]);
  const netTotalInclusive = useMemo(() => roundAmount(cart.reduce((acc, item) => acc + (item.lineSubtotal || 0), 0)), [cart]);

  const globalDiscountAmount = useMemo(() => {
    if (globalDiscount.type === 'percentage') {
      return roundAmount((netTotalInclusive * globalDiscount.value) / 100);
    } else {
      return roundAmount(Math.min(globalDiscount.value, netTotalInclusive));
    }
  }, [globalDiscount, netTotalInclusive]);

  const baseBillValue = roundAmount(Math.max(0, netTotalInclusive - globalDiscountAmount));

  const taxBreakdown = useMemo(() => {
    if (gstBillingMode === 'non-gst') {
      return { totalTax: 0, cgst: 0, sgst: 0 };
    }

    let totalTax = 0;
    
    cart.forEach(item => {
      const taxRate = item.tax_rate !== null && item.tax_rate !== undefined ? item.tax_rate : (item.gst_rate !== null && item.gst_rate !== undefined ? item.gst_rate : 0);
      const inclusivePrice = item.lineSubtotal || 0;
      
      if (taxRate > 0) {
        const taxableValue = inclusivePrice / (1 + (taxRate / 100));
        const itemTax = inclusivePrice - taxableValue;
        totalTax += itemTax;
      }
    });
    
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;
    
    return {
      totalTax: roundAmount(totalTax),
      cgst: roundAmount(cgst),
      sgst: roundAmount(sgst)
    };
  }, [cart, gstBillingMode]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCostPrice, setShowCostPrice] = useState(false);
  
  const prevCartLength = useRef(0);
  
  const [lastAddedItemId, setLastAddedItemId] = useState(null);
  const [highlightedItemId, setHighlightItemId] = useState(null);
  
  useEffect(() => {
    if (prevCartLength.current === 0 && cart.length > 0) {
      setIsCartOpen(true);
    }
    prevCartLength.current = cart.length;
    
    if (cart.length === 0 && currentBookedOrderId) {
      setCurrentBookedOrderId(null);
    }
  }, [cart, currentBookedOrderId, setCurrentBookedOrderId]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPendingBalance, setCustomerPendingBalance] = useState(0);
  const [manualPendingAmount, setManualPendingAmount] = useState(''); 
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false); 
  
  const [showCustomerPredictions, setShowCustomerPredictions] = useState(false);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
  const [customers, setCustomers] = useState([]);
  
  const { results: customerSearchResults, loading: isCustomerSearchLoading, error: customerSearchError } = useCustomerSearch(customerPhone, posUserId, selectedCustomer);
  const debouncedCustomerPhone = useDebounce(customerPhone, 400);

  const [businessDetails, setBusinessDetails] = useState(() => ({
    business_name: user?.profile?.business_name || user?.user_metadata?.businessName || null,
    street_address: user?.profile?.street_address || null,
    city: user?.profile?.city || null,
    pincode: user?.profile?.pincode || null,
    phone: user?.profile?.phone || null,
    gstin: user?.profile?.gstin || null
  }));
  
  const [retailerSettings, setRetailerSettings] = useState(null);
  const [redeemCoins, setRedeemCoins] = useState(false);
  const [coinsToRedeem, setCoinsToRedeem] = useState(0);
  const [loyaltyConfig, setLoyaltyConfig] = useState({ earning_percentage: 50, redeem_percentage: 25, coin_value: 0.25 });

  const [printReceipt, setPrintReceipt] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [isCreditConfirmOpen, setIsCreditConfirmOpen] = useState(false); 
  
  const [priceChangeProduct, setPriceChangeProduct] = useState(null);
  const [isPriceChangeDialogOpen, setIsPriceChangeDialogOpen] = useState(false);

  const [variantSelectorProduct, setVariantSelectorProduct] = useState(null);
  const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false);

  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [pendingAddItem, setPendingAddItem] = useState(null); 

  const [mobileSearchActive, setMobileSearchActive] = useState(false);

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isBookOrdersModalOpen, setIsBookOrdersModalOpen] = useState(false);
  const [isPOSProductsModalOpen, setIsPOSProductsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const [isSaveSaleModalOpen, setIsSaveSaleModalOpen] = useState(false);
  const [isResumeSaleModalOpen, setIsResumeSaleModalOpen] = useState(false);

  const [appliedCreditNotes, setAppliedCreditNotes] = useState([]); 
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
  const [availableCreditNotes, setAvailableCreditNotes] = useState([]);
  
  const [temporaryBillId, setTemporaryBillId] = useState(`temp_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  const isAnyModalOpen = useMemo(() => isSplitPaymentOpen || isCashDialogOpen || isCreditConfirmOpen || isPriceChangeDialogOpen || isVariantSelectorOpen || isQuantityDialogOpen || isAddCustomerOpen || isPOSProductsModalOpen || isScannerOpen || isSaveSaleModalOpen || isResumeSaleModalOpen || isCreditNoteModalOpen || isBookOrdersModalOpen, [isSplitPaymentOpen, isCashDialogOpen, isCreditConfirmOpen, isPriceChangeDialogOpen, isVariantSelectorOpen, isQuantityDialogOpen, isAddCustomerOpen, isPOSProductsModalOpen, isScannerOpen, isSaveSaleModalOpen, isResumeSaleModalOpen, isCreditNoteModalOpen, isBookOrdersModalOpen]);

  const paymentOptions = useMemo(() => [
    { name: 'Cash', icon: Banknote, shortcut: 'F12', label: t('pos.cash') },
    { name: 'UPI', icon: Smartphone, shortcut: 'F11', label: t('pos.upi') },
    { name: 'Split', icon: Layers, shortcut: 'F10', label: 'Split' },
    { name: 'Credit', icon: User, shortcut: 'F9', label: t('pos.credit') },
    { name: 'Card', icon: CreditCard, shortcut: 'F8', label: t('pos.card') },
    { name: 'Cheque', icon: ScrollText, label: 'Cheque' },
    { name: 'Debit', icon: CreditCard, label: 'Debit' },
  ], [t]);

  useEffect(() => {
    setSearchTerm('');
    setAllProducts([]);
  }, []);

  const checkPendingBalance = useCallback(async (customerId, name) => {
      if (!customerId) { setCustomerPendingBalance(0); return; }
      try {
          const { data, error } = await supabase.from('point_of_sale_sales')
            .select('balance_due')
            .eq('customer_id', customerId)
            .gt('balance_due', 0)
            .neq('payment_status', 'Paid')
            .neq('status', 'Cancelled')
            .neq('status', 'Refunded')
            .eq('payment_method', 'Credit');
            
          if (error) throw error;
          if (data && data.length > 0) { 
              const totalPending = roundAmount(data.reduce((sum, order) => sum + (Number(order.balance_due) || 0), 0)); 
              if (totalPending > 1) { 
                  setCustomerPendingBalance(totalPending); 
                  toast({ title: "⚠️ Outstanding Payment Alert", description: `${name} has a pending balance of ${formatPrice(totalPending)}.`, variant: "destructive", duration: 6000 }); 
              } else { 
                  setCustomerPendingBalance(0); 
              } 
          } else { 
              setCustomerPendingBalance(0); 
          }
      } catch (err) {
          console.error(err);
          setCustomerPendingBalance(0);
      }
  }, [toast]);

  const checkCreditNotes = useCallback(async (phone) => {
      if (!phone) {
          setAvailableCreditNotes([]);
          return;
      }
      
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length < 10) {
          setAvailableCreditNotes([]);
          return;
      }
      
      try {
          const rpcName = billingMode === 'wholesale' ? 'get_credit_notes_by_phone' : 'get_pos_credit_notes_by_phone';
          const { data, error } = await supabase.rpc(rpcName, { p_phone: cleanPhone });
          
          if (error) throw error;
          setAvailableCreditNotes(Array.isArray(data) ? data : []);
      } catch (err) {
          console.error(err);
          setAvailableCreditNotes([]);
      }
  }, [toast, billingMode]);

  useEffect(() => {
      if (debouncedCustomerPhone && debouncedCustomerPhone.replace(/\D/g, '').length >= 10) {
          checkCreditNotes(debouncedCustomerPhone);
      } else {
          setAvailableCreditNotes([]);
      }
  }, [debouncedCustomerPhone, checkCreditNotes]);

  useEffect(() => {
    if (posCustomer) {
      let finalName = posCustomer.name || '';
      let finalPhone = posCustomer.phone || '';
      let matchedCustomer = posCustomer.id ? posCustomer : null;

      if (!matchedCustomer && customers.length > 0) {
        matchedCustomer = customers.find(c => 
          (finalPhone && c.phone === finalPhone) || 
          (finalName && c.name.toLowerCase() === finalName.toLowerCase())
        );
        if (matchedCustomer) {
          finalPhone = matchedCustomer.phone || finalPhone;
          finalName = matchedCustomer.name || finalName;
        }
      }

      setCustomerName(finalName);
      setCustomerPhone(finalPhone);
      setSelectedCustomer(matchedCustomer || null);

      if (matchedCustomer) {
        checkPendingBalance(matchedCustomer.id, matchedCustomer.name);
      }
      
      if (finalPhone) {
        checkCreditNotes(finalPhone);
      }

      setPosCustomer(null);
    }
  }, [posCustomer, setPosCustomer, customers, checkPendingBalance, checkCreditNotes]);

  const fetchAllProducts = useCallback(async () => {
    if (!posUserId) return;
    
    setIsLoadingProducts(true);
    setProductFetchError(null);
    setAllProducts([]); 
    
    let allData = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        while(hasMore) {
            const { data, error, count } = await supabase
              .from('point_of_sale_products')
              .select('*', { count: 'exact' })
              .eq('user_id', posUserId)
              .eq('archived', false) 
              .range(from, from + limit - 1)
              .abortSignal(controller.signal);

            if (error) throw error;
            if (data) allData.push(...data);
            from += limit;
            
            if (!data || data.length < limit || (count && allData.length >= count)) { 
                hasMore = false; 
            }
        }
        
        setAllProducts(allData);
        setProductFetchError(null);
    } catch (err) {
        const isTimeout = err.name === 'AbortError' || err.message?.includes('FetchError') || err.message?.includes('timeout');
        const errorMessage = isTimeout ? 'Fetching products took too long (15s limit).' : err.message || 'Failed to fetch products';
        
        setProductFetchError(errorMessage);
        setAllProducts([]);
        
        toast({ 
            title: isTimeout ? 'Request Timeout' : 'Error fetching products', 
            description: errorMessage, 
            variant: 'destructive',
            duration: 5000,
        });
    } finally {
        clearTimeout(timeoutId);
        setIsLoadingProducts(false);
    }
  }, [posUserId, toast]);

  const fetchCustomers = useCallback(async () => {
    if (!posUserId) return;
    const { data, error } = await supabase.from('point_of_sale_customers').select('*').eq('user_id', posUserId).order('name').limit(100);
    if (error) { toast({ title: 'Error fetching customers', description: error.message, variant: 'destructive' }); } else { setCustomers(data || []); }
  }, [posUserId, toast]);

  const fetchBusinessDetails = useCallback(async () => {
    if (!posUserId) return;
    const { data: profile } = await supabase.from('profiles').select('business_name, street_address, city, pincode, phone, gstin').eq('id', posUserId).single();
    if (profile) setBusinessDetails(profile);
    const { data: settings } = await supabase.from('pos_retailer_settings').select('*').eq('user_id', posUserId).maybeSingle();
    if (settings) {
        setRetailerSettings(settings);
    }
  }, [posUserId]);

  useEffect(() => {
      fetchAllProducts();
      fetchCustomers();
      fetchBusinessDetails();
  }, [fetchAllProducts, fetchCustomers, fetchBusinessDetails]);

  useEffect(() => {
      const fetchLoyaltyConfig = async () => {
          const { data } = await supabase.from('site_settings').select('value').eq('key', 'loyalty_settings').maybeSingle();
          if (data && data.value) { try { const config = JSON.parse(data.value); setLoyaltyConfig(prev => ({ ...prev, ...config })); } catch (e) { console.warn("Error parsing loyalty settings", e); } }
      };
      fetchLoyaltyConfig();
  }, []);

  useEffect(() => {
      const fetchSettings = async () => {
          if (!user) return;
          const { data } = await supabase.from("site_settings").select("value").eq("key", "pos_show_cost_price").maybeSingle();
          if (data) { setShowCostPrice(data.value === 'true'); }
      };
      fetchSettings();
  }, [user]);

  useEffect(() => { if (!isLoadingProducts && allProducts.length > 0 && !productFetchError) { searchInputRef.current?.focus(); } }, [isLoadingProducts, allProducts, productFetchError]);
  useEffect(() => { setSelectedCustomerIndex(-1); }, [customerPhone]);

  const handleCustomerSelect = async (customer) => {
    setCustomerPhone(customer.phone || '');
    setCustomerName(customer.name || '');
    setSelectedCustomer(customer);
    setShowCustomerPredictions(false);
    setSelectedCustomerIndex(-1); 
    setRedeemCoins(false);
    setCoinsToRedeem(0);
    setManualPendingAmount('');
    checkPendingBalance(customer.id, customer.name);
    checkCreditNotes(customer.phone);
    
    await rollbackAllCreditNotes();
  };

  const rollbackAllCreditNotes = async () => {
    if (appliedCreditNotes.length === 0) return;
    
    try {
      for (const note of appliedCreditNotes) {
        if (note.usage_id) {
          await supabase.rpc('reverse_credit_note_usage', { p_usage_id: note.usage_id });
        }
      }
      setAppliedCreditNotes([]);
      if (customerPhone) {
        checkCreditNotes(customerPhone);
      }
    } catch (err) {
      console.error('Error rolling back CNs:', err);
    }
  };

  const handleClearCustomer = async () => {
    await rollbackAllCreditNotes();
    setCustomerPhone('');
    setCustomerName('');
    setSelectedCustomer(null);
    setCustomerPendingBalance(0);
    setRedeemCoins(false);
    setCoinsToRedeem(0);
    setManualPendingAmount('');
    setShowCustomerPredictions(false);
    setAvailableCreditNotes([]);
    setTemporaryBillId(`temp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  };

  const handleCustomerCreated = (newCustomer) => {
      setCustomers(prev => [...prev, newCustomer]);
      handleCustomerSelect(newCustomer);
  };

  const getPriceForMode = useCallback((product, mode) => {
    if (mode === 'wholesale' && product.wholesale_price) { 
        return roundAmount(Number(product.wholesale_price)); 
    }
    return roundAmount(Number(product.selling_price) || 0);
  }, []);

  useEffect(() => {
      if (cart.length > 0) {
          setCart(currentCart => {
              return currentCart.map(item => {
                  const basePrice = getPriceForMode(item.product || item, billingMode);
                  const pricing = getEffectiveUnitPrice(item.product || item, 1, new Date());
                  
                  const originalPrice = roundAmount(item.product?.allow_price_change ? item.unitOriginalPrice : (item.variantId ? (item.variant?.price || basePrice) : pricing.originalPrice));
                  const offerPrice = roundAmount(item.product?.allow_price_change ? (item.offerPrice || item.unitOriginalPrice) : (item.variantId ? (item.variant?.price || basePrice) : pricing.discountedPrice));
                  const discountLabel = item.product?.allow_price_change ? null : (item.variantId ? null : pricing.discountLabel);
                  
                  let manualAmt = 0;
                  if (item.manualDiscountType === 'percentage') {
                      manualAmt = roundAmount(offerPrice * ((item.manualDiscountValue || 0) / 100));
                  } else if (item.manualDiscountType === 'amount') {
                      manualAmt = roundAmount(item.manualDiscountValue || 0);
                  }
                  if (manualAmt > offerPrice) manualAmt = offerPrice;

                  const finalPrice = roundAmount(offerPrice - manualAmt);

                  return { 
                    ...item, 
                    selling_price: finalPrice, 
                    applied_order_mode: billingMode,
                    unitOriginalPrice: originalPrice,
                    offerPrice: offerPrice,
                    unitFinalPrice: finalPrice,
                    manualDiscountAmount: manualAmt,
                    lineDiscount: roundAmount((originalPrice - finalPrice) * item.quantity),
                    lineSubtotal: roundAmount(finalPrice * item.quantity),
                    appliedOfferId: item.variantId ? null : pricing.appliedOfferId,
                    appliedOfferName: item.variantId ? null : pricing.appliedOfferName,
                    appliedOfferType: item.variantId ? null : pricing.appliedOfferType,
                    discountLabel: discountLabel,
                  };
              });
          });
      }
  }, [billingMode, getPriceForMode, setCart]);

  const handleAddToCart = useCallback((product, price, variant = null, quantity = 1) => {
    const basePrice = getPriceForMode(product, billingMode);
    const effectivePrice = price !== undefined ? roundAmount(price) : basePrice;
    let newCartItemId;
    const isService = isServiceProduct(product);

    const pricing = getEffectiveUnitPrice(product, 1, new Date());

    setCart(prev => {
      const itemKey = variant ? `${product.id}-${variant.id}` : product.id;
      const exists = prev.find(i => { const currentKey = i.variantId ? `${i.id}-${i.variantId}` : i.id; return currentKey === itemKey && roundAmount(i.unitFinalPrice || i.selling_price) === effectivePrice; });
      const availableStock = variant ? (parseFloat(variant.stock) || 0) : (parseFloat(product.stock_level) || 0);

      if (exists) {
        newCartItemId = exists.cartItemId;
        if (!isService && (exists.quantity + quantity) > (availableStock || Infinity)) {
          toast({ title: t('pos.stockLimit'), description: `Cannot add more of ${variant ? variant.name : product.name}. Max stock: ${availableStock}`, variant: 'destructive' });
          return prev;
        }
        
        const newQty = exists.quantity + quantity;
        return prev.map(i => i.cartItemId === exists.cartItemId ? { 
            ...i, 
            quantity: newQty,
            lineSubtotal: roundAmount(i.unitFinalPrice * newQty),
            lineDiscount: roundAmount((i.unitOriginalPrice - i.unitFinalPrice) * newQty)
        } : i);
      }
      
      if (!isService && quantity > availableStock) {
          toast({ title: t('pos.stockLimit'), description: `Out of stock: ${variant ? variant.name : product.name}. Available: ${availableStock}`, variant: 'destructive' });
          return prev;
      }

      const originalPrice = roundAmount(product.allow_price_change ? effectivePrice : (variant ? (variant.price || basePrice) : pricing.originalPrice));
      const offerPrice = roundAmount(product.allow_price_change ? effectivePrice : (variant ? (variant.price || basePrice) : pricing.discountedPrice));
      const discountLabel = product.allow_price_change ? null : (variant ? null : pricing.discountLabel);

      const newItem = { 
          ...product, 
          product: product, 
          name: variant ? `${product.name} (${variant.name})` : product.name, 
          originalName: product.name, 
          variantId: variant ? variant.id : null, 
          variantName: variant ? variant.name : null, 
          variantBarcode: variant ? variant.barcode : null,
          quantity: quantity, 
          
          mrp: roundAmount(product.mrp || originalPrice), 
          unitOriginalPrice: originalPrice,
          offerPrice: offerPrice,
          unitFinalPrice: offerPrice,
          manualDiscountType: null,
          manualDiscountValue: 0,
          manualDiscountAmount: 0,
          lineDiscount: roundAmount((originalPrice - offerPrice) * quantity),
          lineSubtotal: roundAmount(offerPrice * quantity),
          appliedOfferId: product.allow_price_change ? null : (variant ? null : pricing.appliedOfferId),
          appliedOfferName: product.allow_price_change ? null : (variant ? null : pricing.appliedOfferName),
          appliedOfferType: product.allow_price_change ? null : (variant ? null : pricing.appliedOfferType),
          discountLabel: discountLabel,

          discount: 0, 
          discountType: 'percentage', 
          selling_price: offerPrice, 
          wholesale_price: product.wholesale_price, 
          stock_level: isService ? 999999 : availableStock, 
          is_service: isService,
          cartItemId: `${product.id}-${variant ? variant.id : 'base'}-${Date.now()}`, 
          unit: product.unit || 'pcs',
          applied_order_mode: billingMode,
          
          hsn_code: product.hsn_code || '', 
          gst_rate: product.tax_rate !== null && product.tax_rate !== undefined ? product.tax_rate : 18,
          tax_rate: product.tax_rate !== null && product.tax_rate !== undefined ? product.tax_rate : 18,
      };
      newCartItemId = newItem.cartItemId;
      return [newItem, ...prev];
    });
    
    setSearchTerm('');
    setSelectedSearchIndex(-1);
    setPendingAddItem(null); 
    
    if (newCartItemId) { setLastAddedItemId(newCartItemId); setHighlightItemId(newCartItemId); setTimeout(() => setHighlightItemId(null), 1000); }
    setTimeout(() => { searchInputRef.current?.focus(); }, 10);
  }, [toast, setCart, t, billingMode, getPriceForMode]);

  const applyManualItemDiscount = useCallback((cartItemId, type, value) => {
    setCart(prev => prev.map(item => {
        if (item.cartItemId === cartItemId) {
            const val = parseFloat(value) || 0;
            let manualAmt = 0;
            if (type === 'percentage') {
                manualAmt = roundAmount(item.offerPrice * (val / 100));
            } else if (type === 'amount') {
                manualAmt = roundAmount(val);
            }
            if (manualAmt > item.offerPrice) manualAmt = item.offerPrice;

            const finalPrice = roundAmount(item.offerPrice - manualAmt);
            return {
                ...item,
                manualDiscountType: type,
                manualDiscountValue: val,
                manualDiscountAmount: manualAmt,
                unitFinalPrice: finalPrice,
                lineDiscount: roundAmount((item.unitOriginalPrice - finalPrice) * item.quantity),
                lineSubtotal: roundAmount(finalPrice * item.quantity)
            };
        }
        return item;
    }));
  }, [setCart]);

  const removeManualItemDiscount = useCallback((cartItemId) => {
    setCart(prev => prev.map(item => {
        if (item.cartItemId === cartItemId) {
            const finalPrice = item.offerPrice;
            return {
                ...item,
                manualDiscountType: null,
                manualDiscountValue: 0,
                manualDiscountAmount: 0,
                unitFinalPrice: finalPrice,
                lineDiscount: roundAmount((item.unitOriginalPrice - finalPrice) * item.quantity),
                lineSubtotal: roundAmount(finalPrice * item.quantity)
            };
        }
        return item;
    }));
  }, [setCart]);

  const updateCartItem = useCallback((updatedItem) => {
    setCart(prev => prev.map(item => item.cartItemId === updatedItem.cartItemId ? updatedItem : item));
  }, [setCart]);

  const processSelectionStep = useCallback((itemContext) => {
      const { product, variant, quantity, price } = itemContext;
      if (!variant && product.variants && product.variants.length > 0) { setVariantSelectorProduct(product); setIsVariantSelectorOpen(true); return; }
      if (quantity === undefined) { 
          if (product.allow_quantity_change) { setPendingAddItem({ product, variant }); setIsQuantityDialogOpen(true); return; } 
          else { processSelectionStep({ ...itemContext, quantity: 1 }); return; } 
      }
      if (price === undefined) { 
          if (product.allow_price_change) { 
              setPendingAddItem({ product, variant, quantity }); 
              const basePrice = getPriceForMode(product, billingMode);
              const displayProduct = variant ? { ...product, selling_price: variant.price || basePrice } : { ...product, selling_price: basePrice }; 
              setPriceChangeProduct(displayProduct); setIsPriceChangeDialogOpen(true); return; 
          } else { 
              const basePrice = getPriceForMode(product, billingMode);
              const finalPrice = roundAmount(variant ? (variant.price || basePrice) : basePrice); 
              processSelectionStep({ ...itemContext, price: finalPrice }); return; 
          } 
      }
      handleAddToCart(product, price, variant, quantity);
  }, [handleAddToCart, billingMode, getPriceForMode]);

  const handleSelectProduct = useCallback((product) => { processSelectionStep({ product }); }, [processSelectionStep]);
  const handleVariantConfirm = (variant) => { processSelectionStep({ product: variantSelectorProduct, variant }); setVariantSelectorProduct(null); };
  const handleQuantityConfirm = (qty) => { if (pendingAddItem) { processSelectionStep({ ...pendingAddItem, quantity: qty }); } };
  const handlePriceChangeConfirm = (newPrice) => { if (pendingAddItem) { processSelectionStep({ ...pendingAddItem, price: roundAmount(newPrice) }); } setPriceChangeProduct(null); };
  
  const updateQuantity = (cartItemId, newQuantity) => { 
      const cartItem = cart.find(i => i.cartItemId === cartItemId); 
      if (!cartItem) return; 
      const isService = isServiceProduct(cartItem);
      if (!isService && newQuantity > (cartItem.stock_level || Infinity)) { toast({ title: t('pos.stockLimit'), description: `Only ${cartItem.stock_level} in stock.`, variant: 'destructive' }); return; } 
      setCart(prev => { 
          if (newQuantity <= 0) return prev.filter(i => i.cartItemId !== cartItemId); 
          return prev.map(i => {
              if (i.cartItemId === cartItemId) {
                  const pricing = getEffectiveUnitPrice(i.product || i, 1, new Date());
                  const basePrice = getPriceForMode(i.product || i, billingMode);
                  const originalPrice = roundAmount(i.product?.allow_price_change ? i.unitOriginalPrice : (i.variantId ? (i.variant?.price || basePrice) : pricing.originalPrice));
                  const offerPrice = roundAmount(i.product?.allow_price_change ? (i.offerPrice || i.unitOriginalPrice) : (i.variantId ? (i.variant?.price || basePrice) : pricing.discountedPrice));
                  const discountLabel = i.product?.allow_price_change ? null : (i.variantId ? null : pricing.discountLabel);
                  
                  let manualAmt = 0;
                  if (i.manualDiscountType === 'percentage') {
                      manualAmt = roundAmount(offerPrice * ((i.manualDiscountValue || 0) / 100));
                  } else if (i.manualDiscountType === 'amount') {
                      manualAmt = roundAmount(i.manualDiscountValue || 0);
                  }
                  if (manualAmt > offerPrice) manualAmt = offerPrice;

                  const finalPrice = roundAmount(offerPrice - manualAmt);

                  return { 
                      ...i, 
                      quantity: newQuantity,
                      unitOriginalPrice: originalPrice,
                      offerPrice: offerPrice,
                      unitFinalPrice: finalPrice,
                      manualDiscountAmount: manualAmt,
                      lineDiscount: roundAmount((originalPrice - finalPrice) * newQuantity),
                      lineSubtotal: roundAmount(finalPrice * newQuantity),
                      appliedOfferId: i.product?.allow_price_change ? null : (i.variantId ? null : pricing.appliedOfferId),
                      appliedOfferName: i.product?.allow_price_change ? null : (i.variantId ? null : pricing.appliedOfferName),
                      appliedOfferType: i.product?.allow_price_change ? null : (i.variantId ? null : pricing.appliedOfferType),
                      discountLabel: discountLabel,
                      selling_price: finalPrice
                  };
              }
              return i;
          }); 
      }); 
  };
  
  const removeFromCart = (cartItemId) => setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));

  const searchResults = useMemo(() => {
    if (isLoadingProducts || !debouncedSearchTerm) return [];
    const q = debouncedSearchTerm.toLowerCase();
    return allProducts.filter(p => (p.name || '').toLowerCase().includes(q) || String(p.sku || '').toLowerCase().includes(q) || String(p.barcode || '').toLowerCase().includes(q) || (p.search_keywords && p.search_keywords.some(k => k.toLowerCase().includes(q))));
  }, [debouncedSearchTerm, allProducts, isLoadingProducts]);

  const maxRedeemValue = roundAmount(baseBillValue * (loyaltyConfig.redeem_percentage / 100));
  const maxRedeemCoins = Math.floor(maxRedeemValue / loyaltyConfig.coin_value);
  const actualCoinsToRedeem = redeemCoins ? Math.min(coinsToRedeem, selectedCustomer?.loyalty_points || 0, maxRedeemCoins) : 0;
  const coinDiscountAmount = roundAmount(actualCoinsToRedeem * loyaltyConfig.coin_value);
  
  const creditNoteAmount = useMemo(() => roundAmount(appliedCreditNotes.reduce((sum, cn) => sum + cn.applied_amount, 0)), [appliedCreditNotes]);
  
  const manualPending = roundAmount(parseFloat(manualPendingAmount) || 0);
  
  const saleTotal = useMemo(() => {
    return roundAmount(Math.max(0, baseBillValue - coinDiscountAmount - creditNoteAmount));
  }, [baseBillValue, coinDiscountAmount, creditNoteAmount]);

  const totalPayable = useMemo(() => roundAmount(saleTotal + manualPending), [saleTotal, manualPending]);
  const totalDiscount = roundAmount(itemDiscountsTotal + globalDiscountAmount + coinDiscountAmount);

  const taxName = retailerSettings?.tax_type || 'Tax';

  const handleIncreaseQuantity = useCallback(() => { if (cart.length === 0) return; const targetItemId = lastAddedItemId || cart[0]?.cartItemId; if (!targetItemId) return; const item = cart.find(i => i.cartItemId === targetItemId); if (item) { updateQuantity(targetItemId, item.quantity + 1); setHighlightItemId(targetItemId); setTimeout(() => setHighlightItemId(null), 800); } }, [cart, lastAddedItemId]);
  const handleDecreaseQuantity = useCallback(() => { if (cart.length === 0) return; const targetItemId = lastAddedItemId || cart[0]?.cartItemId; if (!targetItemId) return; const item = cart.find(i => i.cartItemId === targetItemId); if (item && item.quantity > 0.001) { updateQuantity(targetItemId, Math.max(0.001, item.quantity - 1)); setHighlightItemId(targetItemId); setTimeout(() => setHighlightItemId(null), 800); } }, [cart, lastAddedItemId]);

  useQuantityKeyboardShortcuts(handleIncreaseQuantity, handleDecreaseQuantity, !isAnyModalOpen && cart.length > 0);

  const fetchCreditNotes = async () => {
    if (!customerPhone) {
        toast({ title: "Phone Required", description: "Enter a mobile number to search credit notes." });
        return;
    }
    await checkCreditNotes(customerPhone);
    setIsCreditNoteModalOpen(true);
  };

  const handleApplyCreditNote = async (note, amount) => {
    const roundedAmount = roundAmount(amount);
    try {
      const { data, error } = await supabase.rpc('record_credit_note_usage', {
        p_credit_note_id: note.id,
        p_amount_used: roundedAmount,
        p_bill_id: temporaryBillId
      });

      if (error) throw error;

      setAppliedCreditNotes(prev => [...prev, {
        ...note,
        applied_amount: roundedAmount,
        usage_id: data.usage_id
      }]);
      
      setIsCreditNoteModalOpen(false);
      toast({ title: "Credit Note Applied", description: `₹${roundedAmount.toFixed(2)} deducted.` });
      
      checkCreditNotes(customerPhone);
      
    } catch (err) {
      toast({ title: "Failed to apply", description: err.message, variant: "destructive" });
    }
  };
  
  const handleRemoveCreditNote = async (noteToRemove) => {
    try {
      if (noteToRemove.usage_id) {
        const { error } = await supabase.rpc('reverse_credit_note_usage', {
          p_usage_id: noteToRemove.usage_id
        });
        if (error) throw error;
      }
      
      setAppliedCreditNotes(prev => prev.filter(cn => cn.id !== noteToRemove.id));
      toast({ title: "Credit Note Removed", description: "The amount has been restored to the note." });
      
      checkCreditNotes(customerPhone);
      
    } catch (err) {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    }
  };

  const handlePushOrderToCart = (order) => {
    if (!order || !order.order_items || !Array.isArray(order.order_items) || order.order_items.length === 0) {
      toast({ title: 'Invalid Order', description: 'This order has no items to push.', variant: 'destructive' });
      return;
    }

    const mappedItems = order.order_items.map((item, idx) => {
      const matchedProduct = allProducts.find(p => p.id === item.product_id || p.name === item.product_name);
      
      const baseItem = matchedProduct || {
        id: item.product_id || `booked-${idx}`,
        name: item.product_name || 'Unknown Product',
        stock_level: 9999,
        unit: 'pcs',
        tax_rate: 0
      };

      const price = roundAmount(parseFloat(item.unit_price) || 0);
      const qty = parseFloat(item.quantity) || 1;

      return {
        ...baseItem,
        product: baseItem,
        cartItemId: `booked-${order.id}-${idx}-${Date.now()}`,
        quantity: qty,
        unitOriginalPrice: price,
        offerPrice: price,
        unitFinalPrice: price,
        selling_price: price,
        mrp: price,
        lineDiscount: 0,
        lineSubtotal: roundAmount(price * qty),
        manualDiscountType: null,
        manualDiscountValue: 0,
        manualDiscountAmount: 0,
        applied_order_mode: billingMode
      };
    });

    let extractedPhone = order.customer_phone || order.phone || order.contact_number || order.retailer_phone || '';
    const extractedName = order.retailer_name || order.customer_name || 'Booked Customer';

    if (!extractedPhone && extractedName && customers.length > 0) {
      const matchedCustomer = customers.find(c => c.name.toLowerCase() === extractedName.toLowerCase());
      if (matchedCustomer && matchedCustomer.phone) {
        extractedPhone = matchedCustomer.phone;
      }
    }

    loadOrderIntoCart(mappedItems, {
      name: extractedName,
      phone: extractedPhone
    }, order.id);

    setIsBookOrdersModalOpen(false);
    toast({ title: 'Order Pushed', description: `Successfully loaded ${mappedItems.length} items to POS.` });
  };

  const handleCheckout = async (paymentDetails) => {
    setIsProcessingSale(true);
    setSelectedPaymentMethod(null); 

    try {
      let finalCustomerId = selectedCustomer?.id || null;
      let finalPhone = customerPhone.trim();
      let finalName = customerName.trim();

      if (paymentDetails === 'Credit') {
          if (!finalCustomerId && (!finalPhone || !finalName)) { throw new Error("Customer phone and name are required for credit sales."); }
      }

      if (finalPhone) {
          const { data: existingCustomerData } = await supabase.from('point_of_sale_customers').select('*').eq('user_id', posUserId).eq('phone', finalPhone).maybeSingle();
          if (existingCustomerData) {
              finalCustomerId = existingCustomerData.id;
              if (finalName && existingCustomerData.name !== finalName) {
                  await supabase.from('point_of_sale_customers').update({ name: finalName }).eq('id', finalCustomerId);
                  setCustomers(prev => prev.map(c => c.id === finalCustomerId ? { ...c, name: finalName } : c));
              }
          } else {
              const newName = finalName || `Customer ${finalPhone}`;
              const { data: newC, error: createErr } = await supabase.from('point_of_sale_customers').insert({ user_id: posUserId, phone: finalPhone, name: newName, created_at: new Date().toISOString(), customer_type: 'retail' }).select().single();
              if (createErr) throw createErr;
              if (newC) { finalCustomerId = newC.id; setCustomers(prev => [...prev, newC]); toast({ title: t('pos.customer') + " Saved", description: t('pos.newCustomer') }); }
          }
      }

      const isGst = gstBillingMode === 'gst';
      let docData;
      
      if (isGst) {
          docData = await generateInvoiceNumber(posUserId);
      } else {
          docData = await generateBillNumber(posUserId);
      }
      
      const loyaltyPointsEarned = (customerPhone || finalCustomerId) ? Math.floor(saleTotal * (loyaltyConfig.earning_percentage / 100)) : 0;
      
      let salePayload = {}; 
      let paymentMethodString; 
      let amountPaidForSale = 0; 
      let amountForCreditPayment = 0; 
      let balanceDue = 0; 
      let paymentStatus = 'Paid';
      const currentSaleTotal = saleTotal; 
      const reminderAmount = manualPending;

      if (Array.isArray(paymentDetails)) {
        paymentMethodString = "Split";
        const cashAmount = roundAmount(paymentDetails.find(p => p.method === 'Cash')?.amount || 0);
        const upiAmount = roundAmount(paymentDetails.find(p => p.method === 'UPI')?.amount || 0);
        salePayload.split_payment_details = { cash_amount: cashAmount, upi_amount: upiAmount };
        const totalReceived = roundAmount(cashAmount + upiAmount);
        if (totalReceived >= currentSaleTotal) { amountPaidForSale = currentSaleTotal; balanceDue = 0; amountForCreditPayment = roundAmount(totalReceived - currentSaleTotal); } 
        else { amountPaidForSale = totalReceived; balanceDue = roundAmount(currentSaleTotal - totalReceived); paymentStatus = 'Partial'; amountForCreditPayment = 0; }
      } else if (paymentDetails === 'Credit') {
          paymentMethodString = 'Credit'; amountPaidForSale = 0; balanceDue = currentSaleTotal; paymentStatus = 'Unpaid'; amountForCreditPayment = 0;
      } else {
        paymentMethodString = paymentDetails; salePayload.split_payment_details = null; amountPaidForSale = currentSaleTotal; balanceDue = 0; amountForCreditPayment = reminderAmount;
      }
      
      const discountFactor = netTotalInclusive > 0 ? ((saleTotal + creditNoteAmount) / netTotalInclusive) : 1;
      
      const saleItemsPrepared = cart.map(item => {
          const itemEffective = (item.lineSubtotal || 0) * discountFactor; 
          const rate = isGst ? (item.tax_rate !== null && item.tax_rate !== undefined ? item.tax_rate : (item.gst_rate !== null && item.gst_rate !== undefined ? item.gst_rate : 0)) : 0;
          const taxAmt = roundAmount(itemEffective * (1 + (rate / 100)) > 0 ? itemEffective - (itemEffective / (1 + (rate / 100))) : 0);
          const taxable = roundAmount(itemEffective - taxAmt);
          
          let discountAmt = roundAmount(item.manualDiscountAmount || 0);
          if (discountAmt === 0 && (item.unitOriginalPrice - item.unitFinalPrice) > 0) {
              discountAmt = roundAmount(item.unitOriginalPrice - item.unitFinalPrice);
          }

          let discountPercentage = 0;
          if (item.manualDiscountType === 'percentage') {
              discountPercentage = item.manualDiscountValue;
          } else if (item.mrp && item.mrp > 0 && discountAmt > 0) {
              discountPercentage = roundAmount((discountAmt / item.mrp) * 100);
          }

          return {
              product_id: item.id,
              quantity: item.quantity,
              unit_price: item.unitFinalPrice || item.selling_price, 
              tax_rate: rate,
              total_price: taxable, 
              is_refunded: false,
              variant_id: item.variantId || null,
              variant_name: item.variantName || null,
              hsn_code: item.hsn_code,
              name: item.name, 
              product: item,
              
              mrp: item.mrp || item.unitOriginalPrice,
              discount_amount: roundAmount(discountAmt * item.quantity),
              discount_type: item.manualDiscountType || 'amount',
              discount_percentage: discountPercentage
          };
      });

      const dbPayload = {
          user_id: posUserId, 
          customer_id: finalCustomerId, 
          discount_amount: totalDiscount, 
          total_amount: currentSaleTotal, 
          payment_method: paymentMethodString, 
          customer_phone: finalPhone || null, 
          amount_paid: amountPaidForSale, 
          balance_due: balanceDue, 
          payment_status: paymentStatus, 
          loyalty_points_earned: loyaltyPointsEarned, 
          loyalty_points_redeemed: actualCoinsToRedeem, 
          loyalty_discount_amount: coinDiscountAmount, 
          status: 'Completed', 
          order_type: billingMode === 'wholesale' ? 'Wholesaler' : 'Retailer', 
          billing_mode: billingMode, 
          customer_type: billingMode === 'wholesale' ? 'wholesale' : 'retail',
          billing_type: isGst ? 'gst_invoice' : 'without_gst',
          subtotal: netTotalInclusive,
          tax_amount: isGst ? taxBreakdown.totalTax : 0,
          tax_type: taxName,
          invoice_number: isGst ? docData.formatted : null,
          bill_number: !isGst ? docData.formatted : null,
          invoice_financial_year: docData.yearMonth,
          invoice_serial_number: isGst ? docData.serial : null,
          bill_serial_number: !isGst ? docData.serial : null,
          invoice_month: isGst ? docData.yearMonth : null,
          bill_month: !isGst ? docData.yearMonth : null,
          ...salePayload 
      };

      const { data: saleData, error: saleError } = await supabase.from('point_of_sale_sales').insert(dbPayload).select().single();

      if (saleError) throw saleError;

      if (saleItemsPrepared.length > 0) {
          const dbItems = saleItemsPrepared.map(({name, product, ...rest}) => ({ ...rest, sale_id: saleData.id }));
          const { error: itemsError } = await supabase.from('point_of_sale_sale_items').insert(dbItems);
          if (itemsError) { await supabase.from('point_of_sale_sales').delete().eq('id', saleData.id); throw itemsError; }
      }
      
      if (amountForCreditPayment > 0 && finalCustomerId) { await supabase.from('pos_credit_payments').insert({ user_id: posUserId, sale_id: saleData.id, customer_id: finalCustomerId, amount: amountForCreditPayment, payment_method: paymentMethodString, notes: 'Payment for previous balance via POS' }); }
      if (finalCustomerId && actualCoinsToRedeem > 0) { await supabase.rpc('deduct_loyalty_points', { row_id: finalCustomerId, amount: actualCoinsToRedeem }); }
      
      if (appliedCreditNotes.length > 0) {
          for (const note of appliedCreditNotes) {
             if (note.usage_id) {
               await supabase.from('pos_credit_note_usage')
                 .update({ bill_id: saleData.id })
                 .eq('id', note.usage_id);
             }
          }
      }

      if (currentBookedOrderId) {
        try {
            const { error: bookedUpdateError } = await supabase
                .from('booked_orders')
                .update({ 
                    order_status: 'Confirmed', 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', currentBookedOrderId);
            
            if (bookedUpdateError) {
                console.error('Failed to update booked order status:', bookedUpdateError);
            } else {
                toast({ 
                    title: 'Booked Order Confirmed', 
                    description: 'The source booked order has been marked as confirmed.',
                });
            }
        } catch (err) {
            console.error('Error during booked order status update:', err);
        }
        setCurrentBookedOrderId(null);
      }

      const docLabel = isGst ? 'Invoice No.' : 'Bill No.';
      toast({ title: t('pos.saleCompleted'), description: `${docLabel} ${docData.formatted} Generated` });
      
      if (printReceipt) {
          generateReceiptPDF(businessDetails, saleData, saleItemsPrepared, { name: finalName || (finalCustomerId ? `Customer ${finalPhone}` : 'Walk-in'), phone: finalPhone }, amountForCreditPayment, t);
      }

      clearCart();
      clearGlobalDiscount(); 
      setSelectedCustomer(null);
      setCustomerPhone('');
      setCustomerName('');
      
      setRedeemCoins(false);
      setCoinsToRedeem(0);
      setPrintReceipt(false);
      setCustomerPendingBalance(0);
      setManualPendingAmount('');
      setAppliedCreditNotes([]);
      setAvailableCreditNotes([]);
      setTemporaryBillId(`temp_${Date.now()}_${Math.random().toString(36).substring(7)}`);
      
      fetchAllProducts();
      refreshData();
      setIsSplitPaymentOpen(false);
      setIsCashDialogOpen(false);
      setIsCreditConfirmOpen(false);
      fetchCustomers();

    } catch (err) {
      console.error(err);
      toast({ title: 'Error processing sale', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessingSale(false);
    }
  };
  
  const handlePaymentMethodSelect = (method) => {
      if (cart.length === 0 && (!manualPendingAmount || parseFloat(manualPendingAmount) <= 0)) { toast({ title: t('pos.cartEmpty'), description: 'Please add items or enter pending amount.', variant: 'destructive' }); return; }
      setSelectedPaymentMethod(method);
      if (method === 'Cash') { setIsCashDialogOpen(true); } 
      else if (method === 'Split') { setIsSplitPaymentOpen(true); } 
      else if (method === 'Credit') { 
          if (!customerPhone && !customerName && !selectedCustomer) { toast({ title: "Customer Required", description: "Please enter customer phone and name for credit sales.", variant: "destructive" }); const phoneInput = document.querySelector('input[type="text"]'); if(phoneInput) phoneInput.focus(); setSelectedPaymentMethod(null); return; } 
          setIsCreditConfirmOpen(true); 
      } else { handleCheckout(method); }
  };

  const processBarcodeOrSearch = useCallback((code, source = 'manual') => {
      const cleanCode = code.trim().toLowerCase();
      if (!cleanCode) return false;
      for (const product of allProducts) {
          if (product.variants && Array.isArray(product.variants)) {
              const matchingVariant = product.variants.find(v => v.barcode && v.barcode.toLowerCase() === cleanCode);
              if (matchingVariant) {
                  handleAddToCart(product, matchingVariant.price || product.selling_price, matchingVariant, 1);
                  toast({ title: "Variant Added", description: `${product.name} (${matchingVariant.name}) added via barcode.` });
                  return true;
              }
          }
      }
      const exactProductMatch = allProducts.find(p => (p.barcode && p.barcode.toLowerCase() === cleanCode) || (p.sku && p.sku.toLowerCase() === cleanCode));
      if (exactProductMatch) {
          if (exactProductMatch.variants && exactProductMatch.variants.length > 0) { handleSelectProduct(exactProductMatch); return true; }
          handleAddToCart(exactProductMatch, exactProductMatch.selling_price, null, 1);
          toast({ title: "Product Added", description: `${exactProductMatch.name} added via barcode.` });
          return true;
      }
      return false;
  }, [allProducts, handleAddToCart, handleSelectProduct, toast]);

  const handleBarcodeScanned = useCallback((code) => {
    const success = processBarcodeOrSearch(code, 'scanner');
    if (success) { setIsScannerOpen(false); } else { toast({ title: "Barcode Not Found", description: `No product found for code: ${code}`, variant: "destructive" }); }
    return success;
  }, [processBarcodeOrSearch, toast]);

  const handleOpenScanner = () => { setIsScannerOpen(true); };

  const handleSearchKeyDown = (e) => {
      if (searchResults.length > 0) {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0)); } 
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSearchIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1)); } 
          else if (e.key === 'Enter') {
              e.preventDefault();
              if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) { handleSelectProduct(searchResults[selectedSearchIndex]); } 
              else if (searchTerm) { const success = processBarcodeOrSearch(searchTerm, 'input'); if (!success && searchResults.length > 0) { handleSelectProduct(searchResults[0]); } else if (!success) { toast({ title: "Product Not Found", description: "Try selecting from the list.", variant: "destructive" }); } }
          } else if (e.key === 'Escape') { e.preventDefault(); setSearchTerm(''); setSelectedSearchIndex(-1); }
      } else if (e.key === 'Enter' && searchTerm) { e.preventDefault(); const success = processBarcodeOrSearch(searchTerm, 'input'); if (!success) { toast({ title: "Product Not Found", description: `No item found for "${searchTerm}"`, variant: "destructive" }); } } else if (e.key === 'Escape') { setSearchTerm(''); }
  };

  const handleResumeSale = (sale) => {
    if (cart.length > 0) {
        if (!window.confirm("This will replace your current cart. Continue?")) return;
    }
    
    rollbackAllCreditNotes();
    
    const items = typeof sale.cart_items === 'string' ? JSON.parse(sale.cart_items) : sale.cart_items;
    
    const validatedItems = items.map(item => {
        const pricing = getEffectiveUnitPrice(item.product || item, 1, new Date());
        const basePrice = getPriceForMode(item.product || item, billingMode);
        const originalPrice = roundAmount(item.product?.allow_price_change ? item.unitOriginalPrice : (item.variantId ? (item.variant?.price || basePrice) : pricing.originalPrice));
        const offerPrice = roundAmount(item.product?.allow_price_change ? (item.offerPrice || item.unitOriginalPrice) : (item.variantId ? (item.variant?.price || basePrice) : pricing.discountedPrice));
        const discountLabel = item.product?.allow_price_change ? null : (item.variantId ? null : pricing.discountLabel);
        
        let manualAmt = 0;
        if (item.manualDiscountType === 'percentage') {
            manualAmt = roundAmount(offerPrice * ((item.manualDiscountValue || 0) / 100));
        } else if (item.manualDiscountType === 'amount') {
            manualAmt = roundAmount(item.manualDiscountValue || 0);
        }
        if (manualAmt > offerPrice) manualAmt = offerPrice;

        const finalPrice = roundAmount(offerPrice - manualAmt);

        return {
           ...item,
           unitOriginalPrice: originalPrice,
           offerPrice: offerPrice,
           unitFinalPrice: finalPrice,
           manualDiscountAmount: manualAmt,
           lineDiscount: roundAmount((originalPrice - finalPrice) * item.quantity),
           lineSubtotal: roundAmount(finalPrice * item.quantity),
           appliedOfferId: item.product?.allow_price_change ? null : (item.variantId ? null : pricing.appliedOfferId),
           appliedOfferName: item.product?.allow_price_change ? null : (item.variantId ? null : pricing.appliedOfferName),
           appliedOfferType: item.product?.allow_price_change ? null : (item.variantId ? null : pricing.appliedOfferType),
           discountLabel: discountLabel,
           selling_price: finalPrice
        };
    });

    setCart(validatedItems || []);
    
    if (sale.customer_details) {
        const c = sale.customer_details;
        setSelectedCustomer(c);
        setCustomerName(c.name || '');
        setCustomerPhone(c.phone || '');
        if (c.id) checkPendingBalance(c.id, c.name);
        if (c.phone) checkCreditNotes(c.phone);
    } else {
        handleClearCustomer();
    }
    
    toast({
        title: "Sale Resumed",
        description: `Loaded ${validatedItems?.length || 0} items from saved sale.`,
    });
    
    setIsResumeSaleModalOpen(false);
  };

  const handleSaveSuccess = (shouldClear) => {
    if (shouldClear) {
        clearCart();
        handleClearCustomer();
        clearGlobalDiscount();
    }
  };

  usePaymentMethodShortcuts(!isProcessingSale && !isAnyModalOpen && (cart.length > 0 || parseFloat(manualPendingAmount) > 0), handlePaymentMethodSelect);

  const isMobileSearchActive = mobileSearchActive;
  const saveSaleButton = (
      <Button 
      variant="ghost" 
      size="icon" 
      className="relative h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-transparent hover:border-slate-600 shadow-sm flex items-center justify-center text-blue-400 hover:text-blue-300"
      onClick={() => setIsSaveSaleModalOpen(true)}
      disabled={cart.length === 0}
      title="Save current sale"
      >
      <FileText className="h-6 w-6" />
      </Button>
  );

  const resumeSaleButton = (
      <Button 
      variant="ghost" 
      size="icon" 
      className="relative h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-transparent hover:border-slate-600 shadow-sm flex items-center justify-center text-blue-400 hover:text-blue-300"
      onClick={() => setIsResumeSaleModalOpen(true)}
      title="Resume saved sale"
      >
      <RotateCcw className="h-6 w-6" />
      </Button>
  );

  const calculatorButton = (
      <Button
      variant="ghost"
      size="icon"
      className="relative h-12 w-12 rounded-full shadow-sm flex items-center justify-center bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400"
      onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
      title="Open calculator"
      data-edit-disabled="true"
      >
      <CalculatorIcon className="h-6 w-6" />
      </Button>
  );

  const viewOrdersButton = (
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-12 w-12 rounded-full shadow-sm flex items-center justify-center bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-400"
          onClick={() => setIsBookOrdersModalOpen(true)}
          title="View Orders Booked by Sales Executives"
          aria-label="View Orders Booked by Sales Executives"
        >
          <ClipboardList className="h-6 w-6" />
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
  );

  const scannerButton = (
      <Button 
      variant="ghost" 
      size="icon" 
      className="relative h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-transparent hover:border-slate-600 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-400" 
      onClick={handleOpenScanner} 
      title="Scan Barcode"
      >
      <Barcode className="h-6 w-6" />
      </Button>
  );

  if (isLoadingCurrency) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-400 font-medium">Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-h-screen overflow-hidden p-2 sm:p-4 pb-0 bg-slate-950 text-slate-100 relative">
      <Helmet><title>{title}</title><meta name="description" content={description} /></Helmet>

      <FloatingCalculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      
      {isScannerOpen && (<BarcodeScanner isOpen={isScannerOpen} onScanSuccess={handleBarcodeScanned} onClose={() => setIsScannerOpen(false)} title={t('pos.scanProduct')} instructions="Point at product barcode" />)}

      <SaveSaleModal 
        isOpen={isSaveSaleModalOpen} 
        onClose={() => setIsSaveSaleModalOpen(false)}
        cart={cart}
        customer={selectedCustomer || (customerName || customerPhone ? { name: customerName, phone: customerPhone } : null)}
        total={totalPayable}
        onSaveSuccess={handleSaveSuccess}
      />

      <ResumeSaleModal 
        isOpen={isResumeSaleModalOpen}
        onClose={() => setIsResumeSaleModalOpen(false)}
        onResumeSale={handleResumeSale}
      />

      <AvailableCreditNotesPanel 
        open={isCreditNoteModalOpen}
        onOpenChange={setIsCreditNoteModalOpen}
        creditNotes={availableCreditNotes}
        onApply={handleApplyCreditNote}
        maxAllowedAmount={Math.max(0, baseBillValue - coinDiscountAmount - creditNoteAmount)}
        currentBillId={temporaryBillId}
      />

      <div className="w-full lg:w-[65%] xl:w-[70%] flex flex-col gap-4 overflow-visible shrink-0 h-auto lg:h-full">
        <div className={`relative z-50 w-full ${isMobileSearchActive ? 'fixed top-0 left-0 right-0 p-3 bg-slate-950 shadow-lg' : ''}`}>
            
            <div className="mb-4 flex items-center justify-between">
               <POSModeSwitch />
            </div>

            <div className="relative w-full mx-auto group flex items-center gap-3">
              {isLoadingProducts ? (
                  <div className="relative flex-grow h-14 bg-slate-800 animate-pulse rounded-full flex items-center px-6 border border-slate-700">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400 mr-3" />
                      <span className="text-slate-400 font-medium">Loading products...</span>
                  </div>
              ) : (
                  <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                    <Input id="pos-product-search" ref={searchInputRef} tabIndex="1" placeholder={t('pos.searchPlaceholder')} className="pl-12 pr-4 h-14 text-lg rounded-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/50 transition-all" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); if (selectedSearchIndex !== -1) setSelectedSearchIndex(-1); }} onKeyDown={handleSearchKeyDown} disabled={isLoadingProducts} autoComplete="off" />
                    
                    {!isLoadingProducts && allProducts.length > 0 && (
                        <div className="absolute -bottom-5 left-4 text-[10px] text-slate-400 font-medium">
                            {allProducts.length} products loaded
                        </div>
                    )}
                    
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {productFetchError && !isLoadingProducts && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500 hover:bg-red-500/20" onClick={fetchAllProducts} title="Retry Fetch">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        )}
                        {searchTerm && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-100 hover:bg-slate-800" onClick={() => { setSearchTerm(''); setSelectedSearchIndex(-1); }}><X className="h-4 w-4" /></Button>}
                    </div>
                    <AnimatePresence>
                        {searchResults.length > 0 && !productFetchError && (<motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute left-0 w-full top-full mt-2 z-50"><CommandListElement results={searchResults} onSelect={handleSelectProduct} selectedIndex={selectedSearchIndex} showCostPrice={showCostPrice} /></motion.div>)}
                        
                        {searchTerm && debouncedSearchTerm && searchResults.length === 0 && !isLoadingProducts && !productFetchError && (
                            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute left-0 w-full top-full mt-2 z-50">
                                <div className="p-6 text-center text-sm text-slate-400 bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
                                    No results found for "{searchTerm}"
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
              )}
              <div className="hidden md:flex gap-2 shrink-0">
                  {saveSaleButton}
                  {resumeSaleButton}
                  {calculatorButton}
                  {viewOrdersButton}
                  {scannerButton}
              </div>
            </div>
            
            <div className="md:hidden w-full flex gap-2 mt-2 justify-end">
                {saveSaleButton}
                {resumeSaleButton}
                {calculatorButton}
                {viewOrdersButton}
                {scannerButton}
            </div>
        </div>

        <div className="hidden lg:flex flex-col flex-grow bg-slate-900 rounded-xl shadow-inner p-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <ShoppingCart className="w-16 h-16 mb-4 text-slate-400" />
              <p className="text-lg font-medium text-slate-100">{t('pos.cartEmpty')}</p>
              <p className="text-sm text-slate-400/70">{t('pos.cartEmptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {cart.map(item => (
                  <motion.div key={item.cartItemId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, backgroundColor: highlightedItemId === item.cartItemId ? 'rgba(59, 130, 246, 0.2)' : '#0f172a', scale: highlightedItemId === item.cartItemId ? 1.02 : 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate text-slate-100">{item.name}</div>
                      <div className="flex flex-wrap gap-x-2 text-xs text-slate-400 items-center mt-1">
                          {item.variantBarcode && <span className="font-mono bg-slate-950 px-1 rounded text-slate-300">{item.variantBarcode}</span>}
                          
                          <span className="font-medium text-slate-300">MRP: {formatPrice(item.mrp || item.unitOriginalPrice)}</span>
                          
                          {item.unitOriginalPrice > item.unitFinalPrice ? (
                              <>
                                  <span className="price-strikethrough">{formatPrice(item.unitOriginalPrice)}</span>
                                  <span className="price-final-highlight">{formatPrice(item.unitFinalPrice)}</span>
                              </>
                          ) : (
                              <span className="font-bold text-slate-100">{formatPrice(item.unitFinalPrice)}</span>
                          )}
                          
                          {gstBillingMode === 'gst' && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({taxName}: {item.tax_rate !== null && item.tax_rate !== undefined ? item.tax_rate : (item.gst_rate !== null && item.gst_rate !== undefined ? item.gst_rate : 0)}%)
                            </span>
                          )}
                          
                          <ManualDiscountPopover item={item} onApply={applyManualItemDiscount} onRemove={removeManualItemDiscount} />

                          {item.discountLabel && (
                              <Badge variant="outline" className="discount-label-offer ml-1">
                                  {item.discountLabel} (Offer)
                              </Badge>
                          )}
                          {item.manualDiscountAmount > 0 && (
                              <Badge variant="outline" className="discount-label-manual ml-1 text-green-400 border-green-400/30 bg-green-400/10">
                                  Discount: {item.manualDiscountType === 'percentage' ? `${item.manualDiscountValue}%` : formatPrice(item.manualDiscountAmount)}
                              </Badge>
                          )}
                          {item.applied_order_mode === 'wholesale' && <Badge variant="secondary" className="h-4 text-[10px] px-1 bg-purple-600 text-white ml-1">Wholesale</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => updateQuantity(item.cartItemId, Math.max(0, item.quantity - 1))} className="h-8 w-8 shrink-0 bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800"> <Minus className="h-4 w-4"/> </Button>
                      <div className="flex items-center gap-1 flex-col">
                        <div className="flex items-center gap-1"><Input type="number" step="0.001" value={item.quantity} onChange={(e) => updateQuantity(item.cartItemId, parseFloat(e.target.value) || 0)} className="w-20 h-8 text-center bg-slate-800 text-slate-100 border-slate-700"/><span className="text-sm font-medium text-slate-400">{item.unit || 'pcs'}</span></div>
                        <span className={`text-[10px] ${!isServiceProduct(item) && item.stock_level < 10 ? 'text-orange-400 font-bold' : 'text-slate-400/70'}`}>{isServiceProduct(item) ? (<span className="flex items-center gap-1 text-secondary font-medium"><Briefcase className="w-3 h-3" /> Service</span>) : (`Stock: ${Number(item.stock_level).toFixed(3).replace(/\.?0+$/, '')}`)}</span>
                      </div>
                      <Button size="icon" variant="outline" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="h-8 w-8 shrink-0 bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800"> <Plus className="h-4 w-4"/> </Button>
                    </div>
                    <div className="w-28 text-right flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <div className="text-right">
                                  {item.unitOriginalPrice > item.unitFinalPrice && <div className="text-xs text-slate-400 line-through decoration-slate-500">{formatPrice(item.unitOriginalPrice * item.quantity)}</div>}
                                  <motion.div key={`price-${item.lineSubtotal}`} initial={{ scale: 1.1, color: '#3b82f6' }} animate={{ scale: 1, color: item.unitOriginalPrice > item.unitFinalPrice ? '#34d399' : '#f1f5f9' }} className={`font-semibold ${item.unitOriginalPrice > item.unitFinalPrice ? 'text-emerald-400' : 'text-slate-100'}`}>{formatPrice(item.lineSubtotal)}</motion.div>
                            </div>
                        </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.cartItemId)} className="h-8 w-8 shrink-0 text-red-500 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /></Button>
                  </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-[35%] xl:w-[30%] flex flex-col flex-1 lg:h-full min-h-0 lg:overflow-visible overflow-hidden">
        <Card className="bg-slate-900 text-slate-100 shadow-lg rounded-2xl h-full flex flex-col border border-slate-800">
          <CardHeader className="pb-2 md:pb-3 flex flex-col gap-3"> 
            <div className="flex flex-row items-center justify-between w-full">
              <CardTitle className="text-xl md:text-2xl text-slate-100">{t('pos.checkout')}</CardTitle>
              <div className="flex flex-col items-end">
                  <Badge variant={billingMode === 'wholesale' ? 'default' : 'outline'} className={billingMode === 'wholesale' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-100 border-slate-700'}>{billingMode === 'wholesale' ? <Briefcase className="w-3 h-3 mr-1" /> : <ShoppingCart className="w-3 h-3 mr-1" />}{billingMode.toUpperCase()} MODE</Badge>
              </div>
            </div>
            <BillingModeToggle mode={gstBillingMode} onChange={setGstBillingMode} />
          </CardHeader>
          <CardContent className="flex-grow flex flex-col overflow-y-auto p-3 md:p-6 pt-3 mobile-scrollbar pb-32 lg:pb-6"> 
            <div className="space-y-2 md:space-y-3 mb-4 relative z-20"> 
              <div className="flex flex-col gap-2 md:gap-3">
                  <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type="text" tabIndex="2" placeholder={t('pos.searchCustomer')} className="pl-10 h-12 text-base bg-slate-950 text-slate-100 border-slate-700 placeholder:text-slate-400 focus:border-blue-500" value={customerPhone} onChange={(e) => { const val = e.target.value; setCustomerPhone(val); setShowCustomerPredictions(true); }} onFocus={() => setShowCustomerPredictions(true)} autoComplete="off" />
                         {customerPhone && (<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">{isCustomerSearchLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-400 mr-1" />}<Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800" onClick={handleClearCustomer}><X className="h-4 w-4" /></Button></div>)}
                        <AnimatePresence>{showCustomerPredictions && (customerSearchResults.length > 0 || isCustomerSearchLoading || customerSearchError) && (<CustomerPredictionList results={customerSearchResults} loading={isCustomerSearchLoading} error={customerSearchError} onSelect={handleCustomerSelect} selectedIndex={selectedCustomerIndex} term={customerPhone} />)}</AnimatePresence>
                      </div>
                      <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 bg-slate-950 border-slate-700 hover:bg-slate-800" onClick={() => setIsAddCustomerOpen(true)} title={t('pos.addCustomer')}><UserPlus className="h-5 w-5 text-slate-100" /></Button>
                  </div>
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input type="text" tabIndex="3" placeholder={t('pos.customerName')} className="pl-10 h-12 text-base bg-slate-950 text-slate-100 border-slate-700 placeholder:text-slate-400 focus:border-blue-500" value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoComplete="off" /></div>
                  
                  <div className="flex flex-col gap-2 w-full mt-2">
                      {availableCreditNotes && availableCreditNotes.length > 0 && (
                        <div className="credit-note-alert w-full cursor-pointer hover:opacity-90 transition-opacity" onClick={fetchCreditNotes}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-amber-500/20 p-1.5 rounded-full shrink-0">
                              <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                            </div>
                            <span className="font-bold text-amber-900 dark:text-amber-100 text-sm">
                              {availableCreditNotes.length} Credit Note(s) Available
                            </span>
                          </div>
                          <div className="text-xs text-amber-800 dark:text-amber-200">
                            Click to view and apply credit notes
                          </div>
                        </div>
                      )}

                      {selectedCustomer && customerPendingBalance > 0 && (
                          <div className="pending-balance-alert w-full">
                              <div className="bg-red-500/20 p-1.5 rounded-full shrink-0">
                                  <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                              </div>
                              <span className="font-medium text-red-900 dark:text-red-300">{t('pos.pendingBalance')}: <strong className="text-base ml-1">{formatPrice(customerPendingBalance)}</strong></span>
                          </div>
                      )}
                  </div>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3 text-base flex-grow">
              <>
                <div className="flex justify-between text-slate-100"><span>MRP Subtotal (Gross)</span><motion.span key={`gross-${grossTotalInclusive}`} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}>{formatPrice(grossTotalInclusive)}</motion.span></div>
                {itemDiscountsTotal > 0 && (<div className="flex justify-between text-emerald-400 font-medium"><span>Total Discount</span><span>-{formatPrice(itemDiscountsTotal)}</span></div>)}
                <div className="flex justify-between font-medium text-slate-400 pt-1 border-t border-dashed border-slate-700"><span>Net Subtotal</span><motion.span key={`net-${netTotalInclusive}`} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}>{formatPrice(netTotalInclusive)}</motion.span></div>
                
                {gstBillingMode === 'gst' && taxBreakdown.totalTax > 0 && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-semibold text-slate-200">Tax Breakdown</span>
                    </div>
                    {taxName === 'GST' ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400 font-medium">CGST</span>
                          <span className="font-semibold text-slate-100">{formatPrice(taxBreakdown.cgst)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400 font-medium">SGST</span>
                          <span className="font-semibold text-slate-100">{formatPrice(taxBreakdown.sgst)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400 font-medium">{taxName}</span>
                        <span className="font-semibold text-slate-100">{formatPrice(taxBreakdown.totalTax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-1.5 border-t border-slate-700">
                      <span className="font-medium text-slate-200">Total Tax</span>
                      <span className="font-bold text-blue-400">{formatPrice(taxBreakdown.totalTax)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center py-1"><span className="text-blue-400 font-medium">Global Discount</span><GlobalDiscountPopover globalDiscount={globalDiscount} updateGlobalDiscount={updateGlobalDiscount} subtotal={netTotalInclusive > 0 ? netTotalInclusive : 0} /></div>
                {globalDiscountAmount > 0 ? (<div className="flex justify-between text-blue-400 text-sm"><span>Saved (Global)</span><span>-{formatPrice(globalDiscountAmount)}</span></div>) : (globalDiscount.value > 0 && netTotalInclusive === 0 && (<div className="text-xs text-blue-400 flex items-center gap-1"><Ticket className="w-3 h-3" /><span>Saved: {globalDiscount.type === 'amount' ? formatPrice(globalDiscount.value) : `${globalDiscount.value}%`} Off</span></div>))}
                
                {appliedCreditNotes && appliedCreditNotes.length > 0 && (
                  <div className="space-y-1">
                    {appliedCreditNotes.map(note => (
                      <div key={note.id} className="flex justify-between items-center text-amber-400 text-sm bg-amber-900/20 p-2 rounded border border-amber-500/30">
                        <div className="flex flex-col">
                          <span>Credit Note Applied</span>
                          <span className="text-xs font-mono">{note.credit_note_number || note.id.split('-')[0].toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">-{formatPrice(note.applied_amount)}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300 rounded-full" onClick={() => handleRemoveCreditNote(note)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <hr className="my-3 border-dashed border-slate-700" />
                <div className="flex justify-between font-bold text-xl text-slate-100"><span>{t('pos.cartTotal')}</span><motion.span key={`total-${saleTotal}`} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}>{formatPrice(saleTotal)}</motion.span></div>
              </>

              {customerPhone && customerPendingBalance > 0 && (<div className="flex justify-between items-center text-slate-100 mt-3"><div className="flex items-center gap-2 text-sm font-medium"><span>{t('pos.addPending')}</span></div><div className="relative w-24"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span><Input type="number" placeholder="0" className="h-8 pl-5 text-right bg-slate-950 border-slate-700 focus:border-blue-500 text-slate-100" value={manualPendingAmount} onChange={(e) => setManualPendingAmount(e.target.value)} /></div></div>)}
              {selectedCustomer && cart.length > 0 && (<div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3 mt-3"><div className="flex justify-between items-center"><div className="flex items-center gap-2 text-sm font-medium text-slate-100"><Coins className="w-4 h-4 text-blue-400" /><span>{t('pos.loyaltyRewards')}</span></div><Badge variant="outline" className="bg-blue-900/30 text-blue-400 border-blue-500/30">{selectedCustomer.loyalty_points || 0} {t('pos.points')}</Badge></div><div className="flex items-center gap-3 pt-1"><Switch checked={redeemCoins} onCheckedChange={(checked) => { setRedeemCoins(checked); if (checked) { const maxAllowed = Math.min(selectedCustomer.loyalty_points || 0, maxRedeemCoins); setCoinsToRedeem(maxAllowed); } else { setCoinsToRedeem(0); } }} id="redeem-switch" /><Label htmlFor="redeem-switch" className="text-sm font-medium cursor-pointer">{t('pos.redeemPoints')}</Label></div>{redeemCoins && (<div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-1"><div className="flex items-center gap-2"><Input type="number" className="h-9 text-right font-mono border-slate-700 bg-slate-900 text-slate-100" value={coinsToRedeem} onChange={(e) => { const val = parseInt(e.target.value) || 0; setCoinsToRedeem(Math.min(val, selectedCustomer.loyalty_points || 0)); }} max={selectedCustomer.loyalty_points || 0} /><span className="text-sm text-slate-400 whitespace-nowrap">/ {Math.min(selectedCustomer.loyalty_points || 0, maxRedeemCoins)} Max</span></div>{actualCoinsToRedeem > maxRedeemCoins && <p className="text-[10px] text-red-500">Exceeds max redemption limit ({maxRedeemCoins})</p>}<div className="flex justify-between items-center bg-blue-900/20 p-2 rounded border border-blue-500/30"><span className="text-xs text-blue-400 font-medium">{t('pos.discountApplied')}</span><span className="text-sm font-bold text-blue-400">-{formatPrice(coinDiscountAmount)}</span></div></div>)}</div>)}
              
              {manualPending > 0 && <div className="flex justify-between font-medium text-sm text-slate-400 mt-2"><span>Pending Due Added</span><span>+{formatPrice(manualPending)}</span></div>}
              
              <div className="flex justify-between font-bold text-3xl text-blue-400 mt-2 pt-2 border-t border-dashed border-slate-700"><span>{t('pos.totalPayable')}</span><motion.span key={`payable-${totalPayable}`} initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>{formatPrice(totalPayable)}</motion.span></div>
            </div>

            <div className="space-y-4 pt-4 mt-auto">
              <div>
                <Label className="text-base text-slate-100">{t('pos.paymentMethod')}</Label>
                <div className="grid grid-cols-3 gap-2 mt-2 lg:max-h-none pr-1">
                  {paymentOptions.map(option => (<PaymentMethodButton key={option.name} method={option.name} shortcut={option.shortcut} icon={option.icon} isSelected={selectedPaymentMethod === option.name} disabled={isProcessingSale || (cart.length === 0 && (!manualPendingAmount || parseFloat(manualPendingAmount) <= 0))} onClick={handlePaymentMethodSelect} />))}
                  <PaymentMethodButton method="Other" icon={Landmark} isSelected={selectedPaymentMethod === 'Other'} disabled={isProcessingSale || (cart.length === 0 && (!manualPendingAmount || parseFloat(manualPendingAmount) <= 0))} onClick={handlePaymentMethodSelect} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
        <PriceChangeDialog product={priceChangeProduct} open={isPriceChangeDialogOpen} onOpenChange={setIsPriceChangeDialogOpen} onConfirm={handlePriceChangeConfirm} />
        <CashPaymentDialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen} totalAmount={totalPayable} onComplete={() => handleCheckout('Cash')} />
        <CreditConfirmDialog open={isCreditConfirmOpen} onOpenChange={setIsCreditConfirmOpen} totalAmount={saleTotal} customer={{ name: customerName || (selectedCustomer ? selectedCustomer.name : 'Guest'), phone: customerPhone }} onConfirm={() => handleCheckout('Credit')} />
        <VariantSelectorDialog open={isVariantSelectorOpen} onOpenChange={setIsVariantSelectorOpen} product={variantSelectorProduct} onConfirm={handleVariantConfirm} />
        <QuantityPickerDialog open={isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen} product={pendingAddItem?.product} onConfirm={handleQuantityConfirm} />
        <AddCustomerDialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen} onCustomerAdded={handleCustomerCreated} />
        <POSProductsModal isOpen={isPOSProductsModalOpen} onClose={() => setIsPOSProductsModalOpen(false)} retailerId={posUserId} addToCart={handleAddToCart} />
        
        {isBookOrdersModalOpen && (
          <BookOrdersModal isOpen={isBookOrdersModalOpen} onClose={() => setIsBookOrdersModalOpen(false)} onPushToCart={handlePushOrderToCart} />
        )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] sm:w-[90%] lg:hidden">
        <Button onClick={() => setIsCartOpen((p) => !p)} className="w-full flex justify-between items-center py-4 text-lg font-semibold shadow-lg rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
          <div className="flex items-center gap-2"><ShoppingCart className="w-6 h-6" /> {t('pos.cart')} ({cart.length})</div>
          <div className="flex items-center gap-1"><span>{formatPrice(totalPayable)}</span>{isCartOpen ? <ChevronDown /> : <ChevronUp />}</div>
        </Button>
      </div>

      <AnimatePresence>
        {isCartOpen && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 w-full bg-slate-950 rounded-t-2xl shadow-2xl z-30 p-4 h-[65vh] overflow-y-auto lg:hidden border-t border-slate-800 mobile-scrollbar">
            <div className="flex justify-between items-center mb-3"><h2 className="text-lg font-semibold text-slate-100">{t('pos.cart')}</h2><Button size="icon" variant="ghost" onClick={() => setIsCartOpen(false)} className="text-slate-100 hover:bg-slate-800"><X className="w-5 h-5" /></Button></div>
            {cart.length === 0 ? (<div className="flex flex-col items-center justify-center py-12 text-slate-400"><ShoppingCart className="w-16 h-16 mb-4 text-slate-400" /><p className="text-lg font-medium text-slate-100">{t('pos.cartEmpty')}</p><p className="text-sm text-slate-400/70">{t('pos.cartEmptyDesc')}</p></div>) : (
            <div className="space-y-3 pb-20 pr-1">
              {cart.map(item => (
                  <div key={item.cartItemId} className="flex items-start gap-2 p-3 rounded-lg border bg-slate-900 border-slate-800">
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-sm leading-tight break-words mb-1 text-slate-100">{item.name}</p>
                      <div className="flex flex-wrap gap-x-2 text-xs text-slate-400 items-center mt-1">
                          {item.variantBarcode && <span className="font-mono bg-slate-950 px-1 rounded text-slate-300">{item.variantBarcode}</span>}
                          
                          <span className="font-medium text-slate-300">MRP: {formatPrice(item.mrp || item.unitOriginalPrice)}</span>

                          {item.unitOriginalPrice > item.unitFinalPrice ? (
                              <>
                                  <span className="price-strikethrough">{formatPrice(item.unitOriginalPrice)}</span>
                                  <span className="price-final-highlight">{formatPrice(item.unitFinalPrice)}</span>
                              </>
                          ) : (
                              <span className="font-bold text-slate-100">{formatPrice(item.unitFinalPrice)}</span>
                          )}
                          
                          {gstBillingMode === 'gst' && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({taxName}: {item.tax_rate !== null && item.tax_rate !== undefined ? item.tax_rate : (item.gst_rate !== null && item.gst_rate !== undefined ? item.gst_rate : 0)}%)
                            </span>
                          )}
                          
                          <ManualDiscountPopover item={item} onApply={applyManualItemDiscount} onRemove={removeManualItemDiscount} />

                          {item.discountLabel && (
                              <Badge variant="outline" className="discount-label-offer ml-1 mt-1">
                                  {item.discountLabel} (Offer)
                              </Badge>
                          )}
                          {item.manualDiscountAmount > 0 && (
                              <Badge variant="outline" className="discount-label-manual ml-1 mt-1 text-green-400 border-green-400/30 bg-green-400/10">
                                  Discount: {item.manualDiscountType === 'percentage' ? `${item.manualDiscountValue}%` : formatPrice(item.manualDiscountAmount)}
                              </Badge>
                          )}
                          {item.applied_order_mode === 'wholesale' && <Badge variant="secondary" className="h-4 text-[10px] px-1 bg-purple-600 text-white ml-1 mt-1">Wholesale</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7 p-0 bg-slate-950 border-slate-800 text-slate-100 hover:bg-slate-800" onClick={() => updateQuantity(item.cartItemId, Math.max(0, item.quantity - 1))}><Minus className="h-3 w-3" /></Button>
                        <div className="flex items-center gap-1 flex-col">
                          <div className="flex items-center gap-1"><Input type="number" step="0.001" value={item.quantity} onChange={(e) => updateQuantity(item.cartItemId, parseFloat(e.target.value) || 0)} className="w-20 h-7 text-center text-xs bg-slate-900 text-slate-100 border-slate-800" /><span className="text-sm font-medium text-slate-400">{item.unit || 'pcs'}</span></div>
                          <span className={`text-[10px] ${!isServiceProduct(item) && item.stock_level < 10 ? 'text-orange-400 font-bold' : 'text-slate-400/70'}`}>{isServiceProduct(item) ? (<span className="flex items-center gap-1 text-secondary font-medium"><Briefcase className="w-3 h-3" /> Service</span>) : (`Stock: ${Number(item.stock_level).toFixed(3).replace(/\.?0+$/, '')}`)}</span>
                        </div>
                        <Button size="icon" variant="outline" className="h-7 w-7 p-0 bg-slate-950 border-slate-800 text-slate-100 hover:bg-slate-800" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <div className="flex items-center gap-1 justify-end w-full">
                        <div className="flex flex-col items-end min-w-[60px]">
                            {item.unitOriginalPrice > item.unitFinalPrice && <div className="text-[10px] text-slate-400 line-through decoration-slate-500">{formatPrice(item.unitOriginalPrice * item.quantity)}</div>}
                            <p className={`font-semibold text-sm text-right leading-none ${item.unitOriginalPrice > item.unitFinalPrice ? 'text-emerald-400' : 'text-slate-100'}`}>{formatPrice(item.lineSubtotal)}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-500/20 shrink-0" onClick={() => removeFromCart(item.cartItemId)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={isSplitPaymentOpen} onOpenChange={setIsSplitPaymentOpen}>
        <SplitPaymentDialog totalAmount={totalPayable} onComplete={handleCheckout} />
      </Dialog>

    </div>
  );
};

export default PointOfSale;
