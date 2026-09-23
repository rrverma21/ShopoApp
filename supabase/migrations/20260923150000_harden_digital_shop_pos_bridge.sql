-- Launch-critical Digital Shop -> POS bridge hardening.
-- Production preflight 2026-09-23 confirmed no duplicate non-null digital_order_id groups.
-- This migration deliberately does not replace the bridge function body: its sale, item,
-- customer, tax, loyalty, and inventory-trigger behavior remains deployed unchanged.
begin;

-- Keep the deployed SECURITY DEFINER function, but prevent caller-controlled name lookup.
alter function public.move_digital_order_to_pos_sales(uuid) set search_path to '';

-- The application calls the bridge as an authenticated retailer. service_role remains
-- available for operational use; postgres retains owner privileges without a grant.
revoke all on function public.move_digital_order_to_pos_sales(uuid) from public;
revoke all on function public.move_digital_order_to_pos_sales(uuid) from anon;
grant execute on function public.move_digital_order_to_pos_sales(uuid) to authenticated, service_role;

-- One Digital Shop order may produce at most one POS sale. A concurrent losing call
-- fails at the insert and PostgreSQL rolls back that complete function transaction,
-- including inserted items, their stock/customer/loyalty trigger effects, and any later
-- is_moved_to_sales update.
create unique index point_of_sale_sales_digital_order_id_unique_idx
  on public.point_of_sale_sales (digital_order_id)
  where digital_order_id is not null;

commit;
