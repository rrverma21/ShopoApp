export const COMMERCIAL_CYCLES = ['monthly', 'annual'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isPurchaseOrderId = value => typeof value === 'string' && UUID.test(value);

export function commercialPrepareArgs(planId, cycle = 'annual', addonQuantity = 0, idempotencyKey = crypto.randomUUID()) {
  const quantity = Number(addonQuantity);
  if (!planId || !COMMERCIAL_CYCLES.includes(cycle) || !Number.isInteger(quantity) || quantity < 0) throw new Error('Choose a valid plan, billing cycle, and add-on quantity.');
  return { p_digital_shop_plan_id: planId, p_billing_cycle: cycle, p_addon_quantity: quantity, p_idempotency_key: idempotencyKey };
}

const isReservedCheckoutError = error => error?.code === 'P0001'
  && error?.message === 'DIGITAL_SHOP_CHECKOUT_ALREADY_RESERVED';

// A reservation conflict permits one trusted server reconciliation attempt.
// A fresh quote is requested only after a positive retirement result, and is
// displayed for confirmation before the seller can start a new payment.
export async function prepareCommercialWithRecovery(client, args) {
  let response = await client.rpc('prepare_digital_shop_commercial_purchase', args);
  if (isReservedCheckoutError(response.error)) {
    const recovery = await client.functions.invoke('create-digital-shop-cashfree-order', { body: { recover_reserved: true } });
    if (recovery.error || recovery.data?.success !== true || recovery.data?.status !== 'checkout_retired') {
      return { ...response, recovery: { attempted: true, retired: false, code: recovery.data?.code || null } };
    }
    response = await client.rpc('prepare_digital_shop_commercial_purchase', args);
    return { ...response, recovery: { attempted: true, retired: true } };
  }
  return response;
}

export const commercialPreparationErrorMessage = result => {
  if (!result?.recovery?.attempted) return 'Purchase could not be prepared. Review your selection and try again.';
  if (result.recovery.retired) return 'Your earlier checkout was retired, but a new checkout could not be prepared. Please try again.';
  return 'Your existing checkout could not be safely reconciled. Please verify its payment status or contact support before trying again.';
};

export function preparedCommercialSummary(purchase) {
  if (!purchase?.id || purchase.commercial_version !== 2 || purchase.order_status !== 'prepared' || purchase.payment_status !== 'not_started') throw new Error('The prepared purchase could not be confirmed.');
  const amount = Number(purchase.amount);
  if (!Number.isFinite(amount) || amount <= 0 || purchase.currency_code !== 'INR') throw new Error('The prepared purchase has invalid payment terms.');
  return {
    id: purchase.id, reference: purchase.order_reference, plan: purchase.plan_snapshot?.name || 'Digital Shop plan', cycle: purchase.billing_cycle,
    activationFee: Number(purchase.activation_fee || 0), activationDisposition: purchase.activation_fee_disposition,
    subscriptionFee: Number(purchase.base_price || 0), addonFee: Number(purchase.addon_subtotal || 0), total: amount,
    capacity: purchase.plan_snapshot?.online_product_limit, quoteExpiresAt: purchase.commercial_quote_expires_at,
  };
}

export const paymentReturnState = ({ purchaseOrderId, authenticated, result, error }) => {
  if (!isPurchaseOrderId(purchaseOrderId)) return { status: 'failed', message: 'The purchase reference is missing or invalid.' };
  if (!authenticated) return { status: 'login', message: 'Sign in as the purchasing seller to verify this purchase.' };
  if (error) return { status: 'retry', message: 'Payment status could not be verified yet.' };
  if (result?.status === 'activated') return { status: 'activated', message: 'Your Digital Shop subscription is active.' };
  if (['pending', 'activation_pending', 'verification_unavailable', 'ready_for_activation'].includes(result?.status)) return { status: 'pending', message: result.status === 'activation_pending' ? 'Payment is verified and activation is being retried.' : 'Payment is still pending confirmation.' };
  return { status: 'failed', message: 'Payment was not completed or could not be verified.' };
};
