import { supabase } from './supabaseClient';
import { load } from '@cashfreepayments/cashfree-js';

let cashfree = null;

const initializeCashfree = async (isTestMode = true) => {
  if (cashfree) return cashfree;
  try {
    cashfree = await load({
      mode: isTestMode ? 'sandbox' : 'production'
    });
    return cashfree;
  } catch (err) {
    console.error("Failed to load Cashfree SDK", err);
    return null;
  }
};

const initiateMembershipPayment = async (userId, membershipPlanId, amount) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Authentication required");

    // 1. Call Edge Function to create order
    // The edge function handles looking up the Platform Admin's credentials securely.
    const { data, error } = await supabase.functions.invoke('create-membership-order', {
      body: {
        user_id: userId,
        membership_plan_id: membershipPlanId,
        amount: amount
      }
    });

    if (error) {
      // Parse specific error cases if possible
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || "Failed to initiate payment session");
    }

    // 2. Initialize SDK if not already
    // We infer mode from the response if possible, or default to sandbox for safety until config is confirmed
    // The edge function should ideally return the mode, but for now we'll rely on the frontend env or default
    // Better: The edge function returns 'payment_session_id'. 
    // We can try to guess mode or pass it from backend. 
    // For this implementation, we will check if data.is_sandbox is returned, otherwise default to sandbox.
    const isSandbox = data.is_sandbox !== false; // Default to sandbox if not specified
    const cf = await initializeCashfree(isSandbox);

    if (!cf) throw new Error("Payment SDK could not be loaded");

    return {
      success: true,
      payment_session_id: data.payment_session_id,
      cashfreeInstance: cf
    };

  } catch (err) {
    console.error("Payment Initiation Error:", err);
    // Return a structured error so the UI can decide what to show
    return { 
      success: false, 
      error: err.message || "Payment initialization failed",
      isConfigError: err.message?.includes("not configured") || err.message?.includes("credentials")
    };
  }
};

const maskSensitiveData = (key) => {
  if (!key || key.length < 8) return "********";
  return `${key.substring(0, 4)}****${key.substring(key.length - 4)}`;
};

const generateOrderId = (prefix = "ORD") => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
};

export const CashfreePaymentHandler = {
  initiateMembershipPayment,
  maskSensitiveData,
  generateOrderId,
  initializeCashfree
};