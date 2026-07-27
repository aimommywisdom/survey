// 後台 session：HMAC 簽章的 cookie token（無狀態）。
import 'server-only';

const COOKIE = 'mwform_admin';
const TTL_MS = 1000 * 60 * 60 * 12; // 12 小時

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('缺少 SESSION_SECRET');
  return s;
}

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(sig);
}

export const COOKIE_NAME = COOKIE;

export async function createToken(): Promise<{ token: string; maxAge: number }> {
  const exp = Date.now() + TTL_MS;
  const payload = String(exp);
  const sig = await sign(payload);
  return { token: `${payload}.${sig}`, maxAge: Math.floor(TTL_MS / 1000) };
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await sign(payload);
  // 長度相同再比對（避免因長度差異短路）
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
