/**
 * Shared OTP utilities.
 * Note: Hashing operations happen securely on the backend.
 */

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const normalizePhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
};

export const validateIndianPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  const isValid10Digit = cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
  const isValid12Digit = cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]\d{9}$/.test(cleaned.substring(2));
  
  return isValid10Digit || isValid12Digit;
};

export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
};