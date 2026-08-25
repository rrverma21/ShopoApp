REVOKE ALL ON FUNCTION public.create_order_as_admin(
    uuid,
    jsonb,
    numeric,
    jsonb
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_order_as_admin(
    uuid,
    jsonb,
    numeric,
    jsonb
) FROM anon;

REVOKE ALL ON FUNCTION public.create_order_as_admin(
    uuid,
    jsonb,
    numeric,
    jsonb,
    uuid
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_order_as_admin(
    uuid,
    jsonb,
    numeric,
    jsonb,
    uuid
) FROM anon;
