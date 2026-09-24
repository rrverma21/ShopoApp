import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCommercialOrder } from '../supabase/functions/_shared/digital-shop-commercial-payment.js';

const credential = 'fixture-secret-not-for-logs';
const customer = { email: 'fixture@example.invalid', phone: '9999999999', name: 'Fixture Merchant' };
const order = { id: 'order-fixture', provider_order_id: 'DS_fixture', amount: 4998, currency_code: 'INR', commercial_version: 2 };
const config = { apiBaseUrl: 'https://cashfree.fixture.invalid', environment: 'SANDBOX', isSandbox: true };
const env = key => ({ CASHFREE_API_KEY: 'fixture-client-id', CASHFREE_API_SECRET: credential, SHOP_APP_URL: 'https://shop.fixture.invalid', SUPABASE_URL: 'https://edge.fixture.invalid' })[key];
const response = (status, body) => ({ ok: false, status, json: async () => body });
const admin = () => ({
  from: table => ({ select: () => ({ eq: () => ({ single: async () => table === 'profiles' ? { data: { phone: customer.phone, business_name: customer.name }, error: null } : { data: null, error: null } }) }) }),
  rpc: async name => name === 'claim_digital_shop_cashfree_order'
    ? { data: { request_body: { order_id: order.provider_order_id, customer_details: { customer_email: customer.email, customer_phone: customer.phone, customer_name: customer.name } } }, error: null }
    : { data: null, error: null },
});

async function withWarnings(run) {
  const original = console.warn; const warnings = []; console.warn = value => warnings.push(value);
  try { return [await run(), warnings]; } finally { console.warn = original; }
}

test('POST and recovery provider diagnostics allow only bounded code/type identifiers and preserve retry result', async () => {
  const [result, warnings] = await withWarnings(() => createCommercialOrder(admin(), { id: 'seller', email: customer.email }, order, config, env, async (_url, options) =>
    options.method === 'POST' ? response(422, { code: 'invalid_request', type: 'request_error', message: 'Amount invalid', nested: { secret: credential } }) : response(404, { code: 'order_not_found', type: 'api_error', message: 'No order' })));
  assert.deepEqual(warnings, [
    { operation: 'create_order', http_status: 422, code: 'invalid_request', type: 'request_error' },
    { operation: 'recover_order', http_status: 404, code: 'order_not_found', type: 'api_error' },
  ]);
  assert.equal(result.status, 502);
  assert.deepEqual(result.body, { success: false, status: 'verification_unavailable', code: 'DIGITAL_SHOP_PROVIDER_ORDER_RETRY_REQUIRED' });
});

test('malformed and non-scalar provider bodies log HTTP status only', async () => {
  const malformed = { ok: false, status: 400, json: async () => { throw Error('not JSON'); } };
  const [result, warnings] = await withWarnings(() => createCommercialOrder(admin(), { id: 'seller', email: customer.email }, order, config, env, async (_url, options) =>
    options.method === 'POST' ? malformed : response(404, { code: { private: credential }, type: ['bad'], message: { customer } })));
  assert.deepEqual(warnings, [
    { operation: 'create_order', http_status: 400 },
    { operation: 'recover_order', http_status: 404 },
  ]);
  assert.equal(result.body.code, 'DIGITAL_SHOP_PROVIDER_ORDER_RETRY_REQUIRED');
});

test('diagnostics omit provider messages and malformed identifiers while retaining safe metadata', async () => {
  const sensitiveMessage = 'customer@example.invalid +91 9999999999 authorization=fixture-secret-not-for-logs';
  const oversizedCode = 'x'.repeat(129);
  const [result, warnings] = await withWarnings(() => createCommercialOrder(admin(), { id: 'seller', email: customer.email }, order, config, env, async (_url, options) =>
    options.method === 'POST' ? response(400, { code: 'safe_code', type: 'safe-type', message: sensitiveMessage, nested: { secret: credential } })
      : response(404, { code: oversizedCode, type: { private: credential }, message: sensitiveMessage, response: { credentials: credential } })));
  const serialized = JSON.stringify(warnings);
  for (const prohibited of [credential, sensitiveMessage, 'fixture-client-id', customer.email, customer.phone, customer.name, 'customer_details', 'request_body', 'response', oversizedCode]) assert.ok(!serialized.includes(prohibited));
  assert.deepEqual(warnings, [
    { operation: 'create_order', http_status: 400, code: 'safe_code', type: 'safe-type' },
    { operation: 'recover_order', http_status: 404 },
  ]);
  assert.equal(result.body.code, 'DIGITAL_SHOP_PROVIDER_ORDER_RETRY_REQUIRED');
});

test('success JSON parsing and deterministic recovery requests retain their existing behavior', async () => {
  let successJsonReads = 0;
  const success = { ok: true, status: 200, json: async () => { successJsonReads++; return { order_id: order.provider_order_id, order_amount: order.amount, order_currency: order.currency_code, order_status: 'ACTIVE' }; } };
  const successfulAdmin = admin();
  successfulAdmin.rpc = async name => name === 'claim_digital_shop_cashfree_order'
    ? { data: { request_body: { order_id: order.provider_order_id, order_expiry_time: '2099-01-01T00:00:00Z' } }, error: null }
    : { data: { success: true, payment_session_id: 'session-not-for-logs' }, error: null };
  const [result, warnings] = await withWarnings(() => createCommercialOrder(successfulAdmin, { id: 'seller', email: customer.email }, order, config, env, async () => success));
  assert.equal(successJsonReads, 1);
  assert.deepEqual(warnings, []);
  assert.equal(result.status, 200);
  assert.equal(result.body.payment_session_id, 'session-not-for-logs');
});

test('shared helper keeps diagnostics restricted to the two provider failure operations', () => {
  const source = readFileSync(new URL('../supabase/functions/_shared/digital-shop-commercial-payment.js', import.meta.url), 'utf8');
  assert.match(source, /logProviderOrderError\('create_order', response\)/);
  assert.match(source, /logProviderOrderError\('recover_order', recovery\)/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*(?:request_body|x-client|customer_|Authorization)/);
});
