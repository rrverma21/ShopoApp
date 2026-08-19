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

  try {
    // 1. Setup & Auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate Secrets
    const clientId = Deno.env.get('CASHFREE_API_KEY') || Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_API_SECRET') || Deno.env.get('CASHFREE_CLIENT_SECRET');
    const apiBaseUrl = Deno.env.get('CASHFREE_API_BASE_URL') || (
        (Deno.env.get('CASHFREE_ENVIRONMENT') === 'PRODUCTION') 
        ? 'https://api.cashfree.com/pg' 
        : 'https://sandbox.cashfree.com/pg'
    );

    if (!clientId || !clientSecret) {
        throw new Error("Missing Cashfree configuration");
    }

    // 2. Parse Request
    const { plan_id, user_id, coupon_code } = await req.json();

    if (!plan_id || !user_id) {
        throw new Error("Missing plan_id or user_id");
    }

    // 3. Fetch Plan Details
    const { data: plan, error: planError } = await supabaseClient
        .from('membership_plans')
        .select('*')
        .eq('id', plan_id)
        .single();

    if (planError || !plan) throw new Error("Invalid Plan");

    // 4. Fetch User Details
    const { data: user, error: userError } = await supabaseClient
        .from('profiles')
        .select('phone, email, id') // Assuming email might be in auth.users, but checking profiles first
        .eq('id', user_id)
        .single();
    
    // Get email from auth if not in profile (requires admin privilege which this function has)
    const { data: authUser } = await supabaseClient.auth.admin.getUserById(user_id);
    const customerEmail = authUser?.user?.email || 'customer@example.com';
    const customerPhone = user?.phone || '9999999999';

    // 5. Generate Order ID
    // Format: MEM_{timestamp}_{random} to ensure uniqueness and readability
    const orderId = `MEM_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`[Create Order] Generated Order ID: ${orderId}`);

    // 6. Calculate Amount (Simplified, assuming no coupon logic for brevity unless requested, can be added)
    let amount = plan.price;
    // ... coupon logic would go here ...

    // 7. Create DB Record (PENDING)
    const { error: dbError } = await supabaseClient
        .from('membership_orders')
        .insert({
            order_id: orderId,
            user_id: user_id,
            plan_id: plan_id,
            amount: amount,
            currency: 'INR',
            status: 'PENDING',
            billing_cycle: plan.duration_days >= 360 ? 'yearly' : 'monthly', // simplistic logic
            created_at: new Date().toISOString()
        });

    if (dbError) throw dbError;

    // 8. Call Cashfree Create Order API
    const payload = {
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
            customer_id: user_id,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            customer_name: user?.business_name || "Valued Customer"
        },
        order_meta: {
            return_url: `${req.headers.get('origin')}/payment/success?order_id={order_id}`,
            notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/cashfree-webhook`
        }
    };

    console.log(`[Create Order] Sending to Cashfree:`, JSON.stringify(payload));

    const cfResponse = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: {
            'x-client-id': clientId,
            'x-client-secret': clientSecret,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok) {
        console.error('[Create Order] Cashfree Error:', cfData);
        throw new Error(cfData.message || "Failed to create order with Cashfree");
    }

    // 9. Update DB with Payment Session
    await supabaseClient
        .from('membership_orders')
        .update({ 
            payment_session_id: cfData.payment_session_id,
            cashfree_response: cfData 
        })
        .eq('order_id', orderId);

    // 10. Return Success
    return new Response(JSON.stringify({ 
        success: true, 
        payment_session_id: cfData.payment_session_id,
        order_id: orderId,
        order_status: cfData.order_status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("[Create Order] Exception:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});