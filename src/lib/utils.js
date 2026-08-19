import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { roundAmount } from "@/utils/roundAmount"

// ==========================================
// EXISTING CORE UTILITIES
// ==========================================
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price, currency = 'INR') {
  const rounded = roundAmount(price || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rounded);
}

export function isServiceProduct(product) {
  return product?.is_service === true || product?.category?.toLowerCase() === 'service';
}

// ==========================================
// A. DATE FORMATTING FUNCTIONS
// ==========================================

export function formatDateToDDMMYYYY(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  }).format(date);
}

export function formatExpiryDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

// ==========================================
// B. CURRENCY & PRICING FUNCTIONS
// ==========================================

export function useCurrency() {
  return { symbol: '₹', code: 'INR', locale: 'en-IN' };
}

export function formatCurrency(amount, currency = '₹') {
  const num = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
  return `${currency}${formatted}`;
}

export function getPriceForQuantity(prices, quantity) {
  if (!prices || !Array.isArray(prices) || prices.length === 0) return null;
  const applicable = prices.filter(p => quantity >= (p.min_qty || p.minQuantity || 1));
  if (applicable.length === 0) return null;
  return applicable.reduce((prev, current) => 
    ((prev.min_qty || prev.minQuantity || 1) > (current.min_qty || current.minQuantity || 1)) ? prev : current
  ).price;
}

export function calculateDiscountPercentage(originalPrice, discountedPrice) {
  if (!originalPrice || originalPrice <= 0 || !discountedPrice) return 0;
  if (discountedPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}

export function setGlobalCurrency(currencyCode) {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('global_currency', currencyCode);
  }
}

export function getValidCurrencySymbol(code) {
  switch (String(code).toUpperCase()) {
    case 'INR': return '₹';
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return '₹';
  }
}

export function getCurrencyCodeByCountry(country) {
  const c = String(country).toUpperCase();
  if (c === 'IN' || c === 'INDIA') return 'INR';
  if (c === 'US' || c === 'USA') return 'USD';
  if (c === 'GB' || c === 'UK') return 'GBP';
  if (['FR', 'DE', 'IT', 'ES', 'NL'].includes(c)) return 'EUR';
  return 'INR';
}

// ==========================================
// C. UTILITY FUNCTIONS
// ==========================================

export function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function getEmployeeInitials(firstName, lastName) {
  if (!firstName && !lastName) return '?';
  const f = firstName ? String(firstName).trim()[0] : '';
  const l = lastName ? String(lastName).trim()[0] : '';
  const res = (f + l).toUpperCase();
  return res || '?';
}

export function toCamelCase(str) {
  if (!str) return '';
  return String(str)
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '');
}

export function getStatusColor(status) {
  const s = String(status).toLowerCase();
  if (['active', 'completed', 'success', 'approved', 'paid', 'delivered'].includes(s)) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
  }
  if (['pending', 'processing', 'in progress', 'partial', 'partially used'].includes(s)) {
    return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
  }
  if (['failed', 'cancelled', 'rejected', 'expired', 'fully used'].includes(s)) {
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
  }
  return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
}

export function getPaymentStatusColor(status) {
  return getStatusColor(status);
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return Number(d.toFixed(2));
}

export function parseFeatures(featuresString) {
  if (!featuresString) return [];
  if (Array.isArray(featuresString)) return featuresString;
  try {
    const parsed = JSON.parse(featuresString);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Fall back to comma separated
  }
  return String(featuresString).split(',').map(s => s.trim()).filter(Boolean);
}