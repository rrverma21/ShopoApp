import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_IMAGE_BYTES,
  buildFinalizerRequestBody,
  buildTemporaryMediaPath,
  cleanupAttemptMedia,
  createShopoConnectAttempt,
  finalizeShopoConnectAttempt,
  mapCanonicalFeedMedia,
  mediaExtensionForMime,
  selectPostImageUrls,
  uploadAttemptMedia,
  validatePostContent,
  validateSelectedImages,
} from '../src/lib/shopoConnectMedia.js';

const ids = [
  '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555', '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777', '88888888-8888-4888-8888-888888888888',
];
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const file = (type, size = 1, name = 'untrusted.exe') => ({ type, size, name });
const uuidFactory = values => () => values.shift();

test('content validation accepts text-only content and rejects blank or over-limit content', () => {
  assert.equal(validatePostContent('Hello').ok, true);
  assert.equal(validatePostContent('   ').ok, false);
  assert.equal(validatePostContent('x'.repeat(501)).ok, false);
});

test('image validation enforces MIME, individual, count, and combined limits', () => {
  assert.equal(validateSelectedImages([file('image/jpeg'), file('image/png'), file('image/webp')]).ok, true);
  assert.equal(validateSelectedImages([file('image/gif')]).ok, false);
  assert.equal(validateSelectedImages([file('video/mp4')]).ok, false);
  assert.equal(validateSelectedImages([file('image/jpeg', 0)]).ok, false);
  assert.equal(validateSelectedImages([file('image/jpeg', MAX_IMAGE_BYTES + 1)]).ok, false);
  assert.equal(validateSelectedImages(Array.from({ length: 5 }, () => file('image/jpeg', MAX_IMAGE_BYTES))).ok, true);
  assert.equal(validateSelectedImages(Array.from({ length: 6 }, () => file('image/jpeg'))).ok, false);
  assert.equal(validateSelectedImages([file('image/jpeg', 5 * 1024 * 1024), file('image/png', 5 * 1024 * 1024), file('image/webp', 5 * 1024 * 1024), file('image/jpeg', 5 * 1024 * 1024), file('image/png', 5 * 1024 * 1024 + 1)]).ok, false);
});

test('attempt uses MIME-derived canonical paths and retries retain its IDs', () => {
  const attempt = createShopoConnectAttempt({ userId, files: [file('image/jpeg', 1, 'misleading.png'), file('image/webp', 2, 'photo.jpg')], uuid: uuidFactory([...ids]) });
  assert.equal(attempt.uploadId, ids[0]);
  assert.match(attempt.media[0].storagePath, new RegExp(`^tmp/${userId}/${ids[0]}/${ids[2]}\\.jpg$`));
  assert.match(attempt.media[1].storagePath, /\.webp$/);
  assert.equal(mediaExtensionForMime('image/png'), 'png');
  assert.equal(buildTemporaryMediaPath(userId, attempt.uploadId, attempt.media[0].mediaId, 'image/jpeg'), attempt.media[0].storagePath);
  const retry = buildFinalizerRequestBody({ attempt, content: 'Retry', category: null, postType: null });
  assert.equal(retry.upload_id, attempt.uploadId);
  assert.equal(retry.idempotency_key, attempt.idempotencyKey);
  assert.deepEqual(retry.media.map(x => x.storage_path), attempt.media.map(x => x.storagePath));
});

test('a new attempt generates fresh upload, idempotency, and media IDs', () => {
  const first = createShopoConnectAttempt({ userId, files: [file('image/jpeg')], uuid: uuidFactory([...ids]) });
  const second = createShopoConnectAttempt({ userId, files: [file('image/jpeg')], uuid: uuidFactory([...ids].reverse()) });
  assert.notEqual(first.uploadId, second.uploadId);
  assert.notEqual(first.idempotencyKey, second.idempotencyKey);
  assert.notEqual(first.media[0].mediaId, second.media[0].mediaId);
});

test('finalizer request is text-only capable, ordered, customer-null, and omits trusted fields', () => {
  const attempt = createShopoConnectAttempt({ userId, files: [], uuid: uuidFactory([...ids]) });
  const body = buildFinalizerRequestBody({ attempt, content: 'Text only', category: null, postType: null });
  assert.deepEqual(body.media, []);
  assert.equal(body.category, null);
  assert.equal(body.post_type, null);
  assert.deepEqual(Object.keys(body).sort(), ['category', 'content', 'idempotency_key', 'media', 'post_type', 'upload_id']);
  assert.equal(JSON.stringify(body).includes('byte_size'), false);
  assert.equal(JSON.stringify(body).includes('mime_type'), false);
});

