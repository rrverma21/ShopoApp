-- Forward-only: settle COD collection only when the trusted seller lifecycle reaches Delivered.
begin;
create or replace function public.update_digital_shop_order_status(p_order_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_order public.digital_shop_orders%rowtype; v_access record; v_next text := pg_catalog.initcap(pg_catalog.lower(pg_catalog.btrim(p_status))); v_mark_cod_paid boolean;
begin
 if auth.uid() is null then raise exception 'DIGITAL_SHOP_SELLER_AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 select * into v_order from public.digital_shop_orders where id=p_order_id and retailer_id=auth.uid() for update;
 if not found then raise exception 'DIGITAL_SHOP_ORDER_NOT_FOUND_OR_NOT_OWNED' using errcode='42501'; end if;
 select * into v_access from public.resolve_effective_digital_shop_entitlement(auth.uid());
 if not found or not coalesce(v_access.actor_authorized,false) or not coalesce(v_access.has_publish_entitlement,false) then raise exception 'DIGITAL_SHOP_ENTITLEMENT_REQUIRED' using errcode='42501'; end if;
 if not ((v_order.status='Pending' and v_next in ('Processing','Cancelled')) or (v_order.status='Processing' and v_next in ('Shipped','Cancelled')) or (v_order.status='Shipped' and v_next='Delivered')) then raise exception 'DIGITAL_SHOP_ORDER_STATUS_TRANSITION_INVALID' using errcode='22023'; end if;
 v_mark_cod_paid := v_order.status='Shipped' and v_next='Delivered' and pg_catalog.upper(pg_catalog.btrim(coalesce(v_order.payment_method,''))) in ('COD','CASH ON DELIVERY');
 update public.digital_shop_orders set status=v_next, payment_status=case when v_mark_cod_paid then 'Paid' else payment_status end where id=v_order.id and retailer_id=auth.uid();
 return pg_catalog.jsonb_build_object('id',v_order.id,'status',v_next,'payment_status',case when v_mark_cod_paid then 'Paid' else v_order.payment_status end);
end;$function$;
revoke all on function public.update_digital_shop_order_status(uuid,text) from public,anon;
grant execute on function public.update_digital_shop_order_status(uuid,text) to authenticated,service_role;
commit;
