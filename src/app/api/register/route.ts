import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { allowSignup, clientIp } from '@/lib/signup-limit';
import { BusinessError, createBusinessAccount, isValidEmail } from '@/lib/business';
import { notifyAdmins } from '@/lib/push';
import { SELF_SIGNUP_TRIAL_DAYS } from '@/lib/subscription-status';

/**
 * Registro público: crea la cuenta del dueño y su negocio en plan Pro con prueba gratis.
 * Al terminar la prueba tiene que pagar o pasar al plan gratis; si no, se bloquea el panel.
 */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) return NextResponse.json({ error: 'El registro no está disponible' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  // Campo trampa: es invisible para las personas, solo lo completan los bots
  if (body.website) return NextResponse.json({ ok: true });

  const name = String(body.businessName || '').trim().slice(0, 80);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const whatsappNumber = String(body.whatsappNumber || '').replace(/\D/g, '').slice(0, 15);

  if (name.length < 2) return NextResponse.json({ error: 'Poné el nombre de tu negocio' }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: 'El mail no es válido' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'La clave tiene que tener al menos 6 caracteres' }, { status: 400 });

  if (!(await allowSignup(clientIp(req)))) {
    return NextResponse.json({ error: 'Demasiados registros seguidos. Probá de nuevo en un rato.' }, { status: 429 });
  }

  try {
    const result = await createBusinessAccount({
      name, email, password, whatsappNumber,
      plan: 'pro',
      trialDays: SELF_SIGNUP_TRIAL_DAYS,
      createdBy: 'self-signup',
      allowExistingUser: false,
    });

    await notifyAdmins({
      title: 'Nuevo registro',
      body: `${name} · Pro (prueba ${SELF_SIGNUP_TRIAL_DAYS} días, se registró solo) · ${email}${whatsappNumber ? ` · ${whatsappNumber}` : ''}`,
    });

    return NextResponse.json({ ok: true, salonId: result.salonId });
  } catch (e) {
    if (e instanceof BusinessError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[Registro] Error:', e);
    return NextResponse.json({ error: 'No se pudo crear la cuenta. Probá de nuevo.' }, { status: 500 });
  }
}
