-- Expand secure guest order reads with a defensive customer-facing bill projection.
-- No delivery charge is projected because Digital Shop orders do not store one.
create or replace function public.get_guest_order_tracking(
    p_order_id uuid,
    p_guest_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_token_bytes bytea;
    v_canonical_token text;
    order_data jsonb;
begin
    if p_order_id is null
       or p_guest_token is null
       or pg_catalog.length(p_guest_token) <> 43
       or p_guest_token !~ '^[A-Za-z0-9_-]{43}$' then
        return null;
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
            return null;
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
        return null;
    end if;

    select pg_catalog.jsonb_build_object(
        'status', o.status,
        'created_at', o.created_at,
        'updated_at', o.updated_at,
        'tracking_number', o.tracking_number,
        'order_items', bill.order_items,
        'subtotal', bill.subtotal,
        'gift_wrapping', o.gift_wrapping,
        'gift_wrapping_cost', o.gift_wrapping_cost,
        'total_amount', o.total_amount
    )
    into order_data
    from public.digital_shop_orders as o
    cross join lateral (
        select
            coalesce(
                pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                        'product_name', coalesce(line.item ->> 'product_name', line.item ->> 'name'),
                        'quantity', case
                            when pg_catalog.jsonb_typeof(line.item -> 'quantity') = 'number'
                                then line.item -> 'quantity'
                            else null
                        end,
                        'unit_price', case
                            when pg_catalog.jsonb_typeof(line.item -> 'price') = 'number'
                                then line.item -> 'price'
                            else null
                        end,
                        'total', line.line_total
                    )
                    order by line.item_index
                ),
                '[]'::jsonb
            ) as order_items,
            case
                when pg_catalog.jsonb_typeof(o.order_items) is distinct from 'array' then null
                when not exists (
                    select 1
                    from pg_catalog.jsonb_array_elements(
                        case
                            when pg_catalog.jsonb_typeof(o.order_items) = 'array' then o.order_items
                            else '[]'::jsonb
                        end
                    ) as source_item(item)
                    where pg_catalog.jsonb_typeof(source_item.item) is distinct from 'object'
                )
                  and pg_catalog.count(*) = pg_catalog.count(line.line_total)
                    then coalesce(pg_catalog.sum(line.line_total), 0::numeric)
                else null
            end as subtotal
        from (
            select
                order_item.item,
                order_item.item_index,
                case
                    when pg_catalog.jsonb_typeof(order_item.item -> 'total') = 'number' then
                        (order_item.item ->> 'total')::numeric
                    when pg_catalog.jsonb_typeof(order_item.item -> 'price') = 'number'
                      and pg_catalog.jsonb_typeof(order_item.item -> 'quantity') = 'number' then
                        (order_item.item ->> 'price')::numeric
                            * (order_item.item ->> 'quantity')::numeric
                    else null
                end as line_total
            from pg_catalog.jsonb_array_elements(
                case
                    when pg_catalog.jsonb_typeof(o.order_items) = 'array' then o.order_items
                    else '[]'::jsonb
                end
            ) with ordinality as order_item(item, item_index)
            where pg_catalog.jsonb_typeof(order_item.item) = 'object'
        ) as line
    ) as bill
    where o.id = p_order_id
      and o.guest_access_token_hash is not null
      and o.guest_access_token_hash = pg_catalog.encode(
          extensions.digest(pg_catalog.convert_to(p_guest_token, 'UTF8'), 'sha256'),
          'hex'
      )
      and (
          o.guest_access_expires_at is null
          or o.guest_access_expires_at > pg_catalog.now()
      );

    return order_data;
end;
$function$;

comment on function public.get_guest_order_tracking(uuid, text)
is 'Returns a minimal tracking and bill response when an order UUID and plaintext guest token are valid.';

revoke all on function public.get_guest_order_tracking(uuid, text) from public;
grant execute on function public.get_guest_order_tracking(uuid, text) to anon, authenticated;

