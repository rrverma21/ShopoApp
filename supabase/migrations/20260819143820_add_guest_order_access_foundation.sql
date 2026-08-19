-- Add the unused database foundation for future guest order authorization.
-- Applications must store only a deterministic cryptographic token hash here,
-- never the plaintext guest access token.
alter table public.digital_shop_orders
    add column if not exists guest_access_token_hash text,
    add column if not exists guest_access_expires_at timestamp with time zone;
