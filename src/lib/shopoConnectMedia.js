export const FEED_MEDIA_BUCKET = 'feed-media';
export const MAX_IMAGE_COUNT = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_IMAGE_BYTES = 25 * 1024 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const failure = error => ({ ok: false, error });

export function validatePostContent(content) {
  if (typeof content !== 'string' || !content.trim()) return failure('Content is required.');
  if (content.length > 500) return failure('Content must be 500 characters or fewer.');
  return { ok: true };
}

export function mediaExtensionForMime(mimeType) {
  return EXTENSIONS.get(mimeType) || null;
}

export function validateSelectedImages(files) {
  const selected = Array.from(files || []);
  if (selected.length > MAX_IMAGE_COUNT) return failure('You can select up to 5 images.');

  let total = 0;
  for (const file of selected) {
    if (!mediaExtensionForMime(file?.type)) return failure('Only JPEG, PNG, and WebP images are supported.');
    if (!Number.isSafeInteger(file?.size) || file.size <= 0) return failure('Images must not be empty.');
    if (file.size > MAX_IMAGE_BYTES) return failure('Each image must be 5 MiB or smaller.');
    total += file.size;
  }
  if (total > MAX_TOTAL_IMAGE_BYTES) return failure('Selected images must total 25 MiB or less.');
  return { ok: true, totalBytes: total };
}

export function buildTemporaryMediaPath(userId, uploadId, mediaId, mimeType) {
  const extension = mediaExtensionForMime(mimeType);
  if (!UUID.test(userId) || !UUID.test(uploadId) || !UUID.test(mediaId) || !extension) {
    throw new Error('Invalid canonical media path input.');
  }
  return `tmp/${userId}/${uploadId}/${mediaId}.${extension}`;
}

function browserUuid() {
  if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('Secure UUID generation is unavailable.');
  return globalThis.crypto.randomUUID();
}

export function createShopoConnectAttempt({ userId, files = [], uuid = browserUuid }) {
  const validation = validateSelectedImages(files);
  if (!validation.ok) throw new Error(validation.error);
  if (!UUID.test(userId)) throw new Error('Authenticated user ID must be a UUID.');

  const uploadId = uuid();
  const idempotencyKey = uuid();
  if (!UUID.test(uploadId) || !UUID.test(idempotencyKey)) throw new Error('Secure UUID generation returned an invalid UUID.');

  return {
    uploadId,
    idempotencyKey,
    media: Array.from(files).map(file => {
      const mediaId = uuid();
      if (!UUID.test(mediaId)) throw new Error('Secure UUID generation returned an invalid UUID.');
      return {
        mediaId,
        storagePath: buildTemporaryMediaPath(userId, uploadId, mediaId, file.type),
        file,
      };
    }),
    uploadedPaths: [],
    finalizationStarted: false,
    finalizationConfirmed: false,
  };
}

export function buildFinalizerRequestBody({ attempt, content, category = null, postType = null }) {
  const contentValidation = validatePostContent(content);
  if (!contentValidation.ok) throw new Error(contentValidation.error);
  if (!attempt || !UUID.test(attempt.uploadId) || !UUID.test(attempt.idempotencyKey) || !Array.isArray(attempt.media)) {
    throw new Error('Invalid submission attempt.');
  }

  return {
    upload_id: attempt.uploadId,
    idempotency_key: attempt.idempotencyKey,
    content,
    category: category ?? null,
    post_type: postType ?? null,
    media: attempt.media.map(({ mediaId, storagePath }) => ({ media_id: mediaId, storage_path: storagePath })),
  };
}

export async function uploadAttemptMedia(supabase, attempt) {
  if (!supabase?.storage || !attempt?.media) throw new Error('A Supabase client and submission attempt are required.');
  const uploaded = new Set(attempt.uploadedPaths || []);
  for (const entry of attempt.media) {
    if (uploaded.has(entry.storagePath)) continue;
    const { error } = await supabase.storage.from(FEED_MEDIA_BUCKET).upload(entry.storagePath, entry.file, {
      upsert: false,
      contentType: entry.file.type,
    });
    if (error) throw error;
    attempt.uploadedPaths.push(entry.storagePath);
    uploaded.add(entry.storagePath);
  }
  return attempt;
}

export async function cleanupAttemptMedia(supabase, attempt) {
  const paths = [...new Set(attempt?.uploadedPaths || [])];
  if (!paths.length) return { attempted: false, paths: [] };
  const { error } = await supabase.storage.from(FEED_MEDIA_BUCKET).remove(paths);
  return { attempted: true, paths, error: error || null };
}

export async function finalizeShopoConnectAttempt(supabase, request) {
  const { attempt } = request || {};
  if (!supabase?.functions || !attempt) throw new Error('A Supabase client and submission attempt are required.');
  attempt.finalizationStarted = true;
  const body = buildFinalizerRequestBody(request);
  const result = await supabase.functions.invoke('finalize-shopoconnect-post', { body });
  if (!result.error && result.data?.success === true && result.data?.post_id) {
    attempt.finalizationConfirmed = true;
    return { status: 'confirmed', ...result };
  }
  const responseStatus = result.error?.context?.status;
  if (result.data?.success === false || (Number.isInteger(responseStatus) && responseStatus >= 400 && responseStatus < 500)) {
    return { status: 'rejected', ...result };
  }
  // Supabase invoke errors can represent a network loss after publication. The caller
  // must supply independently proven application-failure evidence before cleanup.
  return { status: 'ambiguous', ...result };
}

export function isDefinitelyUnpublishedFinalizerFailure(result, provenUnpublished = false) {
  return result?.status !== 'confirmed' && provenUnpublished === true;
}

export function mapCanonicalFeedMedia(supabase, records) {
  return (Array.isArray(records) ? records : [])
    .filter(record => record?.media_type === 'image' && record.storage_bucket === FEED_MEDIA_BUCKET && typeof record.storage_path === 'string' && record.storage_path.trim())
    .map((record, index) => ({
      ...record,
      sort_order: Number(record.sort_order),
      _index: index,
      url: supabase.storage.from(FEED_MEDIA_BUCKET).getPublicUrl(record.storage_path).data.publicUrl,
    }))
    .filter(record => Number.isFinite(record.sort_order))
    .sort((a, b) => a.sort_order - b.sort_order || a._index - b._index)
    .map(({ _index, ...record }) => record);
}

export function selectPostImageUrls(canonicalMedia, legacyImages) {
  const canonicalUrls = (Array.isArray(canonicalMedia) ? canonicalMedia : [])
    .map(record => typeof record?.url === 'string' ? record.url.trim() : '')
    .filter(Boolean)
    .slice(0, MAX_IMAGE_COUNT);
  if (canonicalUrls.length) return canonicalUrls;

  return (Array.isArray(legacyImages) ? legacyImages : [])
    .filter(url => typeof url === 'string' && url.trim())
    .map(url => url.trim())
    .slice(0, MAX_IMAGE_COUNT);
}
