BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('feed-media', 'feed-media', true, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']::text[]);

CREATE POLICY "Feed media owners upload temporary objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feed-media'
    AND name ~ ('^tmp/' || auth.uid()::text || '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|mp4)$')
  );

CREATE POLICY "Feed media owners delete temporary objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'feed-media'
    AND name ~ ('^tmp/' || auth.uid()::text || '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.(jpg|png|webp|mp4)$')
  );

COMMIT;
