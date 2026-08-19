import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 1. Parse Request Body
    const { order_id } = await req.json();

    // Comprehensive Logging
    console.log(`[Verify Payment] Request received for Order ID: ${order_id}`);

    if (!order_id) {
      console.error("[Verify Payment] Error: order_id is missing in request body");
      return new Response(JSON.stringify({ 
        success: false, 
        status: 'ERROR',
        message: "order_id is required", 
        order_id: null 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Configuration & Secrets Validation
    const clientId = Deno.env.get('CASHFREE_API_KEY') || Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_API_SECRET') || Deno.env.get('CASHFREE_CLIENT_SECRET');
    // Allow overriding base URL for testing, but default to standard Production/Sandbox URLs based on env
    const environment = Deno.env.get('CASHFREE_ENVIRONMENT') || 'SANDBOX';
    const isProduction = environment.toUpperCase() === 'PRODUCTION';
    const apiBaseUrl = Deno.env.get('CASHFREE_API_BASE_URL') || (isProduction 
      ? 'https://api.cashfree.com/pg' 
      : 'https://sandbox.cashfree.com/pg');

    if (!clientId || !clientSecret) {
      console.error("[Verify Payment] Critical: Missing Cashfree API credentials (CASHFREE_API_KEY or CASHFREE_API_SECRET)");
      throw new Error("Server configuration error: Missing Payment Credentials");
    }

    // 3. Construct Cashfree API Request
    const cashfreeUrl = `${apiBaseUrl}/orders/${order_id}`;
    
    // Note: Standard Cashfree PG API uses x-client-id/x-client-secret headers. 
    // Basic Auth is typically for older APIs or Payouts. We use standard PG headers here.
    const headers = {
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
      'x-api-version': '2023-08-01',
      'Accept': 'application/json'
    };

    // Log Request details (sanitized)
    console.log(`[Verify Payment] Calling Cashfree API: ${cashfreeUrl}`);
    console.log(`[Verify Payment] Headers: x-client-id=${clientId ? '***' : 'missing'}, x-client-secret=${clientSecret ? '***' : 'missing'}`);

    let cfData = null;
    let apiCallFailed = false;

    // 4. Call Cashfree API
    try {
        const cfResponse = await fetch(cashfreeUrl, {
            method: 'GET',
            headers: headers
        });

        cfData = await cfResponse.json();
        
        console.log(`[Verify Payment] Cashfree Response Status: ${cfResponse.status}`);
        console.log(`[Verify Payment] Cashfree Body:`, JSON.stringify(cfData));

        if (!cfResponse.ok) {
            console.warn(`[Verify Payment] Cashfree API returned error: ${cfData.message}`);
            apiCallFailed = true;
        }
    } catch (networkError) {
        console.error(`[Verify Payment] Network error calling Cashfree:`, networkError);
        apiCallFailed = true;
    }

    // 5. Determine Status (with Fallback Logic)
    let finalStatus = 'PENDING';
    let finalSuccess = false;
    let paymentId = null;

    if (!apiCallFailed && cfData && cfData.order_status) {
        // Primary Verification Source: Cashfree API
        const status = cfData.order_status;
        console.log(`[Verify Payment] API Status: ${status}`);

        if (status === 'PAID') {
            finalStatus = 'SUCCESS';
            finalSuccess = true;
            // Try to extract payment ID from customer_details or other fields if available in this endpoint
            // Usually need to fetch /orders/{id}/payments for payment_id, but here we check what's available
            // If API returns payment_session_id, we can use that or a placeholder
            paymentId = cfData.cf_payment_id || cfData.payment_session_id; 
        } else if (status === 'ACTIVE') {
            finalStatus = 'PENDING';
        } else {
            finalStatus = 'FAILED';
        }
    } else {
        // 6. Fallback Verification: Check Database
        console.warn(`[Verify Payment] Triggering DB Fallback for order: ${order_id}`);
        
        const { data: dbOrder, error: dbError } = await supabaseClient
            .from('membership_orders')
            .select('status, payment_id')
            .eq('order_id', order_id)
            .single();

        if (dbError) {
            console.error(`[Verify Payment] DB Fallback failed:`, dbError);
        } else if (dbOrder) {
            console.log(`[Verify Payment] DB Fallback found status: ${dbOrder.status}`);
            if (dbOrder.status === 'SUCCESS' || dbOrder.status === 'PAID') {
                finalStatus = 'SUCCESS';
                finalSuccess = true;
                paymentId = dbOrder.payment_id;
            } else {
                // Keep the existing error/pending status if DB doesn't confirm success
                finalStatus = apiCallFailed ? 'UNKNOWN' : finalStatus;
            }
        }
    }

    // 7. Return Formatted Response
    const responsePayload = {
      success: finalSuccess,
      status: finalStatus,
      message: finalSuccess ? "Payment verified successfully" : `Payment status: ${finalStatus}`,
      order_id: order_id,
      cf_payment_id: paymentId,
      raw_status: cfData?.order_status || 'UNKNOWN'
    };

    console.log(`[Verify Payment] Returning:`, responsePayload);

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("[Verify Payment] Critical Exception:", error);
    return new Response(JSON.stringify({ 
        success: false, 
        status: 'ERROR',
        message: error.message,
        order_id: null
    }), {
      status: 200, // Return 200 to client so it can handle the JSON error gracefully
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});