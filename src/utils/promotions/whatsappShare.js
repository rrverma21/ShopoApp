export const generateWhatsAppLink = (offerData, url) => {
    const { name, discount_value, discount_type } = offerData;
    const discountText = discount_type === 'percentage' ? `${discount_value}% OFF` : `₹${discount_value} OFF`;
    
    const message = `Hi! 👋 Check out this amazing offer: *${name}*! Get *${discountText}* today. Claim it here: ${url}`;
    
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
};