import { NextRequest, NextResponse } from 'next/server';

const PROJECT_ID = 'studio-6398913436-7a565';
const API_KEY = 'AIzaSyBc1gttodLpfA3SFufoYdPQZPxx9XCCGLI';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.REMINDER_CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  return auth === secret;
}

function parseValue(value: any): any {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue);
  return null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Obtener todos los salones
  const res = await fetch(`${BASE_URL}/salons?key=${API_KEY}`);
  if (!res.ok) {
    return NextResponse.json({ error: 'Error al leer salones' }, { status: 500 });
  }

  const data = await res.json();
  const documents = data.documents || [];
  const now = new Date();
  let expired = 0;
  let updated = 0;

  for (const doc of documents) {
    const fields = doc.fields || {};
    const expiresAtRaw = fields.subscriptionExpiresAt;
    const currentStatus = parseValue(fields.subscriptionStatus);

    if (!expiresAtRaw) continue;

    const expiresAt = new Date(expiresAtRaw.timestampValue || expiresAtRaw.stringValue);
    if (isNaN(expiresAt.getTime())) continue;

    const isExpired = expiresAt < now;
    const salonId = doc.name.split('/').pop();

    if (isExpired && currentStatus !== 'expired') {
      // Marcar como vencido y degradar a basic
      await fetch(`${BASE_URL}/salons/${salonId}?updateMask.fieldPaths=subscriptionStatus&updateMask.fieldPaths=plan&key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            subscriptionStatus: { stringValue: 'expired' },
            plan: { stringValue: 'basic' },
          }
        }),
      });
      expired++;
      updated++;
    } else if (!isExpired && currentStatus === 'expired') {
      // Reactivar si se renovó
      await fetch(`${BASE_URL}/salons/${salonId}?updateMask.fieldPaths=subscriptionStatus&key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { subscriptionStatus: { stringValue: 'active' } }
        }),
      });
      updated++;
    }
  }

  return NextResponse.json({ ok: true, checked: documents.length, expired, updated });
}
