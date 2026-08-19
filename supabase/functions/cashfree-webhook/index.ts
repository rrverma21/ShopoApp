import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const timestamp = req.headers.get('x-webhook-timestamp');
    const signature = req.headers.get('x-webhook-signature');
    const rawBody = await req.text();
    
    // Log Request Details
    console.log(`[Webhook Incoming] Timestamp: ${timestamp}`);
    console.log(`[Webhook Headers]`, Object.fromEntries(req.headers.entries()));
    console.log(`[Webhook Body]`, rawBody);

    // Development/Test Bypass
    const isTestMode = req.headers.get('x-test-mode') === 'true';
    const isProd = Deno.env.get('CASHFREE_ENVIRONMENT') === 'PRODUCTION';

    if (!isTestMode || isProd) {
      if (!signature || !timestamp) {
        console.error("[Webhook Error] Missing signature or timestamp headers");
        // Returning 200 to prevent retries as requested, but logging error
        return new Response("Missing headers", { status: 200 });
      }

      // Validate Signature
      const secretKey = Deno.env.get('CASHFREE_API_SECRET') ?? '';
      if (!secretKey) {
          console.error("[Webhook Error] CASHFREE_API_SECRET not configured");
          return new Response("Configuration Error", { status: 200 });
      }

      const dataToSign = timestamp + rawBody;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secretKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(dataToSign));
      const generatedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

      if (generatedSignature !== signature) {
        console.error(`[Webhook Error] Signature mismatch. Received: ${signature}, Generated: ${generatedSignature}`);
        await supabaseClient.from('payment_webhooks_log').insert({
          event_type: 'SIGNATURE_FAILED',
          payload: { received: signature, generated: generatedSignature, body: rawBody },
          signature_valid: false,
          error_message: 'Invalid Signature'
        });
        return new Response("Invalid Signature", { status: 200 });
      }
      console.log("[Webhook] Signature Validated.");
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error("[Webhook Error] JSON Parse Failed:", e);
      return new Response("Invalid JSON", { status: 200 });
    }

    const { data } = payload;
    const order_id = data?.order?.order_id;
    const payment_status = data?.payment?.payment_status;

    if (!order_id) {
       console.error("[Webhook Error] No order_id in payload");
       return new Response("No order_id", { status: 200 });
    }

    // Log the event
    await supabaseClient.from('payment_webhooks_log').insert({
      webhook_id: order_id, // Using order_id as key for easy lookup
      event_type: payload.type || 'UNKNOWN',
      payload: payload,
      signature_valid: true,
      processed: false
    });

    if (payment_status === 'SUCCESS') {
        console.log(`[Webhook] Payment Success for Order: ${order_id}. Triggering activation...`);
        
        // Trigger the unified activation function
        // We use invoke to call another edge function to keep logic centralized
        const { data: actData, error: actError } = await supabaseClient.functions.invoke('activate-membership-from-payment', {
            body: { order_id: order_id }
        });

        if (actError) {
            console.error("[Webhook] Activation Function Error:", actError);
        } else {
            console.log("[Webhook] Activation Triggered:", actData);
        }
    } else {
        console.log(`[Webhook] Payment status is ${payment_status}, skipping activation.`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    console.error(`[Webhook Critical Exception]`, err);
    // Return 200 to prevent retries on logic errors as requested
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});