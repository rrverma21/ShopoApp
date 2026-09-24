import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DigitalShopCashfreeConfigurationError, resolveDigitalShopCashfreeEnvironment } from "../_shared/digital-shop-cashfree-policy.js";
import { createCommercialOrder, verifyCommercialPayment } from "../_shared/digital-shop-commercial-payment.js";
import { recoverStaleCommercialOrder } from "../_shared/digital-shop-cashfree-recovery.js";

const json = (body: unknown, status: number, origin: string | null) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  },
});

const allowedOrigin = (req: Request) => {
  const origin = req.headers.get('origin');
  const configured = [
    Deno.env.get('SHOP_APP_URL'),
    ...(Deno.env.get('DIGITAL_SHOP_ALLOWED_ORIGINS') || '').split(','),
  ].map(value => value?.trim()).filter(Boolean);
  return origin && configured.includes(origin) ? origin : null;
};

serve(async (req) => {
  const origin = allowedOrigin(req);
  if (req.method === 'OPTIONS') return origin ? json({ ok: true }, 200, origin) : json({ error: 'Origin not allowed' }, 403, null);
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405, origin);
  if (!origin) return json({ success: false, error: 'Origin not allowed' }, 403, null);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const authorization = req.headers.get('Authorization');
    if (!supabaseUrl || !serviceKey || !anonKey || !authorization) return json({ success: false, error: 'Authentication required' }, 401, origin);

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ success: false, error: 'Authentication required' }, 401, origin);

    const input = await req.json();
    // No provider evidence or business ID is accepted from the browser.
    if (input?.recover_reserved === true && Object.keys(input).length === 1) {
      const configuration = resolveDigitalShopCashfreeEnvironment(
        Deno.env.get('CASHFREE_ENVIRONMENT'), Deno.env.get('CASHFREE_API_BASE_URL'));
      const admin = createClient(supabaseUrl, serviceKey);
      const recovery = await recoverStaleCommercialOrder(admin, user, null, configuration,
        (key: string) => Deno.env.get(key), verifyCommercialPayment);
      return json(recovery.body, recovery.status, origin);
    }
    const { purchase_order_id } = input;
    if (!purchase_order_id) return json({ success: false, error: 'Purchase order is required' }, 400, origin);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error: orderError } = await admin.from('digital_shop_purchase_orders').select('*').eq('id', purchase_order_id).single();
    if (orderError || !order || order.business_id !== user.id) return json({ success: false, code: 'DIGITAL_SHOP_PURCHASE_NOT_FOUND_OR_NOT_OWNED', error: 'Purchase order not found' }, 404, origin);
    if (order.commercial_version != null && (order.commercial_version !== 2 || Object.keys(input).some(key => key !== 'purchase_order_id')))
      return json({ success: false, code: 'DIGITAL_SHOP_INVALID_ORDER_INPUT' }, 400, origin);
    if (order.payment_status === 'paid' || order.activation_status === 'activated') return json({ success: false, code: 'DIGITAL_SHOP_PURCHASE_ALREADY_COMPLETE', error: 'This purchase is already complete' }, 409, origin);
    if (!['prepared', 'pending_payment', 'failed'].includes(order.order_status)) return json({ success: false, code: 'DIGITAL_SHOP_INVALID_PURCHASE_STATE', error: 'This purchase cannot start payment' }, 409, origin);
    if (Number(order.amount) <= 0 || order.currency_code !== 'INR') return json({ success: false, code: 'DIGITAL_SHOP_INVALID_COMMERCIAL_SNAPSHOT', error: 'This purchase has invalid commercial terms' }, 409, origin);

    let cashfreeConfiguration;
    try {
      cashfreeConfiguration = resolveDigitalShopCashfreeEnvironment(
        Deno.env.get('CASHFREE_ENVIRONMENT'),
        Deno.env.get('CASHFREE_API_BASE_URL'),
      );
    } catch (error) {
      if (error instanceof DigitalShopCashfreeConfigurationError) {
        console.error('[Digital Shop payment] Cashfree environment configuration rejected', error.code);
        return json({ success: false, code: error.code, error: 'Payment service environment is not configured safely' }, 503, origin);
      }
      throw error;
    }

    if (order.commercial_version === 2) {
      const result = await createCommercialOrder(admin, user, order, cashfreeConfiguration, (key: string) => Deno.env.get(key));
      return json(result.body, result.status, origin);
    }

    // A successfully created provider session is an accepted commercial offer.
    // Plan deactivation affects new provider orders, not this already-created one.
    if (order.provider_order_id && order.provider_payment_session_id) {
      return json({
        success: true,
        purchase_order_id: order.id,
        provider_order_id: order.provider_order_id,
        payment_session_id: order.provider_payment_session_id,
        is_sandbox: cashfreeConfiguration.isSandbox,
      }, 200, origin);
    }

    const { data: eligible } = await admin.rpc('is_digital_shop_plan_available_for_business', {
      p_business_id: user.id,
      p_plan_id: order.digital_shop_plan_id,
    });
    if (!eligible) return json({ success: false, code: 'DIGITAL_SHOP_PLAN_UNAVAILABLE_FOR_NEW_PURCHASE', error: 'This Digital Shop plan is no longer available for new purchases' }, 409, origin);

    const { data: activeSubscription } = await admin.from('digital_shop_subscriptions')
      .select('plan_id, ends_at').eq('business_id', user.id).eq('status', 'active').maybeSingle();
    if (activeSubscription && (!activeSubscription.ends_at || new Date(activeSubscription.ends_at) > new Date())
      && activeSubscription.plan_id !== order.digital_shop_plan_id) {
      return json({ success: false, code: 'DIGITAL_SHOP_ACTIVE_PLAN_CHANGE_NOT_SUPPORTED', error: 'Renewal must use your currently active Digital Shop plan' }, 409, origin);
    }
    if (activeSubscription && !activeSubscription.ends_at && activeSubscription.plan_id === order.digital_shop_plan_id) {
      return json({ success: false, code: 'DIGITAL_SHOP_LIFETIME_SUBSCRIPTION_ACTIVE', error: 'This lifetime Digital Shop entitlement is already active' }, 409, origin);
    }

    const { data: profile, error: profileError } = await admin.from('profiles').select('phone, business_name').eq('id', user.id).single();
    if (profileError || !profile) return json({ success: false, error: 'Business profile not found' }, 409, origin);
    if (!user.email || !profile.phone || !profile.business_name) return json({ success: false, error: 'Complete your business name, email, and phone before payment' }, 409, origin);

    const clientId = Deno.env.get('CASHFREE_API_KEY') || Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_API_SECRET') || Deno.env.get('CASHFREE_CLIENT_SECRET');
    const { apiBaseUrl, isSandbox } = cashfreeConfiguration;
    const appUrl = Deno.env.get('SHOP_APP_URL');
    if (!clientId || !clientSecret || !appUrl) return json({ success: false, error: 'Payment service is not configured' }, 503, origin);

    const providerOrderId = order.provider_order_id || `DS_${String(order.id).replaceAll('-', '')}`;
    const { error: claimError } = await admin.from('digital_shop_purchase_orders').update({
      payment_provider: 'cashfree',
      provider_order_id: providerOrderId,
      order_status: 'pending_payment',
      payment_status: 'pending',
      verification_error_code: null,
    }).eq('id', order.id).eq('business_id', user.id);
    if (claimError) throw claimError;

    const cashfreeResponse = await fetch(`${apiBaseUrl}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': '2023-08-01',
        'x-idempotency-key': order.id,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        order_id: providerOrderId,
        order_amount: Number(order.amount),
        order_currency: order.currency_code,
        customer_details: {
          customer_id: user.id,
          customer_email: user.email,
          customer_phone: profile.phone,
          customer_name: profile.business_name,
        },
        order_meta: {
          return_url: `${appUrl.replace(/\/$/, '')}/digital-shop/payment/return?purchase_order_id=${order.id}`,
          notify_url: `${supabaseUrl}/functions/v1/digital-shop-cashfree-webhook`,
        },
        order_note: `ShopoApp Digital Shop ${order.order_reference}`,
      }),
    });
    const cashfreeData = await cashfreeResponse.json();
    if (!cashfreeResponse.ok || !cashfreeData.payment_session_id || cashfreeData.order_id !== providerOrderId) {
      await admin.from('digital_shop_purchase_orders').update({ verification_error_code: 'provider_order_creation_failed' }).eq('id', order.id);
      console.error('[Digital Shop payment] Cashfree order creation failed', cashfreeResponse.status, cashfreeData?.type || cashfreeData?.code);
      return json({ success: false, code: 'DIGITAL_SHOP_PROVIDER_ORDER_CREATION_FAILED', error: 'Payment session could not be created. Please retry.' }, 502, origin);
    }

    const { error: persistError } = await admin.from('digital_shop_purchase_orders').update({
      provider_payment_session_id: cashfreeData.payment_session_id,
      provider_reference: cashfreeData.cf_order_id ? String(cashfreeData.cf_order_id) : null,
      verification_error_code: null,
    }).eq('id', order.id).eq('provider_order_id', providerOrderId);
    if (persistError) throw persistError;

    return json({
      success: true,
      purchase_order_id: order.id,
      provider_order_id: providerOrderId,
      payment_session_id: cashfreeData.payment_session_id,
      is_sandbox: isSandbox,
    }, 200, origin);
    } catch (error) {
      console.error(
        '[Digital Shop payment] Unable to create payment order',
        { code: 'DIGITAL_SHOP_PAYMENT_START_FAILED' }
      );

      return json(
        {
          success: false,
          code: 'DIGITAL_SHOP_PAYMENT_START_FAILED',
          error: 'Unable to start payment. Please retry.'
        },
        500,
        origin
      );
  }
});
