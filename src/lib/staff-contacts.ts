// WhatsApp de cada profesional para avisarle de sus turnos.
// Se guarda aparte (staffContacts/{salonId}), solo lo lee y escribe el servidor:
// los datos de los profesionales son públicos (los ve la página de reservas) y el teléfono no.

import { adminDb } from '@/lib/firebase-admin';

export type StaffPhones = Record<string, string>;

export const cleanPhone = (v: unknown) => String(v || '').replace(/\D/g, '').slice(0, 15);

export async function getStaffPhones(salonId: string): Promise<StaffPhones> {
  const snap = await adminDb().collection('staffContacts').doc(salonId).get();
  return (snap.data()?.phones as StaffPhones) || {};
}

export async function saveStaffPhones(salonId: string, phones: StaffPhones) {
  const clean = Object.fromEntries(
    Object.entries(phones).map(([id, p]) => [id, cleanPhone(p)]).filter(([, p]) => p.length >= 8),
  );
  await adminDb().collection('staffContacts').doc(salonId).set({ phones: clean, updatedAt: Date.now() });
  return clean;
}

/**
 * Manda un WhatsApp al profesional del turno, desde el WhatsApp conectado del negocio.
 * No hace nada si no tiene número cargado o si es el mismo número del negocio (ya le llega).
 */
export async function sendToProfessional(salonId: string, salon: any, professionalId: string | undefined, text: string) {
  if (!professionalId || !salon?.evolutionInstanceName) return false;
  try {
    const phone = (await getStaffPhones(salonId))[professionalId];
    if (!phone || phone === cleanPhone(salon.whatsappNumber)) return false;
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp');
    return await sendWhatsAppMessage(phone, text, { instanceName: salon.evolutionInstanceName });
  } catch (e: any) {
    console.error('[WhatsApp] aviso al profesional:', e?.message);
    return false;
  }
}