create or replace function public.get_guest_order_confirmation(
    p_order_id uuid,
    p_guest_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_token_bytes bytea;
    v_canonical_token text;
    order_data jsonb;
begin
    if p_order_id is null
       or p_guest_token is null
       or pg_catalog.length(p_guest_token) <> 43
       or p_guest_token !~ '^[A-Za-z0-9_-]{43}$' then
        return null;
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
            return null;
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
        return null;
    end if;

    select pg_catalog.jsonb_build_object(
        'order_id', o.id,
        'status', o.status,
        'created_at', o.created_at,
        'order_items', bill.order_items,
        'subtotal', bill.subtotal,
        'total_amount', o.total_amount,
        'gift_wrapping', o.gift_wrapping,
        'gift_wrapping_cost', o.gift_wrapping_cost,
        'shipping_address', pg_catalog.jsonb_build_object(
            'name', case
                when pg_catalog.jsonb_typeof(o.shipping_address) = 'object'
                    then o.shipping_address -> 'name'
                else null
            end,
            'address', case
                when pg_catalog.jsonb_typeof(o.shipping_address) = 'object'
                    then o.shipping_address -> 'address'
                else null
            end,
            'city', case
                when pg_catalog.jsonb_typeof(o.shipping_address) = 'object'
                    then o.shipping_address -> 'city'
                else null
            end
        ),
        'payment_method', o.payment_method,
        'payment_status', o.payment_status,
        'retailer_id', o.retailer_id
    )
    into order_data
    from public.digital_shop_orders as o
    cross join lateral (
        select
            coalesce(
                pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                        'product_name', coalesce(line.item ->> 'product_name', line.item ->> 'name'),
                        'quantity', case
                            when pg_catalog.jsonb_typeof(line.item -> 'quantity') = 'number'
                                then line.item -> 'quantity'
                            else null
                        end,
                        'unit_price', case
                            when pg_catalog.jsonb_typeof(line.item -> 'price') = 'number'
                                then line.item -> 'price'
                            else null
                        end,
                        'total', line.line_total
                    )
                    order by line.item_index
                ),
                '[]'::jsonb
            ) as order_items,
            case
                when pg_catalog.jsonb_typeof(o.order_items) is distinct from 'array' then null
                when not exists (
                    select 1
                    from pg_catalog.jsonb_array_elements(
                        case
                            when pg_catalog.jsonb_typeof(o.order_items) = 'array' then o.order_items
                            else '[]'::jsonb
                        end
                    ) as source_item(item)
                    where pg_catalog.jsonb_typeof(source_item.item) is distinct from 'object'
                )
                  and pg_catalog.count(*) = pg_catalog.count(line.line_total)
                    then coalesce(pg_catalog.sum(line.line_total), 0::numeric)
                else null
            end as subtotal
        from (
            select
                order_item.item,
                order_item.item_index,
                case
                    when pg_catalog.jsonb_typeof(order_item.item -> 'total') = 'number' then
                        (order_item.item ->> 'total')::numeric
                    when pg_catalog.jsonb_typeof(order_item.item -> 'price') = 'number'
                      and pg_catalog.jsonb_typeof(order_item.item -> 'quantity') = 'number' then
                        (order_item.item ->> 'price')::numeric
                            * (order_item.item ->> 'quantity')::numeric
                    else null
                end as line_total
            from pg_catalog.jsonb_array_elements(
                case
                    when pg_catalog.jsonb_typeof(o.order_items) = 'array' then o.order_items
                    else '[]'::jsonb
                end
            ) with ordinality as order_item(item, item_index)
            where pg_catalog.jsonb_typeof(order_item.item) = 'object'
        ) as line
    ) as bill
    where o.id = p_order_id
      and o.guest_access_token_hash is not null
      and o.guest_access_token_hash = pg_catalog.encode(
          extensions.digest(pg_catalog.convert_to(p_guest_token, 'UTF8'), 'sha256'),
          'hex'
      )
      and (
          o.guest_access_expires_at is null
          or o.guest_access_expires_at > pg_catalog.now()
      );

    return order_data;
end;
$function$;

comment on function public.get_guest_order_confirmation(uuid, text)
is 'Returns a minimal guest order confirmation with a customer-facing bill when the order UUID and plaintext guest token are valid.';

revoke all on function public.get_guest_order_confirmation(uuid, text) from public;
grant execute on function public.get_guest_order_confirmation(uuid, text) to anon, authenticated;
