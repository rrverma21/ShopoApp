/**
 * Calculates the best available discount for a product based on active offers.
 * 
 * @param {number} originalPrice - The original price of the product.
 * @param {string} productId - The UUID of the product.
 * @param {Array} offers - Array of offer objects from the database.
 * @param {Array} offerItems - Array of offer_item mapping objects (optional).
 * @returns {Object} - Discount details { originalPrice, discountAmount, finalPrice, offerName, isValid }
 */
export const calculateOfferDiscount = (originalPrice, productId, offers = [], offerItems = []) => {
    const now = new Date();
    let bestDiscount = 0;
    let bestOffer = null;

    // Filter valid offers
    const validOffers = offers.filter(offer => {
        if (offer.status !== 'active') return false;
        
        // Handle both valid_from/valid_to (offers table) and validity_start/validity_end (promotions table)
        const start = new Date(offer.valid_from || offer.validity_start || 0);
        const end = new Date(offer.valid_to || offer.validity_end || 8640000000000000);
        
        return start <= now && end >= now;
    });

    validOffers.forEach(offer => {
        // Check if offer applies to this specific product
        // If offerItems array is provided and has entries for this offer, it's specific.
        // Otherwise, assume it's a store-wide offer.
        const specificItemsForOffer = offerItems.filter(oi => oi.offer_id === offer.id);
        const isStoreWide = specificItemsForOffer.length === 0;
        const appliesToProduct = isStoreWide || specificItemsForOffer.some(oi => oi.item_id === productId);

        if (!appliesToProduct) {
            console.log(`Skipped offer ${offer.title} for product ${productId} - not applicable.`);
            return;
        }

        let discountAmt = 0;
        const val = parseFloat(offer.discount_value || 0);

        if (offer.discount_type === 'percentage' || offer.discount_type === 'Percentage') {
            discountAmt = originalPrice * (val / 100);
        } else if (offer.discount_type === 'fixed' || offer.discount_type === 'flat' || offer.discount_type === 'Flat') {
            discountAmt = val;
        }

        // Keep the best discount
        if (discountAmt > bestDiscount) {
            bestDiscount = discountAmt;
            bestOffer = offer;
        }
    });

    // Ensure discount doesn't exceed original price
    bestDiscount = Math.min(bestDiscount, originalPrice);

    return {
        originalPrice,
        discountAmount: bestDiscount,
        finalPrice: originalPrice - bestDiscount,
        offerName: bestOffer ? bestOffer.title : null,
        offerType: bestOffer ? bestOffer.discount_type : null,
        offerValue: bestOffer ? bestOffer.discount_value : null,
        offerId: bestOffer ? bestOffer.id : null,
        isValid: !!bestOffer
    };
};