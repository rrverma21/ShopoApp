/**
 * Pure utility functions for QR code data handling.
 * Note: JSX rendering is now handled by src/components/promotions/QRCodeDisplay.jsx
 */

export const formatQRCodeData = (url) => {
    if (!url) return '';
    return url.trim();
};

export const validateQRCodeUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};