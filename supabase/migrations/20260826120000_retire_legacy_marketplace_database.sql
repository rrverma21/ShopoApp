-- Retire the legacy Marketplace database subsystem after its frontend and
-- active source callers have been removed.
--
-- Production evidence recorded zero products, product_master rows, and
-- product_edit_suggestions rows. Dropping orders and order_items intentionally
-- removes two historical orders and one historical order item. All retained
-- external FK row-reference counts were verified as zero, and their FK
-- constraints are removed explicitly below.

-- Preserve shared account cleanup while removing only retired Marketplace
-- table operations. CREATE OR REPLACE preserves the deployed function ACL.
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- 1. Unlink references where we want to keep the data (Admin/Staff actions)
  UPDATE public.membership_payments SET reviewed_by = NULL WHERE reviewed_by = target_user_id;
  UPDATE public.seller_settlements SET settled_by = NULL WHERE settled_by = target_user_id;
  UPDATE public.order_payment_receipts SET reviewed_by = NULL WHERE reviewed_by = target_user_id;

  -- 2. Delete direct dependencies (User's own data)

  -- Team Members (The specific error source)
  DELETE FROM public.team_members WHERE user_id = target_user_id OR admin_id = target_user_id;

  -- Addresses & Subscriptions
  DELETE FROM public.user_addresses WHERE user_id = target_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE recipient_id = target_user_id;

  -- Reviews
  DELETE FROM public.reviews WHERE reviewer_id = target_user_id OR target_id = target_user_id;

  -- Rider Data
  DELETE FROM public.rider_documents WHERE registration_id IN (SELECT id FROM public.rider_registrations WHERE user_id = target_user_id);
  DELETE FROM public.rider_registrations WHERE user_id = target_user_id;
  DELETE FROM public.delivery_rider_details WHERE rider_id = target_user_id;
  DELETE FROM public.rider_payment_settlements WHERE rider_id = target_user_id;

  -- Delivery Bookings
  DELETE FROM public.delivery_payments WHERE booking_id IN (SELECT id FROM public.delivery_bookings WHERE customer_id = target_user_id OR rider_id = target_user_id);
  DELETE FROM public.delivery_bookings WHERE customer_id = target_user_id OR rider_id = target_user_id;

  -- POS / Retailer Data
  DELETE FROM public.pos_retailer_settings WHERE user_id = target_user_id;
  DELETE FROM public.gst_reports WHERE user_id = target_user_id;
  DELETE FROM public.dior_expenses WHERE user_id = target_user_id;
  DELETE FROM public.dior_sales WHERE user_id = target_user_id;
  DELETE FROM public.dior_bills WHERE user_id = target_user_id;
  DELETE FROM public.dior_bill_categories WHERE user_id = target_user_id;
  DELETE FROM public.dior_settings WHERE user_id = target_user_id;
  DELETE FROM public.dior_suppliers WHERE user_id = target_user_id;

  -- POS Sales & Products
  DELETE FROM public.point_of_sale_refund_items WHERE refund_id IN (SELECT id FROM public.point_of_sale_refunds WHERE user_id = target_user_id);
  DELETE FROM public.point_of_sale_refunds WHERE user_id = target_user_id;

  DELETE FROM public.point_of_sale_sale_items WHERE sale_id IN (SELECT id FROM public.point_of_sale_sales WHERE user_id = target_user_id);
  DELETE FROM public.point_of_sale_sales WHERE user_id = target_user_id;

  DELETE FROM public.point_of_sale_customers WHERE user_id = target_user_id;
  DELETE FROM public.point_of_sale_products WHERE user_id = target_user_id;

  -- Digital Shop
  DELETE FROM public.digital_shop_orders WHERE retailer_id = target_user_id OR customer_id = target_user_id;

  -- Seller / E-commerce Data
  DELETE FROM public.limit_increase_requests WHERE seller_id = target_user_id;
  DELETE FROM public.membership_payments WHERE seller_id = target_user_id;
  DELETE FROM public.delivery_shops WHERE seller_id = target_user_id;

  DELETE FROM public.brands WHERE seller_id = target_user_id;
  DELETE FROM public.categories WHERE seller_id = target_user_id;
  DELETE FROM public.user_suppliers WHERE user_id = target_user_id;

  -- Settlements
  DELETE FROM public.settlement_items WHERE settlement_id IN (SELECT id FROM public.seller_settlements WHERE seller_id = target_user_id);
  DELETE FROM public.seller_settlements WHERE seller_id = target_user_id;
END;
$function$;

-- Retire Marketplace-only routines before removing their table dependencies.
DROP FUNCTION IF EXISTS public.create_order_as_admin(uuid, jsonb, numeric, jsonb);
DROP FUNCTION IF EXISTS public.create_order_as_admin(uuid, jsonb, numeric, jsonb, uuid);
DROP FUNCTION IF EXISTS public.create_order_as_admin_v2(uuid, jsonb, jsonb, uuid);
DROP FUNCTION IF EXISTS public.create_seller_settlement(uuid, timestamp with time zone, timestamp with time zone, uuid[]);
DROP FUNCTION IF EXISTS public.create_unregistered_order(jsonb, numeric, jsonb);
DROP FUNCTION IF EXISTS public.get_seller_performance_report(text, text);
DROP FUNCTION IF EXISTS public.get_unregistered_clients();
DROP FUNCTION IF EXISTS public.get_unsettled_orders_for_payout();
DROP FUNCTION IF EXISTS public.search_products(text, uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.ship_order_and_update_stock(uuid);

-- Retain these tables and identifier columns; remove only FKs to retiring
-- Marketplace parent tables. Production referencing-row counts are zero.
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_order_id_fkey;

ALTER TABLE public.order_payment_receipts
DROP CONSTRAINT IF EXISTS order_payment_receipts_order_id_fkey;

ALTER TABLE public.promotion_redemptions
DROP CONSTRAINT IF EXISTS promotion_redemptions_order_id_fkey;

ALTER TABLE public.reviews
DROP CONSTRAINT IF EXISTS reviews_order_id_fkey;

ALTER TABLE public.settlement_items
DROP CONSTRAINT IF EXISTS settlement_items_order_id_fkey;

ALTER TABLE public.product_suppliers
DROP CONSTRAINT IF EXISTS product_suppliers_product_id_fkey;

-- Child tables precede their parents so table-owned dependencies disappear
-- naturally and every external dependency remains explicit.
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.product_edit_suggestions;
DROP TABLE IF EXISTS public.product_master;

-- The orders trigger is removed with its table; its Marketplace-only helper
-- can then be retired without affecting the remote Edge Function source.
DROP FUNCTION IF EXISTS public.handle_new_order_notification();
