create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  free_trial_plan_id uuid;
  free_trial_duration integer := 30;
  requested_role text;
  user_role text;
  plan_duration integer;
  calculated_end_date timestamptz;
begin
  -- Accept only canonical public-signup roles, defaulting omitted roles to customer.
  requested_role := pg_catalog.btrim(
    coalesce(NEW.raw_user_meta_data->>'role', '')
  );

  if requested_role = '' then
    user_role := 'customer';
  elsif requested_role in ('customer', 'seller') then
    user_role := requested_role;
  else
    raise exception 'Invalid signup role';
  end if;

  -- Insert the profile
  insert into public.profiles (id, business_name, contact_person, street_address, city, pincode, phone, role)
  values (
    NEW.id,
    NEW.raw_user_meta_data->>'businessName',
    NEW.raw_user_meta_data->>'contactPerson',
    NEW.raw_user_meta_data->>'streetAddress',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'pincode',
    NEW.raw_user_meta_data->>'phone',
    user_role
  );

  -- Special logic for Sellers: Assign Free Starter Plan automatically
  if user_role = 'seller' then
    -- Attempt to find the FREE STARTER or FREE TRIAL plan
    -- CRITICAL: Plans with duration_days = 0 are unlimited (never expire)
    select id, duration_days into free_trial_plan_id, plan_duration
    from public.membership_plans
    where (name ilike '%FREE%' or name ilike '%STARTER%' or price = 0)
      and is_active = true
    order by
      case
        when name ilike '%FREE STARTER%' then 1
        when name ilike '%STARTER%' then 2
        when name ilike '%FREE%' then 3
        else 4
      end asc
    limit 1;

    -- If found, assign it to the new profile and create membership record
    if free_trial_plan_id is not null then
        -- Calculate end_date based on duration_days
        -- CRITICAL: duration_days = 0 means unlimited, so end_date = NULL
        if plan_duration = 0 then
          calculated_end_date := null; -- Unlimited plan
        else
          calculated_end_date := pg_catalog.now() + (coalesce(plan_duration, 30) || ' days')::interval;
        end if;

        -- Update Profile with membership details
        update public.profiles
        set
            membership_plan_id = free_trial_plan_id,
            membership_start_date = pg_catalog.now(),
            membership_end_date = calculated_end_date, -- NULL if unlimited
            free_trial_active = true,
            free_trial_start_date = pg_catalog.now(),
            free_trial_end_date = calculated_end_date, -- NULL if unlimited
            free_trial_days = case when plan_duration = 0 then null else plan_duration end,
            registration_fee_paid = true
        where id = NEW.id;

        -- Insert into user_memberships with NULL order_id for free plans
        insert into public.user_memberships (
            user_id,
            membership_plan_id,
            plan_id,
            status,
            start_date,
            end_date, -- NULL if duration_days = 0 (unlimited)
            created_at,
            updated_at,
            order_id
        ) values (
            NEW.id,
            free_trial_plan_id,
            free_trial_plan_id,
            'active',
            pg_catalog.now(),
            calculated_end_date, -- NULL for unlimited plans
            pg_catalog.now(),
            pg_catalog.now(),
            null
        );

        -- Log successful activation (optional, for debugging)
        raise notice 'Assigned plan % (duration: % days, end_date: %) to new seller %',
          free_trial_plan_id,
          coalesce(plan_duration::text, 'unlimited'),
          coalesce(calculated_end_date::text, 'never'),
          NEW.id;
    else
        raise warning 'No FREE STARTER plan found for new seller %', NEW.id;
    end if;
  end if;

  return NEW;
end;
$function$;

comment on function public.handle_new_user() is
  'Bootstraps Auth signup profiles for customer/seller roles, initializes seller free/starter membership, and rejects privileged roles from signup metadata.';

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
