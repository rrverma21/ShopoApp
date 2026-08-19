import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getEffectiveUnitPrice } from '@/lib/pricingUtils';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

const CART_STORAGE_KEY = 'cart_items';
const GLOBAL_DISCOUNT_KEY = 'cart_global_discount';
const BOOKED_ORDER_ID_KEY = 'cart_booked_order_id';

export const CartProvider = ({ children }) => {
  const { user } = useAuth();

  // Initialize Cart Items from localStorage with pricing validation
  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!storedCart) return [];
      
      const parsedCart = JSON.parse(storedCart);
      const now = new Date();
      
      // Recalculate pricing for all loaded items
      return parsedCart.map(item => {
        const productData = item.product || item; // Support both structures
        const pricing = getEffectiveUnitPrice(productData, item.quantity, now);
        
        const isCustomPrice = productData.allow_price_change;
        const originalPrice = isCustomPrice ? item.unitOriginalPrice : pricing.originalPrice;
        const offerPrice = isCustomPrice ? (item.offerPrice || item.unitOriginalPrice) : pricing.discountedPrice;
        
        // Re-apply manual discount if any
        let manualAmt = 0;
        if (item.manualDiscountType === 'percentage') {
            manualAmt = offerPrice * ((item.manualDiscountValue || 0) / 100);
        } else if (item.manualDiscountType === 'amount') {
            manualAmt = item.manualDiscountValue || 0;
        }
        if (manualAmt > offerPrice) manualAmt = offerPrice;

        const finalPrice = offerPrice - manualAmt;

        return {
          ...item,
          unitOriginalPrice: originalPrice,
          offerPrice: offerPrice,
          unitFinalPrice: finalPrice,
          lineDiscount: (originalPrice - finalPrice) * item.quantity,
          lineSubtotal: finalPrice * item.quantity,
          appliedOfferId: isCustomPrice ? null : (pricing.isValid ? pricing.appliedOfferId : null),
          appliedOfferName: isCustomPrice ? null : (pricing.isValid ? pricing.appliedOfferName : null),
          appliedOfferType: isCustomPrice ? null : (pricing.isValid ? pricing.appliedOfferType : null),
          discountLabel: isCustomPrice ? null : (pricing.isValid ? pricing.discountLabel : null),
          // Keep legacy fields for backward compatibility
          price: originalPrice,
          selling_price: finalPrice
        };
      });
    } catch (error) {
      console.error('Failed to parse cart from local storage:', error);
      return [];
    }
  });

  const [globalDiscount, setGlobalDiscount] = useState(() => {
    try {
      const stored = localStorage.getItem(GLOBAL_DISCOUNT_KEY);
      return stored ? JSON.parse(stored) : { type: 'percentage', value: 0 };
    } catch (error) {
      return { type: 'percentage', value: 0 };
    }
  });

  const [currentBookedOrderId, setCurrentBookedOrderId] = useState(() => {
    try {
      return localStorage.getItem(BOOKED_ORDER_ID_KEY) || null;
    } catch (error) {
      return null;
    }
  });

  // Dedicated state for a pending or injected POS customer
  // Structure expected: { name: string, phone: string, id?: string }
  const [posCustomer, setPosCustomer] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Failed to save cart to local storage:', error);
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem(GLOBAL_DISCOUNT_KEY, JSON.stringify(globalDiscount));
    } catch (error) {
      console.error('Failed to save global discount:', error);
    }
  }, [globalDiscount]);

  useEffect(() => {
    try {
      if (currentBookedOrderId) {
        localStorage.setItem(BOOKED_ORDER_ID_KEY, currentBookedOrderId);
      } else {
        localStorage.removeItem(BOOKED_ORDER_ID_KEY);
      }
    } catch (error) {
      console.error('Failed to save booked order ID:', error);
    }
  }, [currentBookedOrderId]);

  const updateGlobalDiscount = (value, type = 'percentage') => {
    let validValue = parseFloat(value) || 0;
    if (type === 'percentage') {
      validValue = Math.max(0, Math.min(100, validValue));
    } else {
      validValue = Math.max(0, validValue);
    }
    setGlobalDiscount({ type, value: validValue });
  };

  const clearGlobalDiscount = () => {
    setGlobalDiscount({ type: 'percentage', value: 0 });
    localStorage.removeItem(GLOBAL_DISCOUNT_KEY);
  };

  const addToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      const now = new Date();
      const pricing = getEffectiveUnitPrice(product, 1, now);
      
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        return prevItems.map(item =>
          item.id === product.id
            ? { 
                ...item, 
                quantity: newQty,
                unitOriginalPrice: pricing.originalPrice,
                unitFinalPrice: pricing.discountedPrice,
                lineDiscount: pricing.discountAmount * newQty,
                lineSubtotal: pricing.discountedPrice * newQty,
                appliedOfferId: pricing.isValid ? pricing.appliedOfferId : null,
                appliedOfferName: pricing.isValid ? pricing.appliedOfferName : null,
                appliedOfferType: pricing.isValid ? pricing.appliedOfferType : null,
                discountLabel: pricing.isValid ? pricing.discountLabel : null,
              }
            : item
        );
      } else {
        return [...prevItems, { 
            ...product, 
            product, // Store raw product for future recalcs
            cartItemId: product.id,
            quantity, 
            unitOriginalPrice: pricing.originalPrice,
            unitFinalPrice: pricing.discountedPrice,
            lineDiscount: pricing.discountAmount * quantity,
            lineSubtotal: pricing.discountedPrice * quantity,
            appliedOfferId: pricing.isValid ? pricing.appliedOfferId : null,
            appliedOfferName: pricing.isValid ? pricing.appliedOfferName : null,
            appliedOfferType: pricing.isValid ? pricing.appliedOfferType : null,
            discountLabel: pricing.isValid ? pricing.discountLabel : null,
        }];
      }
    });
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    
    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.cartItemId === id || item.id === id) {
            const pricing = getEffectiveUnitPrice(item.product || item, 1, new Date());
            return { 
                ...item, 
                quantity,
                lineDiscount: pricing.discountAmount * quantity,
                lineSubtotal: pricing.discountedPrice * quantity
            };
        }
        return item;
      })
    );
  };

  const updateItemDiscount = (id, discountValue, discountType = 'percentage') => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.cartItemId === id || item.id === id) {
          let validValue = parseFloat(discountValue) || 0;
          const price = item.unitOriginalPrice || item.selling_price || 0;

          if (discountType === 'percentage') {
              validValue = Math.max(0, Math.min(100, validValue));
          } else {
              validValue = Math.max(0, Math.min(price, validValue)); 
          }

          const discountAmt = discountType === 'percentage' ? price * (validValue / 100) : validValue;
          const finalPrice = price - discountAmt;

          return { 
              ...item, 
              unitFinalPrice: finalPrice,
              lineDiscount: discountAmt * item.quantity,
              lineSubtotal: finalPrice * item.quantity,
              discount: validValue,
              discountType: discountType,
              discountLabel: 'Manual Discount',
              appliedOfferType: 'manual'
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id && item.cartItemId !== id));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
    setCurrentBookedOrderId(null);
  };

  // Helper to completely replace cart items and set a customer programmatically
  const loadOrderIntoCart = (orderItems, customerData, bookedOrderId = null) => {
    setCartItems(orderItems);
    setPosCustomer(customerData);
    setGlobalDiscount({ type: 'percentage', value: 0 }); // clear any previous discounts
    if (bookedOrderId) {
      setCurrentBookedOrderId(bookedOrderId);
    }
  };

  const calculateItemDiscountAmount = (item) => {
      const pricing = getEffectiveUnitPrice(item.product || item, 1, new Date());
      return pricing.discountAmount;
  };

  const calculateItemPrice = (item) => {
      const pricing = getEffectiveUnitPrice(item.product || item, 1, new Date());
      return pricing.discountedPrice;
  };

  const getCartSubtotalOriginal = () => {
    return cartItems.reduce((total, item) => total + ((item.unitOriginalPrice || item.selling_price || 0) * item.quantity), 0);
  };

  const getTotalItemDiscountAmount = () => {
    return cartItems.reduce((total, item) => total + (item.lineDiscount || 0), 0);
  };

  const getCartNetSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.lineSubtotal || 0), 0);
  };

  const getGlobalDiscountAmount = () => {
    const netSubtotal = getCartNetSubtotal();
    if (globalDiscount.type === 'percentage') {
        return (netSubtotal * globalDiscount.value) / 100;
    } else {
        return Math.min(globalDiscount.value, netSubtotal);
    }
  };

  const getCartFinalTotal = () => {
      return Math.max(0, getCartNetSubtotal() - getGlobalDiscountAmount());
  };

  const getCartItemsCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    cartItems,
    setCartItems,
    globalDiscount,
    updateGlobalDiscount,
    clearGlobalDiscount,
    addToCart,
    updateQuantity,
    updateItemDiscount,
    removeFromCart,
    clearCart,
    posCustomer,
    setPosCustomer,
    loadOrderIntoCart,
    currentBookedOrderId,
    setCurrentBookedOrderId,
    getCartNetSubtotal, 
    getCartTotal: getCartNetSubtotal, 
    getCartSubtotalOriginal,
    getTotalItemDiscountAmount,
    getGlobalDiscountAmount,
    getCartFinalTotal,
    getCartItemsCount,
    calculateItemPrice,
    calculateItemDiscountAmount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};