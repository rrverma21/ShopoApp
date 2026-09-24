import assert from 'node:assert/strict';
import test from 'node:test';
import { getDuplicateDigitalShopWebhookAction, resolveDigitalShopCashfreeEnvironment } from './digital-shop-cashfree-policy.js';

test('environment policy selects only the matching endpoint and SDK mode', () => {
  assert.deepEqual(resolveDigitalShopCashfreeEnvironment('SANDBOX'), { environment: 'SANDBOX', apiBaseUrl: 'https://sandbox.cashfree.com/pg', isSandbox: true });
  assert.deepEqual(resolveDigitalShopCashfreeEnvironment(' production '), { environment: 'PRODUCTION', apiBaseUrl: 'https://api.cashfree.com/pg', isSandbox: false });
});

test('environment policy fails closed for invalid and contradictory configuration', () => {
  for (const value of [undefined, '', 'preview', 'production-ish']) {
    assert.throws(() => resolveDigitalShopCashfreeEnvironment(value), { code: 'DIGITAL_SHOP_CASHFREE_ENVIRONMENT_INVALID' });
  }
  assert.throws(() => resolveDigitalShopCashfreeEnvironment('SANDBOX', 'https://api.cashfree.com/pg'), { code: 'DIGITAL_SHOP_CASHFREE_ENDPOINT_MISMATCH' });
  assert.equal(resolveDigitalShopCashfreeEnvironment('SANDBOX', 'https://sandbox.cashfree.com/pg/').isSandbox, true);
});

test('duplicates retry only authenticated, paid, unactivated SUCCESS events', () => {
  const event = { signature_valid: true, payment_status: 'SUCCESS', purchase_order_id: 'purchase-1', processed: true, error_code: 'activation_failed' };
  assert.equal(getDuplicateDigitalShopWebhookAction(event, { id: 'purchase-1', payment_status: 'paid', activation_status: 'failed' }), 'retry_activation');
  assert.equal(getDuplicateDigitalShopWebhookAction(event, { id: 'purchase-1', payment_status: 'paid', activation_status: 'pending' }), 'retry_activation');
  assert.equal(getDuplicateDigitalShopWebhookAction(event, { id: 'purchase-1', payment_status: 'paid', activation_status: 'not_started' }), 'retry_activation');
  assert.equal(getDuplicateDigitalShopWebhookAction(event, { id: 'purchase-1', payment_status: 'paid', activation_status: 'activated' }), 'duplicate_activated');
  assert.equal(getDuplicateDigitalShopWebhookAction({ ...event, payment_status: 'FAILED' }, { id: 'purchase-1' }), 'duplicate');
  assert.equal(getDuplicateDigitalShopWebhookAction({ ...event, signature_valid: false }, { id: 'purchase-1' }), 'reject');
  assert.equal(getDuplicateDigitalShopWebhookAction({ ...event, error_code: 'amount_mismatch' }, { id: 'purchase-1', payment_status: 'paid', activation_status: 'failed' }), 'duplicate');
  assert.equal(getDuplicateDigitalShopWebhookAction({ ...event, processed: false, error_code: null }, { id: 'purchase-1', payment_status: 'paid', activation_status: 'not_started' }), 'retry_activation');
});
