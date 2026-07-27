import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/admin/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  return res;
}
