-- Add a token-authorized, tracking-only guest read path.
-- Verify that pgcrypto.digest is installed in the extensions schema before applying.
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
    order_data jsonb;
begin
    if p_order_id is null or p_guest_token is null or p_guest_token = '' then
        return null;
    end if;

    select pg_catalog.jsonb_build_object(
        'status', o.status,
        'created_at', o.created_at,
        'updated_at', o.updated_at,
        'tracking_number', o.tracking_number,
        'order_items', (
            select coalesce(
                pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                        'product_name', coalesce(item ->> 'product_name', item ->> 'name'),
                        'quantity', item -> 'quantity',
                        'total', case
                            when item ? 'total' then item -> 'total'
                            when pg_catalog.jsonb_typeof(item -> 'price') = 'number'
                              and pg_catalog.jsonb_typeof(item -> 'quantity') = 'number' then
                                pg_catalog.to_jsonb(
                                    (item ->> 'price')::numeric * (item ->> 'quantity')::numeric
                                )
                            else null
                        end
                    )
                ),
                '[]'::jsonb
            )
            from pg_catalog.jsonb_array_elements(
                coalesce(o.order_items, '[]'::jsonb)
            ) as order_item(item)
        ),
        'total_amount', o.total_amount
    )
    into order_data
    from public.digital_shop_orders as o
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
is 'Returns a minimal tracking response when an order UUID and plaintext guest token are valid.';

revoke all on function public.get_guest_order_tracking(uuid, text) from public;
grant execute on function public.get_guest_order_tracking(uuid, text) to anon, authenticated;
