import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    if (!order_id) {
        return new Response("Missing order_id", { status: 400 });
    }

    const clientId = Deno.env.get('CASHFREE_API_KEY') || Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_API_SECRET') || Deno.env.get('CASHFREE_CLIENT_SECRET');
    const apiBaseUrl = Deno.env.get('CASHFREE_API_BASE_URL') || 'https://sandbox.cashfree.com/pg';

    console.log(`[Debug] Checking order: ${order_id} on ${apiBaseUrl}`);

    const response = await fetch(`${apiBaseUrl}/orders/${order_id}`, {
        method: 'GET',
        headers: {
            'x-client-id': clientId ?? '',
            'x-client-secret': clientSecret ?? '',
            'x-api-version': '2023-08-01',
            'Accept': 'application/json'
        }
    });

    const data = await response.json();

    return new Response(JSON.stringify({
        debug_info: {
            url: `${apiBaseUrl}/orders/${order_id}`,
            status: response.status,
            headers_sent: { 'x-client-id': clientId ? 'PRESENT' : 'MISSING' }
        },
        cashfree_response: data
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});