import { supabase } from '@/lib/supabaseClient';

/**
 * Calculates the membership end date based on the billing cycle.
 * @param {string} startDate - ISO string of start date
 * @param {string} billingCycle - 'monthly', 'yearly', or 'lifetime'
 * @returns {string|null} - ISO string of end date or null for lifetime
 */
const calculateEndDate = (startDate, billingCycle) => {
  const date = new Date(startDate);
  
  if (billingCycle === 'monthly') {
    date.setDate(date.getDate() + 30);
    return date.toISOString();
  } else if (billingCycle === 'yearly') {
    date.setDate(date.getDate() + 365);
    return date.toISOString();
  } else if (billingCycle === 'lifetime') {
    return null;
  }
  
  // Default to 30 days if unknown
  date.setDate(date.getDate() + 30);
  return date.toISOString();
};

/**
 * Sleep helper for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Activates a user membership with robust retry logic and two-step verification.
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.planId
 * @param {string} params.orderId - The text-based Order ID (e.g. MEM_...) from Cashfree
 * @param {string} params.billingCycle
 * @returns {Promise<{success: boolean, data?: any, error?: any, debug?: string}>}
 */
export async function activateMembership({ userId, planId, orderId, billingCycle }) {
  const startDate = new Date().toISOString();
  const endDate = calculateEndDate(startDate, billingCycle);
  const maxRetries = 3;
  const backoffDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

  let lastError = null;
  let orderUUID = null;

  // STEP 0: Resolve Membership Order UUID
  // We must link the membership to the ORDER UUID, not the text ID.
  try {
    const { data: orderRecord, error: orderError } = await supabase
        .from('membership_orders')
        .select('id, status, order_id')
        .eq('order_id', orderId)
        .maybeSingle();

    if (orderError) {
        console.error("Error verifying order:", orderError);
        return { success: false, error: new Error(`Failed to verify order: ${orderError.message}`) };
    }

    if (!orderRecord) {
        return { success: false, error: new Error(`Order record not found for ID: ${orderId}`) };
    }

    orderUUID = orderRecord.id;
    console.log(`[Activation] Resolved Order UUID: ${orderUUID} from Text ID: ${orderId}`);

  } catch (e) {
      console.error("Exception checking order:", e);
      return { success: false, error: e };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Activation] Attempt ${attempt + 1}/${maxRetries + 1} for Order ${orderId}`);

      // Check if already active to prevent duplicates
      // We check via the order_id UUID FK
      const { data: existing, error: checkError } = await supabase
        .from('user_memberships')
        .select('*, plan:plan_id(*)')
        .eq('order_id', orderUUID) 
        .maybeSingle();

      if (existing) {
        console.log('[Activation] Membership already exists:', existing);
        return { success: true, data: existing, status: 'already_exists' };
      }

      // STEP 1: Insert Core Record
      // We use the Resolved UUID for order_id
      const insertPayload = {
        user_id: userId,
        plan_id: planId,
        order_id: orderUUID, // IMPORTANT: Must be UUID
        status: 'active',
        start_date: startDate,
        end_date: endDate,
        // Legacy/Duplicate columns for compatibility if schema is mixed
        membership_plan_id: planId, 
        membership_start_date: startDate,
        membership_end_date: endDate,
        payment_transaction_id: null // or link if available, but usually order_id suffices
      };

      const { data: newMembership, error: insertError } = await supabase
        .from('user_memberships')
        .insert(insertPayload)
        .select('*, plan:plan_id(*)')
        .single();

      if (insertError) {
        console.error(`[Activation] Insert failed (Attempt ${attempt + 1}):`, insertError);
        throw insertError;
      }

      console.log('[Activation] Step 1 successful. Record created:', newMembership.id);

      // STEP 2: Update Profile (Legacy Sync)
      await supabase.from('profiles').update({
        membership_plan_id: planId,
        membership_start_date: startDate,
        membership_end_date: endDate
      }).eq('id', userId);

      return { success: true, data: newMembership };

    } catch (err) {
      lastError = err;
      console.error(`[Activation] Error on attempt ${attempt + 1}:`, err);

      // If it's the last attempt, don't wait
      if (attempt < maxRetries) {
        const delay = backoffDelays[attempt];
        console.log(`[Activation] Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  return { 
    success: false, 
    error: lastError, 
    debug: `Failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message || JSON.stringify(lastError)}` 
  };
}