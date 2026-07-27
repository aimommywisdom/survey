// 後台密碼驗證 + session 檢查。
import 'server-only';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifyToken } from './session';

export function checkPassword(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // 定時比對
  if (pw.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// server component / route 用：目前 cookie 是否為已登入後台。
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE_NAME)?.value);
}
