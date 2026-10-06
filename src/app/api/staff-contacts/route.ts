import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { getStaffPhones, saveStaffPhones } from '@/lib/staff-contacts';

/** WhatsApp de los profesionales del negocio (solo para el dueño). */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId') || '';
  if (!tenantId || !isAdminConfigured()) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ phones: await getStaffPhones(tenantId) });
}

export async function POST(req: NextRequest) {
  const { tenantId, phones } = await req.json().catch(() => ({}));
  if (!tenantId || typeof phones !== 'object' || !phones || !isAdminConfigured()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }
  const auth = await requireSalonAdmin(req, String(tenantId));
  if (!auth.ok) return auth.response;
  const entries = Object.entries(phones as Record<string, unknown>).slice(0, 50);
  return NextResponse.json({ phones: await saveStaffPhones(String(tenantId), Object.fromEntries(entries) as any) });
}
