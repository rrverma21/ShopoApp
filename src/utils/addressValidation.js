import { PHONE_FORMATS, PINCODE_FORMATS } from '@/constants/regions';

export const validateIndianPincode = (pincode) => {
  if (!pincode) return false;
  const cleanPincode = pincode.toString().trim();
  return PINCODE_FORMATS.India.regex.test(cleanPincode);
};

export const validateUKPostcode = (postcode) => {
  if (!postcode) return false;
  const cleanPostcode = postcode.toString().trim();
  return PINCODE_FORMATS.UK.regex.test(cleanPostcode);
};

export const validateIndianPhone = (phone) => {
  if (!phone) return false;
  const cleanPhone = phone.toString().replace(/[-\s]/g, '');
  return PHONE_FORMATS.India.regex.test(cleanPhone);
};

export const validateUKPhone = (phone) => {
  if (!phone) return false;
  const cleanPhone = phone.toString().replace(/[-\s]/g, '');
  return PHONE_FORMATS.UK.regex.test(cleanPhone) || /^0\d{9,10}$/.test(cleanPhone);
};

export const formatIndianPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/\D/g, '');
  let number = cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    number = cleaned.substring(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    number = cleaned.substring(1);
  }
  return number.length === 10 ? `+91 ${number.slice(0,5)} ${number.slice(5)}` : phone;
};

export const formatUKPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/\D/g, '');
  let number = cleaned;
  if (cleaned.length > 10 && cleaned.startsWith('44')) {
    number = '0' + cleaned.substring(2);
  }
  return number.length >= 10 ? `+44 ${number.slice(1)}` : phone;
};

export const formatAddress = (address, region = 'India') => {
  if (!address) return '';
  if (typeof address === 'string') return address;

  const parts = [];
  
  if (address.street || address.streetAddress) {
    parts.push(address.street || address.streetAddress);
  }
  if (address.city) {
    parts.push(address.city);
  }
  
  if (region === 'India') {
    if (address.state) parts.push(address.state);
    if (address.pincode || address.postalCode) parts.push(address.pincode || address.postalCode);
  } else if (region === 'UK') {
    if (address.county || address.state) parts.push(address.county || address.state);
    if (address.postcode || address.pincode || address.postalCode) {
      parts.push((address.postcode || address.pincode || address.postalCode).toUpperCase());
    }
  } else {
    if (address.state) parts.push(address.state);
    if (address.pincode || address.postalCode || address.postcode) {
      parts.push(address.pincode || address.postalCode || address.postcode);
    }
  }

  return parts.filter(Boolean).join(', ');
};