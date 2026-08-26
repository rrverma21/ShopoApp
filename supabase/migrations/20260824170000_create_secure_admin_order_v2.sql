create or replace function public.create_order_as_admin_v2(
    p_user_id uuid,
    p_shipping_address jsonb,
    p_order_items jsonb,
    p_seller_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_actor_id uuid;
    v_actor_role text;
    v_actor_seller_id uuid;
    v_seller public.profiles%rowtype;
    v_customer public.profiles%rowtype;
    v_shipping_address jsonb;
    v_shipping_pincode text;
    v_shipping_charge numeric;
    v_subtotal numeric := 0;
    v_total_amount numeric;
    v_order_id uuid;
    v_item jsonb;
    v_product record;
    v_product_id uuid;
    v_quantity integer;
    v_quantity_text text;
    v_seen_product_ids uuid[] := array[]::uuid[];
    v_quantities integer[] := array[]::integer[];
    v_item_count integer := 0;
    v_validated_item_count integer := 0;
begin
    v_actor_id := auth.uid();

    if v_actor_id is null then
        raise exception 'Not authorized';
    end if;

    select profile.role, profile.seller_id
      into v_actor_role, v_actor_seller_id
      from public.profiles as profile
     where profile.id = v_actor_id;

    if not found or v_actor_role is null or v_actor_role not in ('admin', 'salesman') then
        raise exception 'Not authorized';
    end if;

    if p_seller_id is null then
        raise exception 'Invalid seller';
    end if;

    if v_actor_role = 'salesman'
       and (v_actor_seller_id is null or p_seller_id <> v_actor_seller_id) then
        raise exception 'Not authorized for seller';
    end if;

    select profile.*
      into v_seller
      from public.profiles as profile
     where profile.id = p_seller_id
       and profile.role in ('seller', 'retailer', 'admin')
       and pg_catalog.coalesce(profile.is_disabled, false) = false;

    if not found then
        raise exception 'Invalid seller';
    end if;

    if p_user_id is not null then
        select profile.*
          into v_customer
          from public.profiles as profile
         where profile.id = p_user_id
           and profile.role in ('customer', 'client');

        if not found then
            raise exception 'Invalid customer';
        end if;

        if pg_catalog.nullif(pg_catalog.btrim(v_customer.phone), '') is null
           or pg_catalog.nullif(pg_catalog.btrim(v_customer.street_address), '') is null
           or pg_catalog.nullif(pg_catalog.btrim(v_customer.city), '') is null
           or pg_catalog.nullif(pg_catalog.btrim(v_customer.pincode), '') is null then
            raise exception 'Customer shipping address is incomplete';
        end if;

        v_shipping_address := pg_catalog.jsonb_build_object(
            'businessName', v_customer.business_name,
            'contactPerson', v_customer.contact_person,
            'phone', pg_catalog.btrim(v_customer.phone),
            'streetAddress', pg_catalog.btrim(v_customer.street_address),
            'city', pg_catalog.btrim(v_customer.city),
            'pincode', pg_catalog.btrim(v_customer.pincode)
        );
        v_shipping_pincode := pg_catalog.btrim(v_customer.pincode);
    else
        if p_shipping_address is null
           or pg_catalog.jsonb_typeof(p_shipping_address) <> 'object'
           or pg_catalog.nullif(pg_catalog.btrim(p_shipping_address->>'business_name'), '') is null
           or pg_catalog.nullif(pg_catalog.btrim(p_shipping_address->>'phone'), '') is null
           or pg_catalog.nullif(pg_catalog.btrim(p_shipping_address->>'street_address'), '') is null
           or pg_catalog.nullif(pg_catalog.btrim(p_shipping_address->>'city'), '') is null
           or pg_catalog.nullif(pg_catalog.btrim(p_shipping_address->>'pincode'), '') is null then
            raise exception 'Guest shipping address is incomplete';
        end if;

        v_shipping_address := pg_catalog.jsonb_build_object(
            'businessName', pg_catalog.btrim(p_shipping_address->>'business_name'),
            'contactPerson', pg_catalog.nullif(pg_catalog.btrim(p_shipping_address->>'contact_person'), ''),
            'phone', pg_catalog.btrim(p_shipping_address->>'phone'),
            'streetAddress', pg_catalog.btrim(p_shipping_address->>'street_address'),
            'city', pg_catalog.btrim(p_shipping_address->>'city'),
            'pincode', pg_catalog.btrim(p_shipping_address->>'pincode')
        );
        v_shipping_pincode := pg_catalog.btrim(p_shipping_address->>'pincode');
    end if;

    if pg_catalog.coalesce(pg_catalog.array_length(v_seller.serviceable_pincodes, 1), 0) > 0
       and not exists (
           select 1
             from pg_catalog.unnest(v_seller.serviceable_pincodes) as serviceable(pincode)
            where pg_catalog.btrim(serviceable.pincode) = v_shipping_pincode
       ) then
        raise exception 'Delivery pincode is not serviceable';
    end if;

    if p_order_items is null
       or pg_catalog.jsonb_typeof(p_order_items) <> 'array'
       or pg_catalog.jsonb_array_length(p_order_items) = 0 then
        raise exception 'Order items must be a non-empty array';
    end if;

    for v_item in
        select item.value
          from pg_catalog.jsonb_array_elements(p_order_items) as item(value)
    loop
        if pg_catalog.jsonb_typeof(v_item) <> 'object'
           or not (v_item ? 'product_id')
           or not (v_item ? 'quantity') then
            raise exception 'Invalid order item';
        end if;

        begin
            if pg_catalog.nullif(pg_catalog.btrim(v_item->>'product_id'), '') is null then
                raise exception 'Invalid order item';
            end if;
            v_product_id := (v_item->>'product_id')::uuid;
        exception
            when invalid_text_representation or numeric_value_out_of_range then
                raise exception 'Invalid order item';
        end;

        v_quantity_text := v_item->>'quantity';
        if v_quantity_text is null
           or pg_catalog.btrim(v_quantity_text) = ''
           or pg_catalog.btrim(v_quantity_text) !~ '^[0-9]+$' then
            raise exception 'Invalid item quantity';
        end if;

        begin
            v_quantity := pg_catalog.btrim(v_quantity_text)::integer;
        exception
            when invalid_text_representation or numeric_value_out_of_range then
                raise exception 'Invalid item quantity';
        end;

        if v_quantity is null or v_quantity <= 0 then
            raise exception 'Invalid item quantity';
        end if;

        if v_product_id = any(v_seen_product_ids) then
            raise exception 'Duplicate product in order';
        end if;
        v_seen_product_ids := pg_catalog.array_append(v_seen_product_ids, v_product_id);
        v_quantities := pg_catalog.array_append(v_quantities, v_quantity);
        v_item_count := v_item_count + 1;
    end loop;

    for v_product in
        select product.id,
               product.seller_id,
               product.selling_price,
               product.min_order_quantity,
               product.stock,
               product.is_disabled,
               requested.quantity
          from public.products as product
          join (
              select v_seen_product_ids[requested_position.array_index] as product_id,
                     v_quantities[requested_position.array_index] as quantity
                from pg_catalog.generate_subscripts(v_seen_product_ids, 1)
                     as requested_position(array_index)
          ) as requested on requested.product_id = product.id
         order by product.id
           for share of product
    loop
        if v_product.seller_id is null or v_product.seller_id <> p_seller_id then
            raise exception 'Product does not belong to seller';
        end if;

        if pg_catalog.coalesce(v_product.is_disabled, false) then
            raise exception 'Product is unavailable';
        end if;

        if v_product.selling_price is null or v_product.selling_price < 0 then
            raise exception 'Product price is unavailable';
        end if;

        if v_product.quantity < pg_catalog.coalesce(v_product.min_order_quantity, 1) then
            raise exception 'Minimum order quantity not met';
        end if;

        if v_product.stock is not null and v_product.stock < v_product.quantity then
            raise exception 'Insufficient stock';
        end if;

        v_subtotal := v_subtotal + (v_product.selling_price * v_product.quantity);
        v_validated_item_count := v_validated_item_count + 1;
    end loop;

    if v_validated_item_count <> v_item_count then
        raise exception 'Invalid product';
    end if;

    if v_seller.min_purchase_amount < 0 then
        raise exception 'Seller minimum purchase configuration is invalid';
    end if;

    if v_subtotal < pg_catalog.coalesce(v_seller.min_purchase_amount, 0) then
        raise exception 'Minimum purchase amount not met';
    end if;

    v_shipping_charge := pg_catalog.coalesce(v_seller.shipping_charge, 0);
    if v_shipping_charge < 0 then
        raise exception 'Seller shipping configuration is invalid';
    end if;

    v_total_amount := v_subtotal + v_shipping_charge;

    insert into public.orders (
        user_id,
        total_amount,
        shipping_charge,
        status,
        payment_status,
        shipping_address,
        created_by,
        seller_id
    )
    values (
        p_user_id,
        v_total_amount,
        v_shipping_charge,
        'Pending',
        'Unpaid',
        v_shipping_address,
        v_actor_id,
        p_seller_id
    )
    returning id into v_order_id;

    insert into public.order_items (order_id, product_id, quantity, price)
    select v_order_id,
           product.id,
           requested.quantity,
           product.selling_price
      from public.products as product
      join (
          select v_seen_product_ids[requested_position.array_index] as product_id,
                 v_quantities[requested_position.array_index] as quantity
            from pg_catalog.generate_subscripts(v_seen_product_ids, 1)
                 as requested_position(array_index)
      ) as requested on requested.product_id = product.id;

    return pg_catalog.jsonb_build_object(
        'order_id', v_order_id,
        'subtotal', v_subtotal,
        'shipping_charge', v_shipping_charge,
        'total_amount', v_total_amount
    );
exception
    when others then
        if sqlstate = 'P0001' then
            raise;
        end if;
        raise exception 'Order creation failed';
end;
$function$;

comment on function public.create_order_as_admin_v2(uuid, jsonb, jsonb, uuid)
is 'Creates a server-priced assisted order for an authorized admin or seller-assigned salesman.';

revoke all on function public.create_order_as_admin_v2(uuid, jsonb, jsonb, uuid) from public;
revoke all on function public.create_order_as_admin_v2(uuid, jsonb, jsonb, uuid) from anon;
grant execute on function public.create_order_as_admin_v2(uuid, jsonb, jsonb, uuid) to authenticated;
grant execute on function public.create_order_as_admin_v2(uuid, jsonb, jsonb, uuid) to service_role;
