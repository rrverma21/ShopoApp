BEGIN;

CREATE TABLE public.feed_post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL CONSTRAINT feed_post_media_post_id_fkey REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL CONSTRAINT feed_post_media_owner_id_fkey REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  duration_seconds numeric,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_post_media_type_check CHECK (media_type IN ('image', 'video')),
  CONSTRAINT feed_post_media_bucket_check CHECK (storage_bucket = 'feed-media'),
  CONSTRAINT feed_post_media_path_check CHECK (btrim(storage_path) <> ''),
  CONSTRAINT feed_post_media_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT feed_post_media_media_contract_check CHECK (
    (media_type = 'image'
      AND mime_type IN ('image/jpeg', 'image/png', 'image/webp')
      AND byte_size > 0 AND byte_size <= 5242880
      AND duration_seconds IS NULL)
    OR
    (media_type = 'video'
      AND mime_type = 'video/mp4'
      AND byte_size > 0 AND byte_size <= 26214400
      AND duration_seconds > 0 AND duration_seconds <= 60
      AND sort_order = 0)
  ),
  CONSTRAINT feed_post_media_post_sort_order_key UNIQUE (post_id, sort_order)
);

CREATE UNIQUE INDEX feed_post_media_one_video_per_post_idx
  ON public.feed_post_media (post_id)
  WHERE media_type = 'video';

CREATE INDEX feed_post_media_owner_id_idx ON public.feed_post_media (owner_id);

ALTER TABLE public.feed_post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public feed post media read"
  ON public.feed_post_media FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.feed_posts fp WHERE fp.id = post_id));

CREATE POLICY "Owners insert feed post media"
  ON public.feed_post_media FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.feed_posts fp WHERE fp.id = post_id AND fp.user_id = auth.uid()
  ));

CREATE POLICY "Owners update feed post media"
  ON public.feed_post_media FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.feed_posts fp WHERE fp.id = post_id AND fp.user_id = auth.uid()
  ))
  WITH CHECK (owner_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.feed_posts fp WHERE fp.id = post_id AND fp.user_id = auth.uid()
  ));

CREATE POLICY "Owners delete feed post media"
  ON public.feed_post_media FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.feed_posts fp WHERE fp.id = post_id AND fp.user_id = auth.uid()
  ));

GRANT SELECT ON public.feed_post_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feed_post_media TO authenticated;

COMMIT;
