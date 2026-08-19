import { supabase } from './supabaseClient';

export const PayUPaymentHandler = {
  /**
   * PayU usually works via Form Post.
   * We generate the hash on backend (edge function) and then submit a form.
   */
  initiatePayUPayment: async (orderData, credentials, isTestMode = true) => {
    try {
      // 1. Get Hash from Edge Function (simulated)
      // const { data: hashData, error } = await supabase.functions.invoke('generate-payu-hash', { ... });
      
      // 2. Construct Form
      const form = document.createElement("form");
      form.method = "POST";
      form.action = isTestMode 
        ? "https://test.payu.in/_payment" 
        : "https://secure.payu.in/_payment";

      const params = {
        key: credentials.payu_merchant_key,
        txnid: orderData.orderId,
        amount: orderData.amount,
        productinfo: "Shop Order",
        firstname: orderData.customerName,
        email: orderData.customerEmail,
        phone: orderData.customerPhone,
        surl: window.location.origin + `/order-confirmation/${orderData.orderId}?status=success&gateway=payu`,
        furl: window.location.origin + `/order-confirmation/${orderData.orderId}?status=failure&gateway=payu`,
        // hash: hashData.hash // IMPORTANT: Required from backend
      };

      // In this demo environment, without a real backend to generate hash with salt,
      // PayU will reject the transaction. We handle this gracefully.
      if (!credentials.payu_merchant_salt) {
          return { success: false, message: "Merchant Salt missing. Cannot generate hash." };
      }

      // Add inputs to form
      for (const key in params) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = params[key];
        form.appendChild(input);
      }

      document.body.appendChild(form);
      // form.submit(); // Uncomment to actually submit
      
      return { success: false, message: "PayU integration requires backend hash generation which is mocked in this environment." };

    } catch (error) {
      console.error("PayU Error", error);
      return { success: false, message: error.message };
    }
  },

  verifyPayUPayment: async (paymentId, orderId) => {
     try {
        const { data, error } = await supabase.functions.invoke('verify-payu-payment', {
            body: { paymentId, orderId }
        });
        if (error) throw error;
        return data;
    } catch (error) {
        return { verified: false, message: error.message };
    }
  }
};