create or replace function public.get_public_retailer_settings(
    p_retailer_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    select pg_catalog.jsonb_build_object(
        'retailer_id', s.user_id,
        'description', s.description,
        'opening_time', s.opening_time,
        'closing_time', s.closing_time,
        'working_days', s.working_days,
        'storefront_image_url', s.storefront_image_url,
        'shop_type', s.shop_type,
        'shop_category', s.shop_category,
        'country', s.country,
        'delivery_enabled', s.delivery_enabled
    )
    from public.pos_retailer_settings as s
    where s.user_id = p_retailer_id;
$$;

comment on function public.get_public_retailer_settings(uuid) is
    'Returns an allowlisted customer-safe projection of retailer settings for public storefront use.';

revoke all on function public.get_public_retailer_settings(uuid) from public;
grant execute on function public.get_public_retailer_settings(uuid) to anon, authenticated;
