export const getEffectiveUnitPrice = (product, qty = 1, now = new Date()) => {
  const originalPrice = Number(product.selling_price || product.price || 0);
  let bestDiscountAmount = 0;
  let bestDiscountedPrice = originalPrice;
  let appliedOfferId = null;
  let appliedOfferName = null;
  let appliedOfferType = null;
  let discountLabel = null;
  let isValid = false;

  // Helper to evaluate a single offer
  const evaluateOffer = (offer) => {
    // Check if explicitly inactive
    if (offer.isActive === false || offer.is_offer_active === false) return;

    // Validate dates if present
    const start = new Date(offer.validFrom || offer.offer_start_date || offer.validity_start || 0);
    const end = new Date(offer.validUntil || offer.offer_end_date || offer.validity_end || offer.offer_validity || 8640000000000000);
    
    if (now < start || now > end) return;

    const type = (offer.type || offer.discount_type || offer.discountType || '').toLowerCase();
    const value = Number(offer.value || offer.discount_value || offer.discountPercentage || offer.discountAmount || 0);
    let currentDiscount = 0;
    let currentDiscountedPrice = originalPrice;
    let currentLabel = null;

    if (type === 'percentage') {
      currentDiscount = originalPrice * (value / 100);
      currentDiscountedPrice = originalPrice - currentDiscount;
      currentLabel = `${value}% OFF`;
    } else if (type === 'fixed_amount' || type === 'fixed' || type === 'amount') {
      currentDiscount = value;
      currentDiscountedPrice = originalPrice - currentDiscount;
      currentLabel = `₹${value} OFF`;
    } else if (type === 'price_override' || type === 'override') {
      const overridePrice = Number(offer.overridePrice || offer.override_price || value);
      currentDiscount = originalPrice - overridePrice;
      currentDiscountedPrice = overridePrice;
      currentLabel = `Special Price: ₹${overridePrice}`;
    }

    // Prevent negative prices
    if (currentDiscountedPrice < 0) {
      currentDiscountedPrice = 0;
      currentDiscount = originalPrice;
    }

    if (currentDiscount > bestDiscountAmount) {
      bestDiscountAmount = currentDiscount;
      bestDiscountedPrice = currentDiscountedPrice;
      appliedOfferId = offer.id || null;
      appliedOfferName = offer.name || offer.offer_name || offer.title || null;
      appliedOfferType = type;
      discountLabel = currentLabel;
      isValid = true;
    }
  };

  // 1. Check embedded product offer (e.g., from POS products)
  if ((product.discount_type && product.discount_value) || product.offer_percentage || product.offer_amount) {
    evaluateOffer({
      ...product,
      isActive: product.is_offer_active !== false,
      validFrom: product.offer_start_date,
      validUntil: product.offer_end_date || product.offer_validity,
      type: product.discount_type || (product.offer_percentage ? 'percentage' : 'amount'),
      value: product.discount_value || product.offer_percentage || product.offer_amount
    });
  }

  // 2. Check external offers array if attached to product
  if (Array.isArray(product.offers)) {
    product.offers.forEach(evaluateOffer);
  }

  return {
    originalPrice,
    discountedPrice: bestDiscountedPrice,
    discountAmount: bestDiscountAmount,
    discountLabel,
    appliedOfferId,
    appliedOfferName,
    appliedOfferType,
    isValid
  };
};