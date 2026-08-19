/**
 * POS Validation Utilities for Dual Billing System
 * Handles validation for both GST Invoice and Without GST Bill modes
 */

/**
 * Validate invoice number format
 * @param {string} invoiceNumber - Invoice number to validate
 * @returns {object} { valid: boolean, error: string }
 */
export const validateInvoiceNumber = (invoiceNumber) => {
  if (!invoiceNumber || invoiceNumber.trim() === '') {
    return { valid: false, error: 'Invoice number is required' };
  }
  
  if (invoiceNumber.length < 3) {
    return { valid: false, error: 'Invoice number must be at least 3 characters' };
  }
  
  return { valid: true, error: '' };
};

/**
 * Validate invoice date
 * @param {Date|string} invoiceDate - Date to validate
 * @returns {object} { valid: boolean, error: string }
 */
export const validateInvoiceDate = (invoiceDate) => {
  if (!invoiceDate) {
    return { valid: false, error: 'Invoice date is required' };
  }
  
  const date = new Date(invoiceDate);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid invoice date' };
  }
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (date > today) {
    return { valid: false, error: 'Invoice date cannot be in the future' };
  }
  
  return { valid: true, error: '' };
};

/**
 * Validate GSTIN format (Indian GST Identification Number)
 * Format: 22AAAAA0000A1Z5 (15 characters)
 * @param {string} gstin - GSTIN to validate
 * @returns {object} { valid: boolean, error: string }
 */
export const validateGSTIN = (gstin) => {
  // GSTIN is optional, so empty is valid
  if (!gstin || gstin.trim() === '') {
    return { valid: true, error: '' };
  }
  
  const cleanGSTIN = gstin.replace(/\s/g, '').toUpperCase();
  
  if (cleanGSTIN.length !== 15) {
    return { valid: false, error: 'GSTIN must be exactly 15 characters' };
  }
  
  // GSTIN format: 22AAAAA0000A1Z5
  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinPattern.test(cleanGSTIN)) {
    return { 
      valid: false, 
      error: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5' 
    };
  }
  
  return { valid: true, error: '' };
};

/**
 * Validate HSN/SAC code format
 * Valid lengths: 4, 6, or 8 digits
 * @param {string} hsnCode - HSN/SAC code to validate
 * @returns {object} { valid: boolean, error: string }
 */
export const validateHSNCode = (hsnCode) => {
  // HSN/SAC is optional in some cases
  if (!hsnCode || hsnCode.trim() === '') {
    return { valid: true, error: '' };
  }
  
  const cleanCode = hsnCode.replace(/\s/g, '');
  
  // Must be numeric
  if (!/^\d+$/.test(cleanCode)) {
    return { valid: false, error: 'HSN/SAC code must contain only digits' };
  }
  
  // Valid lengths: 4, 6, or 8 digits
  const length = cleanCode.length;
  if (length !== 4 && length !== 6 && length !== 8) {
    return { 
      valid: false, 
      error: 'HSN/SAC code must be 4, 6, or 8 digits' 
    };
  }
  
  return { valid: true, error: '' };
};

/**
 * Validate GST rate
 * Valid rates: 0, 5, 12, 18, 28
 * @param {number} rate - GST rate percentage
 * @returns {object} { valid: boolean, error: string }
 */
export const validateGSTRate = (rate) => {
  const validRates = [0, 5, 12, 18, 28];
  
  if (rate === undefined || rate === null) {
    return { valid: false, error: 'GST rate is required' };
  }
  
  const numRate = Number(rate);
  
  if (isNaN(numRate)) {
    return { valid: false, error: 'GST rate must be a number' };
  }
  
  if (!validRates.includes(numRate)) {
    return { 
      valid: false, 
      error: `GST rate must be one of: ${validRates.join(', ')}%` 
    };
  }
  
  return { valid: true, error: '' };
};

/**
 * Validate a single cart item based on billing type
 * @param {object} item - Cart item to validate
 * @param {string} billingType - 'gst_invoice' or 'without_gst'
 * @returns {object} { valid: boolean, errors: string[] }
 */
export const validateCartItem = (item, billingType) => {
  const errors = [];
  
  // Common validations for both billing types
  if (!item.quantity || item.quantity <= 0) {
    errors.push(`${item.name}: Quantity must be greater than 0`);
  }
  
  const price = item.unitFinalPrice || item.selling_price || 0;
  if (price <= 0) {
    errors.push(`${item.name}: Price must be greater than 0`);
  }
  
  // GST Invoice specific validations
  if (billingType === 'gst_invoice') {
    // HSN/SAC code validation
    const hsnValidation = validateHSNCode(item.hsn_code);
    if (!hsnValidation.valid) {
      errors.push(`${item.name}: ${hsnValidation.error}`);
    }
    
    // GST rate validation
    const gstRateValidation = validateGSTRate(item.gst_rate);
    if (!gstRateValidation.valid) {
      errors.push(`${item.name}: ${gstRateValidation.error}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate entire checkout process
 * @param {array} cart - Array of cart items
 * @param {string} billingType - 'gst_invoice' or 'without_gst'
 * @param {object} invoiceMetadata - Invoice metadata (for GST invoices)
 * @returns {object} { valid: boolean, errors: string[] }
 */
export const validateCheckout = (cart, billingType, invoiceMetadata = {}) => {
  const errors = [];
  
  // Cart must not be empty
  if (!cart || cart.length === 0) {
    errors.push('Cart is empty. Please add items before checkout.');
    return { valid: false, errors };
  }
  
  // GST Invoice specific validations
  if (billingType === 'gst_invoice') {
    // Validate invoice number
    const invoiceNumberValidation = validateInvoiceNumber(invoiceMetadata.invoice_number);
    if (!invoiceNumberValidation.valid) {
      errors.push(invoiceNumberValidation.error);
    }
    
    // Validate invoice date
    const invoiceDateValidation = validateInvoiceDate(invoiceMetadata.invoice_date);
    if (!invoiceDateValidation.valid) {
      errors.push(invoiceDateValidation.error);
    }
    
    // Validate customer GSTIN (optional but if provided must be valid)
    const gstinValidation = validateGSTIN(invoiceMetadata.customer_gstin);
    if (!gstinValidation.valid) {
      errors.push(gstinValidation.error);
    }
  }
  
  // Validate each cart item
  cart.forEach(item => {
    const itemValidation = validateCartItem(item, billingType);
    if (!itemValidation.valid) {
      errors.push(...itemValidation.errors);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Format validation errors for display
 * @param {string[]} errors - Array of error messages
 * @returns {string} Formatted error message
 */
export const formatValidationErrors = (errors) => {
  if (!errors || errors.length === 0) {
    return '';
  }
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  return `Multiple validation errors:\n${errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n')}`;
};