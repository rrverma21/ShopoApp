import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIndianMobile } from '../supabase/functions/_shared/cashfree-phone.js';
import { createCommercialOrder } from '../supabase/functions/_shared/digital-shop-commercial-payment.js';

const valid = '8691812883';
const order = { id: 'phone-fixture', provider_order_id: 'DS_phone_fixture', amount: 4998, currency_code: 'INR', commercial_version: 2 };
const configuration = { apiBaseUrl: 'https://cashfree.fixture.invalid', environment: 'SANDBOX', isSandbox: true };
const env = key => ({ CASHFREE_API_KEY: 'fixture-client', CASHFREE_API_SECRET: 'fixture-secret', SHOP_APP_URL: 'https://shop.fixture.invalid', SUPABASE_URL: 'https://edge.fixture.invalid' })[key];

test('POS-compatible Indian mobile normalization accepts equivalent valid representations', () => {
  for (const phone of [valid, '+91 8691812883', '+918691812883', '91 8691812883', '08691812883'])
    assert.equal(normalizeIndianMobile(phone), valid);
});

test('POS-compatible Indian mobile normalization rejects invalid values', () => {
  for (const phone of ['5691812883', '869181288', '86918128830', '', null, undefined, 'not-a-phone'])
    assert.equal(normalizeIndianMobile(phone), null);
});

const commercialAdmin = (profile, calls) => ({
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }) }),
  rpc: async (name, args) => {
    calls.push({ name, args });
    if (name === 'claim_digital_shop_cashfree_order') return { data: { request_body: { order_id: order.provider_order_id, order_expiry_time: '2099-01-01T00:00:00Z' } }, error: null };
    return { data: { success: true, payment_session_id: 'session-fixture' }, error: null };
  },
});

test('Digital Shop sends the normalized phone to its claim without mutating the profile', async () => {
  const profile = { phone: '+91 8691812883', business_name: 'Fixture Merchant' };
  const calls = []; let posts = 0;
  const result = await createCommercialOrder(commercialAdmin(profile, calls), { id: 'seller', email: 'fixture@example.invalid' }, order, configuration, env, async (_url, options) => {
    posts++; assert.equal(options.method, 'POST');
    return { ok: true, status: 200, json: async () => ({ order_id: order.provider_order_id, order_amount: order.amount, order_currency: order.currency_code, order_status: 'ACTIVE' }) };
  });
  assert.equal(posts, 1);
  assert.equal(calls[0].name, 'claim_digital_shop_cashfree_order');
  assert.equal(calls[0].args.p_customer.customer_phone, valid);
  assert.equal(profile.phone, '+91 8691812883');
  assert.equal(result.status, 200);
});

test('invalid Digital Shop phone fails before claim and Cashfree POST', async () => {
  const calls = []; let requested = false;
  const result = await createCommercialOrder(commercialAdmin({ phone: 'not-a-phone', business_name: 'Fixture Merchant' }, calls), { id: 'seller', email: 'fixture@example.invalid' }, order, configuration, env, async () => {
    requested = true; assert.fail('invalid phone must not reach Cashfree');
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'DIGITAL_SHOP_INVALID_CUSTOMER_PHONE');
  assert.deepEqual(calls, []);
  assert.equal(requested, false);
});