test('upload, finalization, cleanup, and public mapping stay scoped to feed-media exact paths', async () => {
  const attempt = createShopoConnectAttempt({ userId, files: [file('image/png')], uuid: uuidFactory([...ids]) });
  const calls = { uploads: [], removed: [], invoked: [] };
  const supabase = {
    storage: { from: bucket => ({
      upload: async (...args) => { calls.uploads.push([bucket, ...args]); return { error: null }; },
      remove: async paths => { calls.removed.push([bucket, paths]); return { error: null }; },
      getPublicUrl: path => ({ data: { publicUrl: `https://example.test/${bucket}/${path}` } }),
    }) },
    functions: { invoke: async (...args) => { calls.invoked.push(args); return { data: { success: true, post_id: ids[7] }, error: null }; } },
  };
  await uploadAttemptMedia(supabase, attempt);
  assert.equal(calls.uploads[0][0], 'feed-media');
  assert.equal(calls.uploads[0][3].upsert, false);
  assert.deepEqual(attempt.uploadedPaths, [attempt.media[0].storagePath]);
  const finalization = await finalizeShopoConnectAttempt(supabase, { attempt, content: 'Published', category: null, postType: null });
  assert.equal(finalization.status, 'confirmed');
  assert.equal(calls.invoked[0][0], 'finalize-shopoconnect-post');
  const cleanup = await cleanupAttemptMedia(supabase, attempt);
  assert.deepEqual(cleanup.paths, attempt.uploadedPaths);
  assert.deepEqual(calls.removed[0], ['feed-media', attempt.uploadedPaths]);
  const mapped = mapCanonicalFeedMedia(supabase, [
    { media_type: 'image', storage_bucket: 'feed-media', storage_path: 'later.png', sort_order: 2 },
    { media_type: 'image', storage_bucket: 'feed-media', storage_path: 'first.jpg', sort_order: 0 },
    { media_type: 'video', storage_bucket: 'feed-media', storage_path: 'skip.mp4', sort_order: 1 },
    { media_type: 'image', storage_bucket: 'other', storage_path: 'skip.jpg', sort_order: 1 },
  ]);
  assert.deepEqual(mapped.map(x => x.storage_path), ['first.jpg', 'later.png']);
});

test('ambiguous finalizer errors preserve the attempt for idempotent retry', async () => {
  const attempt = createShopoConnectAttempt({ userId, files: [], uuid: uuidFactory([...ids]) });
  const supabase = { functions: { invoke: async () => ({ data: null, error: new Error('network unavailable') }) } };
  const result = await finalizeShopoConnectAttempt(supabase, { attempt, content: 'Retry me' });
  assert.equal(result.status, 'ambiguous');
  assert.equal(attempt.finalizationStarted, true);
  assert.equal(attempt.finalizationConfirmed, false);
  assert.equal(attempt.uploadedPaths.length, 0);
});

test('definite application rejection is distinguished from ambiguous finalizer failure', async () => {
  const attempt = createShopoConnectAttempt({ userId, files: [], uuid: uuidFactory([...ids]) });
  const supabase = { functions: { invoke: async () => ({ data: { success: false, code: 'INVALID_REQUEST' }, error: null }) } };
  const result = await finalizeShopoConnectAttempt(supabase, { attempt, content: 'Rejected' });
  assert.equal(result.status, 'rejected');
});

test('canonical media is sorted, filtered, and takes precedence over safe legacy fallback', () => {
  const supabase = { storage: { from: bucket => ({ getPublicUrl: path => ({ data: { publicUrl: `https://example.test/${bucket}/${path}` } }) }) } };
  const canonical = mapCanonicalFeedMedia(supabase, [
    { storage_bucket: 'feed-media', media_type: 'image', storage_path: 'four.jpg', sort_order: 4 },
    { storage_bucket: 'feed-media', media_type: 'image', storage_path: 'zero.jpg', sort_order: 0 },
    { storage_bucket: 'feed-media', media_type: 'image', storage_path: 'two.jpg', sort_order: 2 },
    { storage_bucket: 'feed-media', media_type: 'image', storage_path: 'one.jpg', sort_order: 1 },
    { storage_bucket: 'feed-media', media_type: 'image', storage_path: 'three.jpg', sort_order: 3 },
    { storage_bucket: 'feed-media', media_type: 'video', storage_path: 'video.mp4', sort_order: 5 },
    { storage_bucket: 'other', media_type: 'image', storage_path: 'wrong.jpg', sort_order: 6 },
    { storage_bucket: 'feed-media', media_type: 'image', storage_path: '  ', sort_order: 7 },
  ]);
  assert.deepEqual(canonical.map(record => record.storage_path), ['zero.jpg', 'one.jpg', 'two.jpg', 'three.jpg', 'four.jpg']);
  assert.deepEqual(selectPostImageUrls(canonical, ['https://legacy.test/ignored.jpg']), canonical.map(record => record.url));
  assert.deepEqual(selectPostImageUrls([], [' https://legacy.test/one.jpg ', null, 42, 'https://legacy.test/two.jpg']), ['https://legacy.test/one.jpg', 'https://legacy.test/two.jpg']);
  assert.deepEqual(selectPostImageUrls(null, null), []);
  assert.deepEqual(mapCanonicalFeedMedia(supabase, { malformed: true }), []);
  assert.deepEqual(selectPostImageUrls({ malformed: true }, { malformed: true }), []);
});
