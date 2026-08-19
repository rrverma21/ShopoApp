# Webhook & Activation Debugging Guide

This guide helps troubleshoot Cashfree webhook integration and membership activation flow.

## 1. Webhook Verification

### Configuration
1. Login to **Cashfree Dashboard** > **Developers** > **Webhooks**.
2. Ensure the Webhook URL is set to your Supabase Edge Function URL:
   `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/cashfree-webhook`
3. Ensure the events selected include `PAYMENT_SUCCESS_WEBHOOK`.

### Manual Testing
You can manually test the webhook logic without making a real payment:
1. Use Postman or curl.
2. Generate a signature (or use the test header `x-test-mode: true` if implemented for dev).
3. Payload: