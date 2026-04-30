/**
 * Force-refresh the runtime secrets cache.
 *
 * Used by `/rotate` after a Doppler value has changed, so warm function
 * instances pick up the new value immediately instead of waiting for a
 * natural cold start. Auth via REVALIDATE_TOKEN (separate from DOPPLER_TOKEN
 * so a leaked DOPPLER_TOKEN can't itself trigger refetches).
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateSecrets, ensureSecretsLoaded } from '@/lib/secrets';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'REVALIDATE_TOKEN is not configured for this deployment.' },
      { status: 500 }
    );
  }

  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const provided = auth.slice('Bearer '.length).trim();

  // Constant-time compare to avoid timing leaks.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateSecrets();
  await ensureSecretsLoaded();

  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
