import { NextResponse } from 'next/server';
import { checkPassword } from '@/lib/admin/auth';
import { COOKIE_NAME, createToken } from '@/lib/admin/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: '' }));
  if (!checkPassword(String(password ?? ''))) {
    return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
  }
  const { token, maxAge } = await createToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  return res;
}
