import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured, requireGlobalAdmin } from '@/lib/firebase-admin';
import { APP_URL } from '@/lib/mercadopago';
import { BusinessError, createBusinessAccount, isValidEmail, Plan, PLANS } from '@/lib/business';

/**
 * Alta de un negocio desde el super-admin: crea (o reutiliza) el usuario del dueño
 * con su mail y clave, y el negocio vinculado a ese usuario, con el plan y la prueba gratis.
 */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const adminUid = await requireGlobalAdmin(req.headers.get('authorization'));
  if (!adminUid) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.businessName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const plan: Plan = PLANS.includes(body.plan) ? body.plan : 'basic';

  if (!name) return NextResponse.json({ error: 'Falta el nombre del negocio' }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: 'El mail no es válido' }, { status: 400 });

  try {
    const result = await createBusinessAccount({
      name,
      email,
      password: String(body.password || ''),
      plan,
      trialDays: Math.max(0, Math.min(90, Number(body.trialDays) || 0)),
      whatsappNumber: String(body.whatsappNumber || '').replace(/\D/g, ''),
      createdBy: adminUid,
      allowExistingUser: true,
    });
    return NextResponse.json({
      salonId: result.salonId,
      existingUser: result.existingUser,
      dashboardUrl: `${APP_URL}/dashboard`,
      bookingUrl: `${APP_URL}/book/${result.salonId}`,
      trialEndsAt: result.trialEndsAt?.toISOString() || null,
    });
  } catch (e) {
    if (e instanceof BusinessError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[Alta negocio] Error:', e);
    return NextResponse.json({ error: 'No se pudo crear el negocio' }, { status: 500 });
  }
}
