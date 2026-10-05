import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const MAX_SIGNUPS_PER_HOUR = 3;

export function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

/** Cuenta registros por IP en la última hora para frenar abusos. */
export async function allowSignup(ip: string): Promise<boolean> {
  const ref = adminDb().collection('signupLimits').doc(createHash('sha256').update(ip).digest('hex'));
  return adminDb().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recent = ((snap.data()?.times as number[]) || []).filter(t => t > hourAgo);
    if (recent.length >= MAX_SIGNUPS_PER_HOUR) return false;
    tx.set(ref, { times: [...recent, Date.now()] });
    return true;
  });
}
