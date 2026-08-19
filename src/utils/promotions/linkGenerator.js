export const generateUniqueCode = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const getFullPromotionUrl = (code) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/offer/${code}`;
};

export const getFullShopUrl = (shopId) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/shop/${shopId}`;
};