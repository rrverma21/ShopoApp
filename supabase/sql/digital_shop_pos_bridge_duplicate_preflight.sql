-- READ ONLY Production preflight. Do not run as a deployment script.
-- Reports only duplicated Digital Shop order references and their POS-sale counts.
-- It does not return customer, product, payment, amount, inventory, or sale-item data.
begin transaction isolation level repeatable read, read only;

with duplicate_groups as (
  select digital_order_id, count(*)::bigint as pos_sale_count
  from public.point_of_sale_sales
  where digital_order_id is not null
  group by digital_order_id
  having count(*) > 1
)
select
  'duplicate_digital_order_id'::text as check_name,
  digital_order_id,
  pos_sale_count
from duplicate_groups

union all

select
  'duplicate_group_count'::text as check_name,
  null::uuid as digital_order_id,
  count(*)::bigint as pos_sale_count
from duplicate_groups

order by check_name, digital_order_id nulls last;

commit;
