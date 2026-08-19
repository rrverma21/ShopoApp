# Membership Activation Flow Documentation

## Overview
This document outlines the end-to-end flow for purchasing and activating memberships using Cashfree Payments and Supabase.

## System Components
1. **Frontend (React)**
   - `MembershipPlansPage`: Displays plans, initiates order via Edge Function.
   - `PaymentSuccessPage`: Handles redirect from Cashfree, verifies payment status.
   - `MembershipStatusDisplay`: Shows active membership details.

2. **Backend (Edge Functions)**
   - `create-cashfree-order`: Generates Order ID, creates DB record, gets Cashfree Session.
   - `cashfree-webhook`: Receives async notification from Cashfree, activates membership.
   - `verify-cashfree-payment`: Polls Cashfree API for status (fallback for webhook delay).

3. **Database (PostgreSQL)**
   - `membership_plans`: Products/Plans catalog.
   - `membership_orders`: Transaction logs for payment attempts.
   - `user_memberships`: The active source of truth for user access.
   - `membership_activation_logs`: Audit trail for debugging.

## Detailed Flow

### 1. Initiation
- User selects plan in `MembershipPlansPage`.
- Calls `create-cashfree-order`.
- Function:
  - Validates input.
  - Inserts `PENDING` record into `membership_orders`.
  - Calls Cashfree API to create order.
  - Returns `payment_session_id`.
- Frontend initializes Cashfree SDK and redirects to payment.

### 2. Payment
- User completes payment on Cashfree gateway.
- Cashfree redirects user to `return_url` (PaymentSuccessPage).
- Simultaneously, Cashfree sends webhook to `cashfree-webhook`.

### 3. Activation (Path A: Webhook - Preferred)
- Cashfree POSTs to `cashfree-webhook`.
- Function verifies `x-webhook-signature`.
- Function calls SQL `activate_membership_for_order`.
- SQL Logic:
  - Checks if membership already active for this order (Idempotency).
  - Expires old memberships.
  - Inserts new record into `user_memberships`.
  - Updates `membership_orders` to SUCCESS.

### 4. Verification (Path B: Client Fallback)
- User lands on `PaymentSuccessPage`.
- Component calls `verify-cashfree-payment`.
- Function checks status with Cashfree API.
- If PAID/SUCCESS:
  - Updates `membership_orders`.
  - Calls `activate_membership_for_order` (in case webhook failed/delayed).
  - Returns success status.
- UI shows Success message and loads membership details.

## Testing Checklist

### 1. Successful Purchase
- [ ] Select plan, complete payment (Sandbox card).
- [ ] Verify `PaymentSuccessPage` shows success.
- [ ] Verify `user_memberships` table has new record.
- [ ] Verify `membership_orders` status is 'SUCCESS'.

### 2. Failed Payment
- [ ] Cancel payment or use failed card.
- [ ] Verify `PaymentSuccessPage` shows error/failure.
- [ ] Verify `membership_orders` status is 'FAILED' or 'PENDING'.
- [ ] Verify NO new record in `user_memberships`.

### 3. Webhook Manual Test
- Use `curl` to simulate webhook: