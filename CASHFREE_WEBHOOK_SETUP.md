# Cashfree Webhook Setup Guide

For the automatic membership activation to work reliably, you must configure the Cashfree webhooks correctly. However, the system is designed to work via direct API polling even if webhooks fail or are delayed.

## 1. Webhook URL Configuration
1. Login to your **Cashfree Dashboard**.
2. Navigate to **Developers** > **Webhooks**.
3. Click **Add Webhook Endpoint**.
4. Enter the following URL (replace `[YOUR_PROJECT_REF]` with your actual Supabase project reference ID):
   `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/cashfree-webhook`
   
   *Example: `https://xyzabc123.supabase.co/functions/v1/cashfree-webhook`*

## 2. Event Selection
Select the following events to trigger the webhook:
- **PAYMENT_SUCCESS_WEBHOOK** (Required for activation)
- **PAYMENT_FAILED_WEBHOOK** (Recommended for logging)
- **PAYMENT_USER_DROPPED_WEBHOOK** (Optional)

## 3. Testing the Webhook
You can test the webhook integration directly from the Cashfree dashboard:
1. Go to the **Webhooks** section.
2. Click **Test** next to your configured URL.
3. Select event `PAYMENT_SUCCESS_WEBHOOK`.
4. Click **Simulate**.
5. Check your Supabase **Function Logs** for `cashfree-webhook` to verify receipt.

## 4. Direct Polling Fallback (New Feature)
The system now supports **Direct Payment Verification**:
- The `PaymentSuccessPage` automatically polls the Cashfree API every 5 seconds.
- It uses the `verify-cashfree-payment` Edge Function to check the status directly.
- If the status is `PAID`, it triggers the `activate-membership-from-payment` function immediately.
- This ensures users get activated even if the webhook is delayed or fails.

## 5. Troubleshooting
If memberships are not activating:
1. **Check Logs**: Go to Supabase Dashboard > Edge Functions > `cashfree-webhook` > Logs.
2. **Verify Secrets**: Ensure `CASHFREE_API_KEY`, `CASHFREE_API_SECRET`, and `CASHFREE_ENVIRONMENT` are set correctly in Supabase Secrets.
3. **Check Webhook Signature**: If logs show "Invalid Signature", ensure `CASHFREE_API_SECRET` matches exactly what is in Cashfree.
4. **Use Force Check**: On the success page, click "Force Check Status" to bypass the webhook and verify directly with the API.