BEGIN;

CREATE TABLE public.feed_post_finalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_post_finalizations_owner_key UNIQUE (owner_id, idempotency_key)
);

ALTER TABLE public.feed_post_finalizations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.finalize_shopoconnect_image_post(
  p_owner_id uuid,
  p_idempotency_key uuid,
  p_content text,
  p_category text,
  p_post_type text,
  p_media jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_post_id uuid;
  v_existing_post_id uuid;
  v_item jsonb;
  v_index integer := 0;
  v_total_bytes bigint := 0;
  v_path text;
  v_mime text;
  v_bytes bigint;
BEGIN
  IF p_owner_id IS NULL OR p_idempotency_key IS NULL OR p_content IS NULL
     OR btrim(p_content) = '' OR char_length(p_content) > 500
     OR jsonb_typeof(p_media) <> 'array' OR jsonb_array_length(p_media) > 5 THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text || p_idempotency_key::text, 71261));
  SELECT post_id INTO v_existing_post_id FROM public.feed_post_finalizations
    WHERE owner_id = p_owner_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('post_id', v_existing_post_id, 'idempotent', true);
  END IF;

  SELECT CASE WHEN role = 'client' THEN 'customer' ELSE role END INTO v_role
    FROM public.profiles WHERE id = p_owner_id;
  IF v_role IS NULL THEN RAISE EXCEPTION 'ROLE_NOT_ALLOWED' USING ERRCODE = '42501'; END IF;
  IF v_role = 'customer' THEN p_category := NULL; p_post_type := NULL;
  ELSIF v_role = 'seller' THEN
    IF p_category NOT IN ('Grocery', 'Electronics', 'Fashion', 'Medicine', 'Hardware')
       OR p_post_type NOT IN ('New Arrival', 'Offer', 'Greeting', 'Update', 'Story', 'Poll') THEN
      RAISE EXCEPTION 'INVALID_CLASSIFICATION' USING ERRCODE = '22023';
    END IF;
  ELSE RAISE EXCEPTION 'ROLE_NOT_ALLOWED' USING ERRCODE = '42501'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_media) LOOP
    v_path := v_item->>'storage_path'; v_mime := v_item->>'mime_type';
    v_bytes := (v_item->>'byte_size')::bigint;
    IF v_path IS NULL OR v_mime NOT IN ('image/jpeg', 'image/png', 'image/webp')
       OR v_bytes IS NULL OR v_bytes <= 0 OR v_bytes > 5242880
       OR v_path !~ ('^tmp/' || p_owner_id::text || '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp)$') THEN
      RAISE EXCEPTION 'INVALID_MEDIA' USING ERRCODE = '22023';
    END IF;
    v_total_bytes := v_total_bytes + v_bytes;
  END LOOP;
  IF v_total_bytes > 26214400 THEN RAISE EXCEPTION 'TOTAL_MEDIA_TOO_LARGE' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.feed_posts (user_id, category, post_type, content, images)
  VALUES (p_owner_id, p_category, p_post_type, p_content, NULL)
  RETURNING id INTO v_post_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_media) LOOP
    INSERT INTO public.feed_post_media (post_id, owner_id, media_type, storage_bucket, storage_path, mime_type, byte_size, duration_seconds, sort_order)
    VALUES (v_post_id, p_owner_id, 'image', 'feed-media', v_item->>'storage_path', v_item->>'mime_type', (v_item->>'byte_size')::bigint, NULL, v_index);
    v_index := v_index + 1;
  END LOOP;
  INSERT INTO public.feed_post_finalizations (owner_id, idempotency_key, post_id) VALUES (p_owner_id, p_idempotency_key, v_post_id);
  RETURN jsonb_build_object('post_id', v_post_id, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_shopoconnect_image_post(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_shopoconnect_image_post(uuid, uuid, text, text, text, jsonb) TO service_role;
REVOKE ALL ON public.feed_post_finalizations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.feed_post_finalizations TO service_role;

COMMIT;
