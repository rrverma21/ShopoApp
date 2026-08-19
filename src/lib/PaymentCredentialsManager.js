import CryptoJS from 'crypto-js';

// In a real production app, this key should be an environment variable or fetched securely.
// For this environment, we use a constant to ensure functionality across sessions.
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'b2b-nexus-secure-payment-key-v1';

export const PaymentCredentialsManager = {
  /**
   * Encrypts a sensitive value
   * @param {string} value - The value to encrypt
   * @returns {string} - Encrypted string
   */
  encrypt: (value) => {
    if (!value) return '';
    return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
  },

  /**
   * Decrypts an encrypted value
   * @param {string} encryptedValue - The encrypted string
   * @returns {string} - Decrypted original value
   */
  decrypt: (encryptedValue) => {
    if (!encryptedValue) return '';
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error("Decryption failed", e);
      return '';
    }
  },

  /**
   * Masks a credential for display (e.g., "sk_test_...1234")
   * @param {string} value - The original value
   * @param {number} visibleStart - Chars to show at start
   * @param {number} visibleEnd - Chars to show at end
   * @returns {string} - Masked string
   */
  mask: (value, visibleStart = 6, visibleEnd = 4) => {
    if (!value || value.length <= visibleStart + visibleEnd) return value;
    const start = value.substring(0, visibleStart);
    const end = value.substring(value.length - visibleEnd);
    return `${start}••••••••${end}`;
  },

  /**
   * Validates required fields for a specific gateway
   * @param {string} type - Gateway type (razorpay, stripe, etc.)
   * @param {object} data - Form data
   * @returns {object} - { isValid: boolean, errors: object }
   */
  validate: (type, data) => {
    const errors = {};
    let isValid = true;

    switch (type) {
      case 'razorpay':
        if (!data.key_id) errors.key_id = 'Key ID is required';
        if (!data.key_secret) errors.key_secret = 'Key Secret is required';
        break;
      case 'stripe':
        if (!data.publishable_key) errors.publishable_key = 'Publishable Key is required';
        if (!data.secret_key) errors.secret_key = 'Secret Key is required';
        break;
      case 'paytm':
        if (!data.merchant_id) errors.merchant_id = 'Merchant ID is required';
        if (!data.merchant_key) errors.merchant_key = 'Merchant Key is required';
        if (!data.website) errors.website = 'Website is required';
        if (!data.industry_type) errors.industry_type = 'Industry Type is required';
        if (!data.channel_id) errors.channel_id = 'Channel ID is required';
        break;
      case 'cashfree':
        if (!data.app_id) errors.app_id = 'App ID is required';
        if (!data.secret_key) errors.secret_key = 'Secret Key is required';
        break;
      case 'payu':
        if (!data.merchant_key) errors.merchant_key = 'Merchant Key is required';
        if (!data.merchant_salt) errors.merchant_salt = 'Merchant Salt is required';
        break;
      case 'other':
        if (!data.method_name) errors.method_name = 'Payment Method Name is required';
        if (!data.instructions) errors.instructions = 'Instructions are required';
        break;
      default:
        break;
    }

    if (Object.keys(errors).length > 0) isValid = false;
    return { isValid, errors };
  },

  /**
   * Formats gateway credentials for storage (converting form keys to storage keys)
   */
  formatForStorage: (type, data) => {
    const credentials = [];
    
    // Helper to push if exists
    const add = (key, val) => {
      if (val) credentials.push({ key, value: PaymentCredentialsManager.encrypt(val) });
    };

    if (type === 'razorpay') {
      add('razorpay_key_id', data.key_id);
      add('razorpay_key_secret', data.key_secret);
    } else if (type === 'stripe') {
      add('stripe_publishable_key', data.publishable_key);
      add('stripe_secret_key', data.secret_key);
      add('stripe_webhook_secret', data.webhook_secret);
    } else if (type === 'paytm') {
      add('paytm_mid', data.merchant_id);
      add('paytm_merchant_key', data.merchant_key);
      add('paytm_website', data.website);
      add('paytm_industry_type', data.industry_type);
      add('paytm_channel_id', data.channel_id);
    } else if (type === 'cashfree') {
      add('cashfree_app_id', data.app_id);
      add('cashfree_secret_key', data.secret_key);
    } else if (type === 'payu') {
      add('payu_merchant_key', data.merchant_key);
      add('payu_merchant_salt', data.merchant_salt);
    } else if (type === 'other') {
      add('other_method_name', data.method_name);
      add('other_instructions', data.instructions);
    }

    return credentials;
  }
};