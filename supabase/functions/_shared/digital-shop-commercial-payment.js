import { recoverStaleCommercialOrder } from './digital-shop-cashfree-recovery.js';
import { normalizeIndianMobile } from './cashfree-phone.js';
// Server-only CM-4C helpers. Callers authenticate ownership or the raw webhook first.
const result = (body, status = 200) => ({ body, status });
const reject = (code, status = 409) => result({ success: false, status: 'verification_unavailable', code }, status);
const activationPending = id => result({ success: false, status: 'activation_pending', purchase_order_id: id,
  code: 'DIGITAL_SHOP_ACTIVATION_RETRY_REQUIRED', payment_status: 'paid', activation_status: 'not_started' }, 202);
const headers = env => ({
  'x-client-id': env('CASHFREE_API_KEY') || env('CASHFREE_CLIENT_ID'),
  'x-client-secret': env('CASHFREE_API_SECRET') || env('CASHFREE_CLIENT_SECRET'),
  'x-api-version': '2023-08-01', Accept: 'application/json',
});
const configured = h => Boolean(h['x-client-id'] && h['x-client-secret']);
const logProviderOrderError = async (operation, response) => {
  const diagnostic = {
    operation,
    http_status: Number.isInteger(response?.status) ? response.status : null,
  };
  let body;
  try { body = await response?.json(); } catch { body = null; }
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const key of ['code', 'type']) {
      const value = body[key];
      if (typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value))
        diagnostic[key] = value;
    }
  }
  console.warn(diagnostic);
};
const money = value => {
  if (!['number', 'string'].includes(typeof value) || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value))) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n < 1e10 ? Math.round(n * 100) : null;
};
export const matchesCommercialOrder = (order, provider) => provider?.order_id === order.provider_order_id
  && money(provider.order_amount) !== null && money(provider.order_amount) === money(order.amount)
  && provider.order_currency === order.currency_code;
export const validCommercialPayment = (order, payment) => payment?.payment_status === 'SUCCESS'
  && money(payment.payment_amount) !== null && money(payment.payment_amount) === money(order.amount)
  && payment.payment_currency === order.currency_code
  && ['string', 'number'].includes(typeof payment.cf_payment_id)
  && /^[A-Za-z0-9_-]{1,128}$/.test(String(payment.cf_payment_id))
  && (typeof payment.cf_payment_id !== 'number' || Number.isSafeInteger(payment.cf_payment_id))
  && (!payment.order_id || payment.order_id === order.provider_order_id)
  && (!payment.payment_time || Number.isFinite(Date.parse(payment.payment_time)));

export async function settleCommercialPayment(admin, order, configuration, payment, source, fingerprint = null) {
  if (order.commercial_version !== 2 || !validCommercialPayment(order, payment)) return reject('DIGITAL_SHOP_PAYMENT_EVIDENCE_INVALID');
  const { data, error } = await admin.rpc('settle_digital_shop_cashfree_payment', {
    p_purchase_order_id: order.id, p_environment: configuration.environment,
    p_provider_order_id: order.provider_order_id, p_provider_payment_id: String(payment.cf_payment_id),
    p_payment_status: payment.payment_status, p_amount: payment.payment_amount, p_currency: payment.payment_currency,
    p_provider_paid_at: payment.payment_time || null, p_source: source, p_fingerprint: fingerprint,
  });
  // Never expose SQL errors or log provider payloads/credentials. A 5xx preserves webhook retries.
  if (error || !data?.success) return reject('DIGITAL_SHOP_SETTLEMENT_RETRY_REQUIRED', 503);
  return activatePaidCommercialPurchase(admin, order.id);
}

// CM-4D deliberately follows settlement rather than being part of payment proof.
// A failed activation leaves the durable paid receipt intact and can be retried by
// a subsequent provider verification/webhook delivery without another payment.
export async function activatePaidCommercialPurchase(admin, purchaseOrderId) {
  const { data, error } = await admin.rpc('activate_paid_digital_shop_commercial_purchase', {
    p_purchase_order_id: purchaseOrderId,
  });
  return error || !data?.success ? activationPending(purchaseOrderId) : result(data);
}

