import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { UUID, MIME, signatureValid, validateMedia } from "./validation.mjs";

const cors = (origin: string | null) => ({ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin || 'null', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' });
const response = (origin: string | null, status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: cors(origin) });

serve(async (request) => {
  const origin = request.headers.get('origin');
  const allowed = [Deno.env.get('SHOP_APP_URL'), ...(Deno.env.get('SHOPOCONNECT_ALLOWED_ORIGINS') || '').split(',')].map(x => x?.trim()).filter(Boolean);
  const approvedOrigin = origin && allowed.includes(origin) ? origin : null;
  if (request.method === 'OPTIONS') return approvedOrigin ? response(approvedOrigin, 200, { success: true }) : response(null, 403, { success: false, code: 'ORIGIN_NOT_ALLOWED' });
  if (request.method !== 'POST') return response(approvedOrigin, 405, { success: false, code: 'METHOD_NOT_ALLOWED' });
  if (!approvedOrigin) return response(null, 403, { success: false, code: 'ORIGIN_NOT_ALLOWED' });
  try {
    const url = Deno.env.get('SUPABASE_URL') || '', key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', anon = Deno.env.get('SUPABASE_ANON_KEY') || '', authorization = request.headers.get('Authorization');
    if (!url || !key || !anon || !authorization) return response(approvedOrigin, 401, { success: false, code: 'UNAUTHENTICATED' });
    const auth = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return response(approvedOrigin, 401, { success: false, code: 'UNAUTHENTICATED' });
    const { upload_id, idempotency_key, content, category, post_type, media } = await request.json();
    if (typeof upload_id !== 'string' || typeof idempotency_key !== 'string' || typeof content !== 'string' || !Array.isArray(media) || !new RegExp(`^${UUID}$`).test(upload_id) || !new RegExp(`^${UUID}$`).test(idempotency_key)) return response(approvedOrigin, 400, { success: false, code: 'INVALID_REQUEST' });
    if (media.length > 5) return response(approvedOrigin, 400, { success: false, code: 'TOO_MANY_IMAGES' });
    const admin = createClient(url, key), prefix = `tmp/${user.id}/${upload_id}/`, seen = new Set<string>(), mediaIds = new Set<string>();
    const { data: files, error: listError } = await admin.storage.from('feed-media').list(prefix, { limit: 100 });
    if (listError) return response(approvedOrigin, 400, { success: false, code: 'MEDIA_NOT_FOUND' });
    let total = 0; const trusted: Array<{ media_id: string; storage_path: string; mime_type: string; byte_size: number }> = [];
    for (const item of media) {
      const path = item?.storage_path, mediaId = item?.media_id, name = typeof path === 'string' ? path.slice(prefix.length) : '';
      if (typeof path !== 'string' || typeof mediaId !== 'string' || !new RegExp(`^${UUID}$`).test(mediaId) || !path.startsWith(prefix) || path.includes('..') || seen.has(path) || mediaIds.has(mediaId.toLowerCase()) || !new RegExp(`^${mediaId}\\.(jpg|png|webp)$`, 'i').test(name)) return response(approvedOrigin, 400, { success: false, code: 'INVALID_REQUEST' });
      seen.add(path); mediaIds.add(mediaId.toLowerCase()); const file = files?.find(x => x.name === name), mime = file?.metadata?.mimetype, size = Number(file?.metadata?.size);
      if (!file) return response(approvedOrigin, 404, { success: false, code: 'MEDIA_NOT_FOUND' });
      if (!MIME.has(mime) || !name.endsWith(`.${MIME.get(mime)}`)) return response(approvedOrigin, 400, { success: false, code: 'INVALID_MEDIA_TYPE' });
      if (!Number.isSafeInteger(size) || size <= 0 || size > 5242880) return response(approvedOrigin, 400, { success: false, code: 'IMAGE_TOO_LARGE' });
      const fetchPath = path.split('/').map(encodeURIComponent).join('/');
      const signature = await fetch(`${url}/storage/v1/object/feed-media/${fetchPath}`, { headers: { Authorization: `Bearer ${key}`, apikey: key, Range: 'bytes=0-11' } });
      if (signature.status !== 206 || !signature.headers.get('Content-Range') || !signatureValid(mime, new Uint8Array(await signature.arrayBuffer()))) return response(approvedOrigin, 400, { success: false, code: 'INVALID_MEDIA_TYPE' });
      total += size; trusted.push({ media_id: mediaId, storage_path: path, mime_type: mime, byte_size: size });
    }
    if (total > 26214400 || !validateMedia({ uid: user.id, uploadId: upload_id, media: trusted })) return response(approvedOrigin, 400, { success: false, code: 'TOTAL_MEDIA_TOO_LARGE' });
    const { data, error } = await admin.rpc('finalize_shopoconnect_image_post', { p_owner_id: user.id, p_idempotency_key: idempotency_key, p_content: content, p_category: category ?? null, p_post_type: post_type ?? null, p_media: trusted });
    if (error || !data?.post_id) return response(approvedOrigin, 400, { success: false, code: error?.message === 'INVALID_CLASSIFICATION' ? 'INVALID_CLASSIFICATION' : 'FINALIZATION_FAILED' });
    return response(approvedOrigin, 200, { success: true, post_id: data.post_id, media_count: trusted.length, idempotent: data.idempotent === true });
  } catch (_) { return response(approvedOrigin, 500, { success: false, code: 'FINALIZATION_FAILED' }); }
});
