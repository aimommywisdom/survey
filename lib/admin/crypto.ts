// AES-256-GCM 加解密（Web Crypto，Workers 與 Node 皆可）。
// 用於加密使用者填入的 LLM API key，明文永不落地 DB。
import 'server-only';

function getKeyMaterial(): Uint8Array {
  const b64 = process.env.SETTINGS_ENC_KEY;
  if (!b64) throw new Error('缺少 SETTINGS_ENC_KEY');
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error('SETTINGS_ENC_KEY 必須是 32 bytes 的 base64');
  return raw;
}

async function importKey() {
  return crypto.subtle.importKey(
    'raw',
    getKeyMaterial() as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptSecret(
  plain: string
): Promise<{ enc: string; iv: string }> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain)
  );
  return { enc: b64(ct), iv: b64(iv) };
}

export async function decryptSecret(enc: string, iv: string): Promise<string> {
  const key = await importKey();
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(iv) },
    key,
    unb64(enc)
  );
  return new TextDecoder().decode(pt);
}
