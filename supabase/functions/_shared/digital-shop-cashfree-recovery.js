import { CASHFREE_ENDPOINTS } from './digital-shop-cashfree-policy.js';
import { settleCommercialPayment, validCommercialPayment } from './digital-shop-commercial-payment.js';

const reject = code => ({ status: 409, body: { success: false, status: 'verification_unavailable', code } });
const money = value => {
  if (!['number', 'string'].includes(typeof value) || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value))) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount < 1e10 ? Math.round(amount * 100) : null;
};
const recoveryDiagnostic = fields => console.warn({ operation: 'recover_stale_checkout', ...fields });
export const authoritativeOrderAbsence = (response, body) => response.status === 404
  && !response.redirected && response.headers.get('content-type')?.split(';')[0].trim() === 'application/json'
  && body !== null && typeof body === 'object' && !Array.isArray(body)
  && body.code === 'order_not_found' && body.type === 'invalid_request_error'
  && !('order_status' in body) && !('payment_session_id' in body) && !('order_id' in body);

// Historical claims did not record merchant identity. An operator must bind each
// reviewed purchase to SHA-256(environment + ':' + original client ID) in server
// configuration. Never infer that today's credentials belong to the old merchant.
export async function recoverStaleCommercialOrder(admin, user, purchaseId, configuration, env, verify, request = fetch) {
  let { data: order, error } = await admin.rpc('inspect_digital_shop_cashfree_recovery', {
    p_actor_id: user.id, p_purchase_order_id: purchaseId, p_environment: configuration.environment,
  });
  if (error || !order?.id) ({ data: order, error } = await admin.rpc('inspect_digital_shop_cashfree_expired_recovery', {
    p_actor_id: user.id, p_purchase_order_id: purchaseId, p_environment: configuration.environment,
  }));
  if (error || !order?.id) return reject('DIGITAL_SHOP_RECOVERY_INELIGIBLE');
  const clientId = env('CASHFREE_API_KEY') || env('CASHFREE_CLIENT_ID');
  const secret = env('CASHFREE_API_SECRET') || env('CASHFREE_CLIENT_SECRET');
  if (!clientId || !secret || configuration.apiBaseUrl !== CASHFREE_ENDPOINTS[configuration.environment])
    return reject('DIGITAL_SHOP_PAYMENT_CONFIGURATION_REQUIRED');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${configuration.environment}:${clientId}`));
  const fingerprint = Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
  const observedAt = new Date().toISOString();
  let response, provider;
  try {
    response = await request(`${configuration.apiBaseUrl}/orders/${encodeURIComponent(order.provider_order_id)}`, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'x-client-id': clientId, 'x-client-secret': secret, 'x-api-version': '2023-08-01', Accept: 'application/json' },
    });
    provider = await response.json();
  } catch {
    recoveryDiagnostic({ outcome: 'provider_get_failed', purchase_id: order.id, error_code: 'DIGITAL_SHOP_RECOVERY_VERIFICATION_UNAVAILABLE' });
    return reject('DIGITAL_SHOP_RECOVERY_VERIFICATION_UNAVAILABLE');
  }
  if (response.ok) {
    recoveryDiagnostic({ outcome: 'provider_order_received', purchase_id: order.id, provider_http_status: response.status,
      provider_order_status: typeof provider?.order_status === 'string' ? provider.order_status : null });
    if (provider?.order_status === 'EXPIRED') {
      const identityMatches = provider.order_id === order.provider_order_id;
      const amountMatches = money(provider.order_amount) !== null && money(provider.order_amount) === money(order.amount);
      const currencyMatches = provider.order_currency === order.currency_code;
      recoveryDiagnostic({ outcome: 'provider_order_expired', purchase_id: order.id, provider_http_status: response.status,
        provider_order_status: 'EXPIRED', provider_identity_matches: identityMatches, provider_amount_matches: amountMatches, provider_currency_matches: currencyMatches });
      if (!identityMatches || !amountMatches || !currencyMatches) {
        recoveryDiagnostic({ outcome: 'expired_identity_unconfirmed', purchase_id: order.id, provider_identity_matches: identityMatches,
          provider_amount_matches: amountMatches, provider_currency_matches: currencyMatches, error_code: 'DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED' });
        return reject('DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED');
      }
      let payments;
      try {
        const paymentResponse = await request(`${configuration.apiBaseUrl}/orders/${encodeURIComponent(order.provider_order_id)}/payments`, {
          method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
          headers: { 'x-client-id': clientId, 'x-client-secret': secret, 'x-api-version': '2023-08-01', Accept: 'application/json' },
        });
        if (!paymentResponse.ok) { recoveryDiagnostic({ outcome: 'payments_get_non_2xx', purchase_id: order.id, payments_http_status: paymentResponse.status, error_code: 'DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED' }); return reject('DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED'); }
        payments = await paymentResponse.json();
      } catch { recoveryDiagnostic({ outcome: 'payments_get_failed', purchase_id: order.id, error_code: 'DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED' }); return reject('DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED'); }
      if (!Array.isArray(payments) || !payments.every(payment => payment && typeof payment === 'object'
        && !Array.isArray(payment) && typeof payment.payment_status === 'string'
        && (!payment.order_id || payment.order_id === order.provider_order_id))) { recoveryDiagnostic({ outcome: 'payments_array_invalid', purchase_id: order.id, payments_array_valid: false, error_code: 'DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED' }); return reject('DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED'); }
      const successful = payments.filter(payment => payment.payment_status === 'SUCCESS');
      if (successful.length) {
        recoveryDiagnostic({ outcome: 'success_payment_found', purchase_id: order.id, payments_array_valid: true, payments_count: payments.length, success_payment_count: successful.length });
        if (successful.length !== 1 || !validCommercialPayment(order, successful[0]))
          return reject('DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED');
        recoveryDiagnostic({ outcome: 'success_payment_settlement', purchase_id: order.id, success_payment_count: 1 });
        return settleCommercialPayment(admin, order, configuration, successful[0], 'provider_api');
      }
      if (payments.length !== 0) { recoveryDiagnostic({ outcome: 'payments_nonempty_without_success', purchase_id: order.id, payments_array_valid: true, payments_count: payments.length, success_payment_count: 0, error_code: 'DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED' }); return reject('DIGITAL_SHOP_RECOVERY_EXPIRED_UNCONFIRMED'); }
      const observedAt = new Date().toISOString();
      recoveryDiagnostic({ outcome: 'expired_empty_payments', purchase_id: order.id, payments_array_valid: true, payments_count: 0, success_payment_count: 0, retirement_rpc_attempted: true });
      const { data: retired, error: retireError } = await admin.rpc('retire_digital_shop_cashfree_expired_checkout', {
        p_actor_id: user.id, p_purchase_order_id: order.id, p_environment: configuration.environment,
        p_provider_order_id: order.provider_order_id, p_merchant_fingerprint: fingerprint, p_observed_at: observedAt,
        p_payments_checked_at: observedAt, p_http_status: 200, p_provider_order_status: 'EXPIRED', p_payment_check: 'payments_confirmed_empty',
      });
      if (retireError || retired?.status !== 'checkout_retired' || !retired.success) { recoveryDiagnostic({ outcome: 'expired_retirement_rejected', purchase_id: order.id, retirement_rpc_attempted: true, retirement_rpc_succeeded: false, error_code: retireError?.code || 'DIGITAL_SHOP_RECOVERY_RECHECK_REQUIRED' }); return reject('DIGITAL_SHOP_RECOVERY_RECHECK_REQUIRED'); }
      recoveryDiagnostic({ outcome: 'checkout_retired', purchase_id: order.id, retirement_rpc_attempted: true, retirement_rpc_succeeded: true });
      return { status: 200, body: retired };
    }
    // This repeats the full identity/amount/currency/payment checks; a 2xx response
    // can never retire a checkout, including ACTIVE, PAID and unknown statuses.
    try { return await verify(admin, order, configuration, env, request); }
    catch { return reject('DIGITAL_SHOP_RECOVERY_VERIFICATION_UNAVAILABLE'); }
  }
  const bindingEnv = env('DIGITAL_SHOP_CASHFREE_RECOVERY_BINDINGS');
  let bindings;
  let bindingJsonValid = false;
  try { bindings = JSON.parse(bindingEnv || '{}'); bindingJsonValid = true; } catch { /* Fail closed. */ }
  if (!bindings || bindings[order.id] !== fingerprint) {
    const bindingEntryPresent = bindings !== null && bindings !== undefined && Object.prototype.hasOwnProperty.call(bindings, order.id);
    const bindingEntry = bindings?.[order.id];
    recoveryDiagnostic({ outcome: 'merchant_binding_mismatch', purchase_id: order.id,
      binding_env_present: Boolean(bindingEnv), binding_json_valid: bindingJsonValid, binding_entry_present: bindingEntryPresent,
      binding_entry_type: typeof bindingEntry, binding_entry_length: typeof bindingEntry === 'string' ? bindingEntry.length : null,
      computed_fingerprint_length: fingerprint.length, binding_matches: bindingEntry === fingerprint, merchant_binding_required: true, merchant_binding_matches: bindingEntry === fingerprint });
    return reject('DIGITAL_SHOP_RECOVERY_MERCHANT_BINDING_REQUIRED');
  }
  if (!authoritativeOrderAbsence(response, provider)) {
    recoveryDiagnostic({ outcome: 'provider_response_unrecognized', purchase_id: order.id, provider_http_status: response.status, error_code: 'DIGITAL_SHOP_RECOVERY_ABSENCE_UNCONFIRMED' });
    return reject('DIGITAL_SHOP_RECOVERY_ABSENCE_UNCONFIRMED');
  }
  const { data: retired, error: retireError } = await admin.rpc('retire_digital_shop_cashfree_checkout', {
    p_actor_id: user.id, p_purchase_order_id: order.id, p_environment: configuration.environment,
    p_provider_order_id: order.provider_order_id, p_merchant_fingerprint: fingerprint, p_observed_at: observedAt,
    p_http_status: 404, p_provider_code: 'order_not_found', p_provider_type: 'invalid_request_error',
  });
  if (retireError || retired?.status !== 'checkout_retired' || !retired.success)
    return reject('DIGITAL_SHOP_RECOVERY_RECHECK_REQUIRED');
  return { status: 200, body: retired };
}
