/**
 * Phone Normalization Utility
 * Provides consistent phone number formatting for database queries
 */

/**
 * Normalizes a phone number to the last 10 digits format
 * Used for consistent database queries across the application
 * 
 * @param {string} phone - Raw phone number input
 * @returns {string} - Normalized 10-digit phone number
 */
export const normalizePhoneForDB = (phone) => {
  console.group('[PhoneNormalization] normalizePhoneForDB');
  console.log('📱 Original input:', phone);
  
  if (!phone) {
    console.log('⚠️ Empty phone input received');
    console.groupEnd();
    return '';
  }

  // Step 1: Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  console.log('🔢 Step 1 - Remove non-digits:', {
    input: phone,
    output: digitsOnly,
    removed: phone.length - digitsOnly.length + ' characters'
  });

  if (digitsOnly.length === 0) {
    console.log('⚠️ No digits found in input');
    console.groupEnd();
    return '';
  }

  // Step 2: Extract last 10 digits
  const last10Digits = digitsOnly.slice(-10);
  console.log('📏 Step 2 - Extract last 10 digits:', {
    input: digitsOnly,
    output: last10Digits,
    inputLength: digitsOnly.length,
    outputLength: last10Digits.length
  });

  // Step 3: Validation check
  if (last10Digits.length < 10) {
    console.log('⚠️ Phone too short after normalization:', {
      normalized: last10Digits,
      length: last10Digits.length,
      required: 10
    });
    console.groupEnd();
    return '';
  }

  // Final output
  console.log('✅ Final normalized phone:', last10Digits);
  console.log('📊 Normalization summary:', {
    originalInput: phone,
    finalOutput: last10Digits,
    transformation: `${phone} → ${last10Digits}`,
    format: 'Last 10 digits only (no country code, no formatting)'
  });
  
  console.groupEnd();
  return last10Digits;
};

/**
 * Generates possible phone number variants for flexible matching
 * Useful for searching across different phone number formats in database
 * 
 * @param {string} phone - Raw phone number input
 * @returns {string[]} - Array of possible phone variants
 */
export const generatePhoneVariants = (phone) => {
  console.group('[PhoneNormalization] generatePhoneVariants');
  console.log('📱 Input phone:', phone);
  
  if (!phone) {
    console.log('⚠️ Empty phone input');
    console.groupEnd();
    return [];
  }

  const normalized = normalizePhoneForDB(phone);
  
  if (!normalized) {
    console.log('⚠️ Failed to normalize phone');
    console.groupEnd();
    return [];
  }

  const variants = [
    normalized,              // 9876543210
    `91${normalized}`,       // 919876543210
    `+91${normalized}`       // +919876543210
  ];

  console.log('🔄 Generated variants:', {
    base: normalized,
    variants: variants,
    count: variants.length,
    formats: [
      '10 digits only',
      'Country code + 10 digits',
      '+Country code + 10 digits'
    ]
  });

  console.groupEnd();
  return variants;
};

/**
 * Validates if a phone number meets minimum requirements
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
export const isValidPhone = (phone) => {
  const normalized = normalizePhoneForDB(phone);
  const isValid = normalized.length === 10;
  
  console.log('[PhoneNormalization] isValidPhone:', {
    input: phone,
    normalized,
    isValid,
    reason: isValid ? 'Valid 10-digit number' : 'Invalid length'
  });
  
  return isValid;
};