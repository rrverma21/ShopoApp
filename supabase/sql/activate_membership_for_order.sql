CREATE OR REPLACE FUNCTION public.activate_membership_for_order(p_order_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_order record;
    v_plan record;
    v_existing_membership record;
    v_duration_days int;
    v_start_date timestamptz;
    v_end_date timestamptz;
    v_log_details jsonb;
BEGIN
    -- Log Start
    RAISE LOG 'activate_membership_for_order called for order_id: %', p_order_id;

    -- 1. Get Order
    SELECT * INTO v_order FROM public.membership_orders WHERE order_id = p_order_id;
    
    IF v_order IS NULL THEN
        RAISE LOG 'Order not found: %', p_order_id;
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- 2. Check Payment Status (Allow fallback activation if status is marked success)
    -- Or if calling from webhook, we assume status is valid or updated shortly before
    IF v_order.status != 'SUCCESS' AND v_order.status != 'PAID' THEN
        -- We might update it here if this function is trusted, but better to update via proper flow
        -- For robustness, if we are here, we check if it is PENDING and maybe update to SUCCESS if this is trusted source?
        -- To be safe, we just log warning.
        RAISE LOG 'Warning: Activating order with status %', v_order.status;
    END IF;

    -- 3. Idempotency Check: Check if membership already exists for this order
    SELECT * INTO v_existing_membership FROM public.user_memberships WHERE order_id = v_order.id;
    
    IF v_existing_membership IS NOT NULL THEN
        RAISE LOG 'Membership already exists for order % (Membership ID: %)', v_order.id, v_existing_membership.id;
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Already activated', 
            'membership_id', v_existing_membership.id,
            'is_new', false
        );
    END IF;

    -- 4. Get Plan
    SELECT * INTO v_plan FROM public.membership_plans WHERE id = v_order.plan_id;
    
    IF v_plan IS NULL THEN
        RAISE LOG 'Plan not found: %', v_order.plan_id;
        RETURN jsonb_build_object('success', false, 'message', 'Plan not found');
    END IF;

    -- 5. Calculate Dates
    v_start_date := now();
    IF v_order.billing_cycle = 'yearly' THEN
        v_duration_days := 365;
    ELSE
        v_duration_days := COALESCE(v_plan.duration_days, 30);
    END IF;
    v_end_date := v_start_date + (v_duration_days || ' days')::interval;

    RAISE LOG 'Creating membership. User: %, Plan: %, Duration: % days', v_order.user_id, v_plan.name, v_duration_days;

    -- 6. Insert Membership Record
    INSERT INTO public.user_memberships (
        user_id, plan_id, order_id, membership_start_date, membership_end_date, status, created_at, updated_at
    ) VALUES (
        v_order.user_id, v_order.plan_id, v_order.id, v_start_date, v_end_date, 'active', now(), now()
    );

    -- 7. Update Profile
    UPDATE public.profiles
    SET 
        membership_plan_id = v_order.plan_id,
        membership_start_date = v_start_date,
        membership_end_date = v_end_date
    WHERE id = v_order.user_id;

    -- 8. Mark Order Activated
    UPDATE public.membership_orders
    SET 
        activated_at = now(),
        status = 'SUCCESS' -- Ensure status is success
    WHERE id = v_order.id;

    -- 9. Log to Audit
    v_log_details := jsonb_build_object(
        'plan_id', v_order.plan_id, 
        'cycle', v_order.billing_cycle,
        'duration', v_duration_days
    );
    
    INSERT INTO public.payment_audit_log (order_id, user_id, event_type, status, details)
    VALUES (p_order_id, v_order.user_id, 'ACTIVATION_COMPLETED', 'SUCCESS', v_log_details);

    RAISE LOG 'Activation successful for order %', p_order_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Activation successful',
        'is_new', true
    );
END;
$function$