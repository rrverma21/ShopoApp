export const generateCaptions = (offerData) => {
    const { name, description, discount_value, discount_type, offer_type } = offerData;
    
    const discountText = discount_type === 'percentage' ? `${discount_value}% OFF` : `₹${discount_value} OFF`;
    
    return {
        instagram: `🔥 HUGE SAVINGS ALERT! 🔥\n\nDon't miss our exclusive ${name}! Get ${discountText} on your favorite items. 🛍️✨\n\n${description || 'Hurry, offer valid for a limited time only!'}\n\nTap the link in our bio or scan the QR code to claim your discount now! 🏃‍♂️💨\n\n#SpecialOffer #Discount #Sale #ShopLocal #Savings #DealOfTheDay`,
        
        facebook: `📢 Check out our latest offer: ${name}!\n\nWe're giving you ${discountText}! ${description || 'Visit our store today and save big.'}\n\nClick the link below to get this deal before it expires! 👇\n\n#Sale #LocalBusiness #Offers`,
        
        twitter: `🚨 New Deal: ${name}! 🚨\n\nGet ${discountText} right now! 🛒💨\n${description ? description.substring(0, 50) + '...' : 'Limited time offer.'}\n\nClaim here: [LINK]\n\n#Sale #Discount #Offer`
    };
};