export async function createCommercialOrder(admin, user, order, configuration, env, request = fetch) {
  if (order.commercial_version === 2 && order.provider_order_id
    && Date.parse(order.commercial_quote_expires_at) <= Date.now()) {
    return recoverStaleCommercialOrder(admin, user, order.id, configuration, env, verifyCommercialPayment, request);
  }
  const h = headers(env);
  if (!configured(h) || !env('SHOP_APP_URL')) return reject('DIGITAL_SHOP_PAYMENT_CONFIGURATION_REQUIRED', 503);
  const { data: profile, error: profileError } = await admin.from('profiles').select('phone,business_name').eq('id', user.id).single();
  if (profileError || !profile || !user.email) return reject('DIGITAL_SHOP_CUSTOMER_REQUIRED');
  const customerPhone = normalizeIndianMobile(profile.phone);
  if (!customerPhone) return reject('DIGITAL_SHOP_INVALID_CUSTOMER_PHONE', 400);
  const { data: claim, error } = await admin.rpc('claim_digital_shop_cashfree_order', {
    p_purchase_order_id: order.id, p_actor_id: user.id, p_environment: configuration.environment,
    p_customer: { customer_email: user.email, customer_phone: customerPhone, customer_name: profile.business_name },
    p_app_url: env('SHOP_APP_URL'), p_notify_url: `${env('SUPABASE_URL')}/functions/v1/digital-shop-cashfree-webhook`,
  });
  if (error || !claim?.request_body) return reject('DIGITAL_SHOP_PURCHASE_CANNOT_START_PAYMENT');
  if (claim.payment_session_id) return result({ success: true, purchase_order_id: order.id,
    provider_order_id: claim.request_body.order_id, payment_session_id: claim.payment_session_id, is_sandbox: configuration.isSandbox });
  // The quote may expire while the profile/claim RPC is in flight. Never POST
  // that expired frozen payload; a subsequent retry uses trusted reconciliation.
  if (Date.parse(claim.request_body.order_expiry_time) <= Date.now())
    return reject('DIGITAL_SHOP_PURCHASE_QUOTE_EXPIRED');
  // Claim is committed before HTTP. Exact body + UUID idempotency key survive timeouts/crashes.
  let response;
  try {
    response = await request(`${configuration.apiBaseUrl}/orders`, { method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json', 'x-idempotency-key': order.id }, body: JSON.stringify(claim.request_body) });
  } catch { /* An ambiguous POST can be recovered only by its deterministic identity. */ }
  let provider;
  try { provider = response?.ok ? await response.json() : null; } catch { provider = null; }
  if (response && !response.ok) await logProviderOrderError('create_order', response);
  if (!provider) {
    const recovery = await request(`${configuration.apiBaseUrl}/orders/${encodeURIComponent(claim.request_body.order_id)}`, { headers: h });
    if (!recovery.ok) {
      await logProviderOrderError('recover_order', recovery);
      return reject('DIGITAL_SHOP_PROVIDER_ORDER_RETRY_REQUIRED', 502);
    }
    provider = await recovery.json();
  }
  const claimedOrder = { ...order, provider_order_id: claim.request_body.order_id };
  if (!matchesCommercialOrder(claimedOrder, provider)) return reject('DIGITAL_SHOP_PROVIDER_ORDER_MISMATCH');
  if (provider.order_status === 'PAID') return verifyCommercialPayment(admin, claimedOrder, configuration, env, request);
  const { data: session, error: sessionError } = await admin.rpc('finalize_digital_shop_cashfree_order', {
    p_purchase_order_id: order.id, p_environment: configuration.environment, p_provider_order: provider,
  });
  return sessionError || !session?.success ? reject('DIGITAL_SHOP_PROVIDER_SESSION_RETRY_REQUIRED', 503) : result(session);
}

export async function verifyCommercialPayment(admin, order, configuration, env, request = fetch) {
  const { data: claim, error: claimError } = await admin.from('digital_shop_cashfree_claims')
    .select('environment,provider_order_id').eq('purchase_order_id', order.id).single();
  if (claimError || !claim || claim.environment !== configuration.environment || claim.provider_order_id !== order.provider_order_id)
    return reject('DIGITAL_SHOP_CLAIM_MISMATCH');
  if (order.payment_status === 'paid') {
    const { data: receipt, error } = await admin.from('digital_shop_cashfree_receipts').select('*').eq('purchase_order_id', order.id).single();
    return !error && receipt?.environment === configuration.environment && receipt.provider_order_id === order.provider_order_id
      && receipt.provider_payment_id === order.provider_payment_id && receipt.payment_status === 'SUCCESS'
      && money(receipt.amount) === money(order.amount) && receipt.currency_code === order.currency_code
      ? activatePaidCommercialPurchase(admin, order.id) : reject('DIGITAL_SHOP_RECEIPT_REVIEW_REQUIRED', 503);
  }
  const h = headers(env);
  if (!configured(h)) return reject('DIGITAL_SHOP_PAYMENT_CONFIGURATION_REQUIRED', 503);
  const endpoint = `${configuration.apiBaseUrl}/orders/${encodeURIComponent(order.provider_order_id)}`;
  const response = await request(endpoint, { headers: h });
  if (!response.ok) return reject('DIGITAL_SHOP_VERIFICATION_UNAVAILABLE', 502);
  const provider = await response.json();
  if (!matchesCommercialOrder(order, provider)) return reject('DIGITAL_SHOP_PROVIDER_ORDER_MISMATCH');
  // No pending/failed writes: a stale provider response cannot overwrite a concurrent success.
  if (provider.order_status !== 'PAID') return result({ success: false, status: 'pending', purchase_order_id: order.id });
  const paymentResponse = await request(`${endpoint}/payments`, { headers: h });
  if (!paymentResponse.ok) return reject('DIGITAL_SHOP_VERIFICATION_UNAVAILABLE', 502);
  const payments = await paymentResponse.json();
  const successful = Array.isArray(payments) ? payments.filter(p => p.payment_status === 'SUCCESS') : [];
  if (successful.length !== 1 || !validCommercialPayment(order, successful[0])) return reject('DIGITAL_SHOP_PAYMENT_EVIDENCE_INVALID');
  return settleCommercialPayment(admin, order, configuration, successful[0], 'provider_api');
}
