alter table public.products
    add column if not exists selling_price numeric;

alter table public.products
    add constraint products_selling_price_nonnegative
    check (selling_price >= 0)
    not valid;

with valid_tiers as (
    select product.id as product_id,
           (tier.value->>'min_quantity')::numeric as min_quantity,
           (tier.value->>'price')::numeric as price
      from public.products as product
      cross join lateral pg_catalog.jsonb_array_elements(
          case
              when pg_catalog.jsonb_typeof(product.pricing_tiers) = 'array'
                  then product.pricing_tiers
              else '[]'::jsonb
          end
      ) as tier(value)
     where pg_catalog.jsonb_typeof(tier.value) = 'object'
       and pg_catalog.jsonb_typeof(tier.value->'min_quantity') = 'number'
       and pg_catalog.jsonb_typeof(tier.value->'price') = 'number'
       and (tier.value->>'min_quantity')::numeric >= 0
       and (tier.value->>'price')::numeric >= 0
),
lowest_thresholds as (
    select valid_tiers.product_id,
           pg_catalog.min(valid_tiers.min_quantity) as min_quantity
      from valid_tiers
     group by valid_tiers.product_id
),
safe_base_prices as (
    select valid_tiers.product_id,
           pg_catalog.min(valid_tiers.price) as selling_price
      from valid_tiers
      join lowest_thresholds
        on lowest_thresholds.product_id = valid_tiers.product_id
       and lowest_thresholds.min_quantity = valid_tiers.min_quantity
     group by valid_tiers.product_id
    having pg_catalog.count(distinct valid_tiers.price) = 1
)
update public.products as product
   set selling_price = safe_base_prices.selling_price
  from safe_base_prices
 where product.id = safe_base_prices.product_id
   and product.selling_price is null;

alter table public.products
    validate constraint products_selling_price_nonnegative;
