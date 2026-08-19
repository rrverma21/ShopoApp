import { supabase } from './supabaseClient';

export const PaytmPaymentHandler = {
  initiatePaytmPayment: async (orderData, credentials, isTestMode = true) => {
    try {
        // Paytm Flow:
        // 1. Initiate Transaction API (Backend) -> returns txnToken
        // 2. Render Checkout JS (Frontend) -> uses txnToken
        
        /*
        const { data: tokenData, error } = await supabase.functions.invoke('initiate-paytm-transaction', {
            body: { 
                orderId: orderData.orderId, 
                amount: orderData.amount,
                customerId: orderData.customerPhone 
            }
        });
        
        if (error) throw error;
        const txnToken = tokenData.txnToken;
        */

        // Loading script
        const scriptUrl = isTestMode 
            ? `https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/${credentials.paytm_mid}.js`
            : `https://securegw.paytm.in/merchantpgpui/checkoutjs/merchants/${credentials.paytm_mid}.js`;
            
        const script = document.createElement("script");
        script.src = scriptUrl;
        script.onload = () => {
            const config = {
                "root": "",
                "flow": "DEFAULT",
                "data": {
                    "orderId": orderData.orderId,
                    "token": "MOCK_TOKEN", // Needs real backend token
                    "tokenType": "TXN_TOKEN",
                    "amount": orderData.amount
                },
                "handler": {
                    "notifyMerchant": function(eventName, data){
                        console.log("notifyMerchant handler function called");
                        console.log("eventName => ", eventName);
                        console.log("data => ", data);
                    }
                }
            };
            if (window.Paytm && window.Paytm.CheckoutJS) {
                // window.Paytm.CheckoutJS.init(config).then(function onSuccess() {
                //    window.Paytm.CheckoutJS.invoke();
                // }).catch(function onError(error){
                //    console.log("error => ", error);
                // });
            }
        };
        // document.body.appendChild(script);

        return { success: false, message: "Paytm integration requires backend token generation." };

    } catch (error) {
        console.error("Paytm Error", error);
        return { success: false, message: error.message };
    }
  },

  verifyPaytmPayment: async (paymentId, orderId) => {
     try {
        const { data, error } = await supabase.functions.invoke('verify-paytm-payment', {
            body: { paymentId, orderId }
        });
        if (error) throw error;
        return data;
    } catch (error) {
        return { verified: false, message: error.message };
    }
  }
};