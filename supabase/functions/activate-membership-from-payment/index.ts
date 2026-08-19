import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Helper for JSON responses (Always return 200 to prevent retry loops on client if logic fails)
  const sendResponse = (body: any) => {
    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    });
  };

  try {
    console.log("[Activate] Function invoked.");

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error("[Activate] Configuration error: Missing secrets");
      return sendResponse({ success: false, message: "Server configuration error" });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // 1. Parse Request Body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return sendResponse({ success: false, message: "Invalid JSON body" });
    }

    const { order_id, user_id, plan_id } = body;

    // 2. Validate Parameters
    console.log(`[Activate] Request Payload: order=${order_id}, user=${user_id}, plan=${plan_id}`);

    if (!order_id || !user_id || !plan_id) {
      console.error("[Activate] Missing parameters");
      return sendResponse({ 
        success: false, 
        message: "Missing required parameters (order_id, user_id, or plan_id)",
        request: { order_id, user_id, plan_id }
      });
    }

    // 3. Pre-Check Database Status (Optimization & Fallback) - for idempotency and quick checks
    // We check the DB first. If it's ALREADY Success, we just proceed to activation logic (idempotent).
    // If it's NOT success, we check with Cashfree verification.
    const { data: localOrder, error: localError } = await supabaseClient
        .from('membership_orders')
        .select('*')
        .eq('order_id', order_id)
        .single();

    if (localError || !localOrder) {
        console.error("[Activate] Order not found in DB:", localError);
        return sendResponse({ success: false, message: "Order not found in system" });
    }

    console.log(`[Activate] Current DB Status: ${localOrder.status}, Payment Status: ${localOrder.payment_status}`);

    // If order is already marked as successful (case-insensitive check) in our DB, proceed to activation RPC directly
    const normalizedLocalPaymentStatus = (localOrder.payment_status || '').toLowerCase();
    if (['paid', 'success'].includes(normalizedLocalPaymentStatus)) {
        console.log(`[Activate] Order ${order_id} already marked as successful in DB. Proceeding to activation.`);
        // Skip external verification and proceed to activate (which is idempotent)
    } else {
        // 4. Verify Payment with Source of Truth (Cashfree) if not already marked success
        const verifyUrl = `${supabaseUrl}/functions/v1/verify-cashfree-payment`;
        console.log(`[Activate] Verifying with: ${verifyUrl}`);

        const verifyResponse = await fetch(verifyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}` // Auth header needed for internal Supabase Edge Function calls
            },
            body: JSON.stringify({ order_id })
        });

        const verificationResult = await verifyResponse.json();
        console.log(`[Activate] Verification Result:`, verificationResult);

        // Normalize status to lowercase for comparison
        const cfStatus = verificationResult.status;
        const normalizedCfStatus = (cfStatus || '').toString().toLowerCase(); // Ensure toString() before toLowerCase()
        
        // Treat these as successful
        const isSuccessful =
            normalizedCfStatus === 'paid' ||
            normalizedCfStatus === 'success';

        // Check if Cashfree (or its fallback) confirmed success
        if (!verificationResult.success || !isSuccessful) {
            console.log(`[Activate] Payment verification failed for order ${order_id}. Status: ${cfStatus}, normalized: ${normalizedCfStatus}. Cannot activate.`);
            return sendResponse({ 
                success: false, 
                message: `Payment status is ${cfStatus}. Cannot activate.`, // Use original status from CF for message
                current_status: cfStatus, 
                order_id, user_id, plan_id,
                details: verificationResult 
            });
        }
        
        // If we get here, payment IS successful according to Verify (which might have used fallback)
        // 5. Update Order Status in DB (if verification confirmed it)
        console.log(`[Activate] Payment confirmed for order ${order_id}. Updating DB status to 'success'.`);
        const { error: updateError } = await supabaseClient
            .from('membership_orders')
            .update({ 
                status: 'success', // Always store as 'success' (lowercase) in DB's status column
                payment_status: 'success', // Always store as 'success' (lowercase) in DB's payment_status column
                updated_at: new Date().toISOString()
            })
            .eq('order_id', order_id);

        if (updateError) {
            console.error("[Activate] Failed to update order status in DB:", updateError);
            // This is a critical point. Payment is verified, but DB update failed.
            // Still proceed to RPC as that might fix the state, but log the issue.
            // Or ideally, revert Cashfree status / send alert. For now, log and proceed.
            // The RPC function will handle idempotency, so calling it even if the local order update fails is generally safe.
        }
    }

    // 6. Call the SQL Activation Function (Idempotent)
    console.log(`[Activate] Calling SQL function 'activate_membership_for_order' for ${order_id}`);
    
    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
      'activate_membership_for_order', 
      { p_order_id: order_id } // Pass the text order_id
    );

    if (rpcError) {
      console.error("[Activate] RPC Activation Error:", rpcError);
      return sendResponse({ success: false, message: "Membership activation logic failed", details: rpcError, order_id, user_id, plan_id });
    }

    console.log(`[Activate] SQL Result:`, rpcResult);

    // 7. Handle SQL Function Result
    if (!rpcResult || !rpcResult.success) {
      return sendResponse({ 
        success: false, 
        message: rpcResult?.message || "Unknown activation error from RPC", 
        data: rpcResult, 
        order_id, user_id, plan_id 
      });
    }

    // 8. Success
    return sendResponse({ 
      success: true, 
      message: "Membership activated successfully", 
      order_id, 
      user_id, 
      plan_id,
      data: rpcResult 
    });

  } catch (err) {
    console.error("[Activate] UNHANDLED EXCEPTION:", err);
    return sendResponse({ 
      success: false, 
      message: "Internal Server Exception", 
      details: err.message 
    });
  }
});