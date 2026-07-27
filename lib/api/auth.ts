// 分析 API 驗證（§6）：Authorization: Bearer <API_KEY>，金鑰以 SHA-256 存 hash。
import 'server-only';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// 驗證請求；通過回傳 null，否則回傳要直接回應的錯誤（401）。
export async function requireApiKey(req: Request): Promise<Response | null> {
  const auth = req.headers.get('authorization') ?? '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return json401('缺少 Authorization: Bearer <API_KEY>');
  }
  const hash = hashKey(m[1].trim());
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, revoked_at')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .maybeSingle();
  if (error || !data) {
    return json401('API 金鑰無效或已撤銷');
  }
  return null;
}

function json401(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
