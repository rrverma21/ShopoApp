import { supabase } from './supabaseClient';

export const PaymentGatewayHandler = {
  initializeRazorpayPayment: async (orderData, keys, onSuccess, onFailure) => {
    try {
      // In a production env, order creation happens on server.
      // Here we simulate or use edge function if available.
      // We will try to load the script first.
      
      const loadScript = (src) => {
        return new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = src;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

      if (!res) {
        onFailure("Razorpay SDK failed to load. Are you online?");
        return;
      }

      // Mock order creation for frontend-only constraints if Edge function fails/missing
      // But ideally we use:
      // const { data: rzpOrder, error } = await supabase.functions.invoke('razorpay-order', { body: { amount: orderData.amount, currency: 'INR' } });
      
      // Since we might not have the edge function setup with correct keys, we'll assume standard client-side flow 
      // (which requires order_id from backend usually, but can work with just amount for some testing flows)
      
      const options = {
        key: keys.key_id, // Public Key
        amount: Math.round(orderData.amount * 100), // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        currency: "INR",
        name: orderData.shopName || "B2B Nexus Shop",
        description: `Order #${orderData.orderId.slice(0,8)}`,
        image: "https://via.placeholder.com/150",
        order_id: null, // Ideally from backend. If null, Razorpay creates a generic payment.
        handler: async function (response) {
          // Success
          await PaymentGatewayHandler.handlePaymentSuccess(
            orderData.orderId, 
            'razorpay', 
            response.razorpay_payment_id
          );
          onSuccess(response);
        },
        prefill: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          contact: orderData.customerPhone
        },
        theme: {
          color: "#3399cc"
        },
        modal: {
            ondismiss: function() {
                onFailure("Payment cancelled by user");
            }
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response){
        onFailure(response.error.description);
      });
      
      rzp1.open();

    } catch (error) {
      console.error("Razorpay Error", error);
      onFailure(error.message);
    }
  },

  initializeStripePayment: async (orderData, keys, onSuccess, onFailure) => {
      // Placeholder for Stripe Logic
      // Stripe requires backend intent creation. 
      // Without a working edge function, we can't do secure Stripe here.
      onFailure("Stripe integration requires backend setup not fully available in this demo environment.");
  },

  handlePaymentSuccess: async (orderId, gateway, transactionId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_gateway: gateway,
          transaction_id: transactionId,
          payment_method: 'online',
          updated_at: new Date()
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      // Also update digital shop order if applicable
      await supabase
        .from('digital_shop_orders')
        .update({
            status: 'Processing',
            payment_method: 'Online',
            updated_at: new Date()
        })
        .eq('id', orderId);

    } catch (error) {
      console.error("Failed to update payment status", error);
    }
  },

  handlePaymentFailure: async (orderId, gateway, errorMessage) => {
    try {
       await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date()
        })
        .eq('id', orderId);
    } catch (e) {
        console.error("Error logging failure", e);
    }
  }
};