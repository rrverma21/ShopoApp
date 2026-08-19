-- Add the idempotency foundation for secure Digital Shop order creation.
alter table public.digital_shop_orders
    add column if not exists guest_checkout_request_id uuid,
    add column if not exists guest_checkout_payload_hash text;

create unique index if not exists idx_digital_shop_orders_guest_checkout_request_id
    on public.digital_shop_orders (guest_checkout_request_id)
    where guest_checkout_request_id is not null;

-- Create an order atomically while storing only a hash of the guest token.
-- Commercial values remain client-provided pending later price and inventory hardening.
create or replace function public.create_digital_shop_order(
    p_checkout_request_id uuid,
    p_guest_token text,
    p_retailer_id uuid,
    p_customer_phone text,
    p_order_items jsonb,
    p_total_amount numeric,
    p_payment_method text,
    p_gift_wrapping boolean,
    p_gift_wrapping_cost numeric,
    p_shipping_address jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_customer_id uuid := auth.uid();
    v_customer_phone text;
    v_token_bytes bytea;
    v_canonical_token text;
    v_token_hash text;
    v_payload jsonb;
    v_payload_hash text;
    v_order_id uuid;
    v_guest_access_expires_at timestamp with time zone;
    v_existing record;
begin
    if p_checkout_request_id is null then
        raise exception 'Invalid checkout request';
    end if;

    if p_guest_token is null
       or pg_catalog.length(p_guest_token) <> 43
       or p_guest_token !~ '^[A-Za-z0-9_-]{43}$' then
        raise exception 'Invalid checkout request';
    end if;

    begin
        v_token_bytes := pg_catalog.decode(
            pg_catalog.replace(
                pg_catalog.replace(p_guest_token, '-', '+'),
                '_',
                '/'
            ) || '=',
            'base64'
        );
    exception
        when others then
            raise exception 'Invalid checkout request';
    end;

    v_canonical_token := pg_catalog.rtrim(
        pg_catalog.replace(
            pg_catalog.replace(
                pg_catalog.encode(v_token_bytes, 'base64'),
                '+',
                '-'
            ),
            '/',
            '_'
        ),
        '='
    );

    if pg_catalog.octet_length(v_token_bytes) <> 32
       or v_canonical_token <> p_guest_token then
        raise exception 'Invalid checkout request';
    end if;

    if p_retailer_id is null then
        raise exception 'Invalid checkout request';
    end if;

    if not exists (
        select 1
        from public.public_shop_profiles as shop
        where shop.id = p_retailer_id
          and shop.is_disabled is not true
    ) then
        raise exception 'Invalid checkout request';
    end if;

    v_customer_phone := pg_catalog.btrim(p_customer_phone);
    if v_customer_phone is null
       or v_customer_phone = ''
       or pg_catalog.length(v_customer_phone) > 64 then
        raise exception 'Invalid checkout request';
    end if;

    if p_order_items is null
       or pg_catalog.jsonb_typeof(p_order_items) <> 'array'
       or pg_catalog.jsonb_array_length(p_order_items) = 0 then
        raise exception 'Invalid checkout request';
    end if;

    if p_total_amount is null
       or p_total_amount::text in ('NaN', 'Infinity', '-Infinity')
       or p_total_amount < 0 then
        raise exception 'Invalid checkout request';
    end if;

    if p_payment_method is null or p_payment_method <> 'COD' then
        raise exception 'Invalid checkout request';
    end if;

    if p_gift_wrapping is null
       or p_gift_wrapping_cost is null
       or p_gift_wrapping_cost::text in ('NaN', 'Infinity', '-Infinity')
       or p_gift_wrapping_cost < 0 then
        raise exception 'Invalid checkout request';
    end if;

    if p_shipping_address is null
       or pg_catalog.jsonb_typeof(p_shipping_address) <> 'object'
       or pg_catalog.jsonb_typeof(p_shipping_address -> 'name') is distinct from 'string'
       or pg_catalog.jsonb_typeof(p_shipping_address -> 'address') is distinct from 'string'
       or pg_catalog.jsonb_typeof(p_shipping_address -> 'city') is distinct from 'string'
       or pg_catalog.jsonb_typeof(p_shipping_address -> 'pincode') is distinct from 'string'
       or p_shipping_address ->> 'name' ~ '^[[:space:]]*$'
       or p_shipping_address ->> 'address' ~ '^[[:space:]]*$'
       or p_shipping_address ->> 'city' ~ '^[[:space:]]*$'
       or p_shipping_address ->> 'pincode' ~ '^[[:space:]]*$'
       then
        raise exception 'Invalid checkout request';
    end if;

    v_token_hash := pg_catalog.encode(
        extensions.digest(
            pg_catalog.convert_to(p_guest_token, 'UTF8'),
            'sha256'
        ),
        'hex'
    );

    v_payload := pg_catalog.jsonb_build_object(
        'retailer_id', p_retailer_id,
        'customer_id', v_customer_id,
        'customer_phone', v_customer_phone,
        'order_items', p_order_items,
        'total_amount', p_total_amount,
        'payment_method', 'COD',
        'shipping_address', p_shipping_address,
        'gift_wrapping', p_gift_wrapping,
        'gift_wrapping_cost', p_gift_wrapping_cost
    );

    v_payload_hash := pg_catalog.encode(
        extensions.digest(
            pg_catalog.convert_to(v_payload::text, 'UTF8'),
            'sha256'
        ),
        'hex'
    );

    insert into public.digital_shop_orders (
        retailer_id,
        customer_id,
        customer_phone,
        order_items,
        total_amount,
        payment_method,
        status,
        payment_status,
        is_moved_to_sales,
        gift_wrapping,
        gift_wrapping_cost,
        shipping_address,
        guest_access_token_hash,
        guest_access_expires_at,
        guest_checkout_request_id,
        guest_checkout_payload_hash
    )
    values (
        p_retailer_id,
        v_customer_id,
        v_customer_phone,
        p_order_items,
        p_total_amount,
        'COD',
        'Pending',
        'Unpaid',
        false,
        p_gift_wrapping,
        p_gift_wrapping_cost,
        p_shipping_address,
        v_token_hash,
        pg_catalog.now() + interval '180 days',
        p_checkout_request_id,
        v_payload_hash
    )
    on conflict (guest_checkout_request_id)
        where guest_checkout_request_id is not null
        do nothing
    returning id, guest_access_expires_at
    into v_order_id, v_guest_access_expires_at;

    if v_order_id is not null then
        return pg_catalog.jsonb_build_object(
            'order_id', v_order_id,
            'guest_access_expires_at', v_guest_access_expires_at,
            'created', true
        );
    end if;

    select
        existing.id,
        existing.guest_checkout_payload_hash,
        existing.guest_access_token_hash,
        existing.guest_access_expires_at
    into v_existing
    from public.digital_shop_orders as existing
    where existing.guest_checkout_request_id = p_checkout_request_id;

    if not found then
        raise exception 'Unable to resolve checkout request';
    end if;

    if v_existing.guest_checkout_payload_hash is distinct from v_payload_hash
       or v_existing.guest_access_token_hash is distinct from v_token_hash then
        raise exception 'Checkout request conflict';
    end if;

    return pg_catalog.jsonb_build_object(
        'order_id', v_existing.id,
        'guest_access_expires_at', v_existing.guest_access_expires_at,
        'created', false
    );
end;
$function$;

comment on function public.create_digital_shop_order(
    uuid, text, uuid, text, jsonb, numeric, text, boolean, numeric, jsonb
)
is 'Creates or safely replays an idempotent Digital Shop order without storing the plaintext guest token.';

revoke all on function public.create_digital_shop_order(
    uuid, text, uuid, text, jsonb, numeric, text, boolean, numeric, jsonb
) from public;

grant execute on function public.create_digital_shop_order(
    uuid, text, uuid, text, jsonb, numeric, text, boolean, numeric, jsonb
) to anon, authenticated;
