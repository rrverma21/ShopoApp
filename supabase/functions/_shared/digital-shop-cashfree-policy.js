export const CASHFREE_ENDPOINTS = Object.freeze({
  SANDBOX: 'https://sandbox.cashfree.com/pg',
  PRODUCTION: 'https://api.cashfree.com/pg',
});

export class DigitalShopCashfreeConfigurationError extends Error {
  constructor(code) {
    super(code);
    this.name = 'DigitalShopCashfreeConfigurationError';
    this.code = code;
  }
}

const normalizeEndpoint = (value) => value.trim().replace(/\/+$/, '');

export const resolveDigitalShopCashfreeEnvironment = (environmentValue, endpointOverride) => {
  const environment = environmentValue?.trim().toUpperCase();
  if (!environment || !Object.hasOwn(CASHFREE_ENDPOINTS, environment)) {
    throw new DigitalShopCashfreeConfigurationError('DIGITAL_SHOP_CASHFREE_ENVIRONMENT_INVALID');
  }

  const apiBaseUrl = CASHFREE_ENDPOINTS[environment];
  if (endpointOverride?.trim() && normalizeEndpoint(endpointOverride) !== apiBaseUrl) {
    throw new DigitalShopCashfreeConfigurationError('DIGITAL_SHOP_CASHFREE_ENDPOINT_MISMATCH');
  }

  return { environment, apiBaseUrl, isSandbox: environment === 'SANDBOX' };
};

export const getDuplicateDigitalShopWebhookAction = (event, purchase) => {
  if (!event?.signature_valid) return 'reject';
  if (event.payment_status !== 'SUCCESS') return 'duplicate';
  if (!purchase || event.purchase_order_id !== purchase.id) return 'duplicate';
  if (purchase.activation_status === 'activated') return 'duplicate_activated';
  const retryableEventState = event.error_code === 'activation_failed'
    || (!event.processed && !event.error_code);
  if (retryableEventState && purchase.payment_status === 'paid' && ['not_started', 'pending', 'failed'].includes(purchase.activation_status)) return 'retry_activation';
  return 'duplicate';
};
