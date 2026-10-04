// Acceso a Firestore desde el servidor. Lo público (negocios y servicios) se lee por la
// REST API; los turnos se leen y escriben con firebase-admin (las reglas no los exponen).
import { adminDb } from '@/lib/firebase-admin';

const PROJECT_ID = 'studio-6398913436-7a565';
export const API_KEY = 'AIzaSyBc1gttodLpfA3SFufoYdPQZPxx9XCCGLI';
export const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function parseValue(value: any): any {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map(parseValue);
  if ('mapValue' in value) return parseDoc({ name: '', fields: value.mapValue?.fields || {} });
  return null;
}

function parseDoc(doc: any): Record<string, any> {
  const fields = doc.fields || {};
  const result: Record<string, any> = {};
  if (doc.name) result.id = doc.name.split('/').pop();
  for (const [key, val] of Object.entries(fields)) {
    result[key] = parseValue(val);
  }
  return result;
}

/** Turnos confirmados y completados (para recordatorios y reseñas). Lee con acceso de servidor. */
export async function queryConfirmedAppointments(): Promise<Record<string, any>[]> {
  const snap = await adminDb().collection('appointments').where('status', 'in', ['confirmed', 'completed']).get();
  return snap.docs.map(d => withDates({ id: d.id, ...d.data() }));
}

/** Convierte los Timestamp de Firestore en Date, como devolvía la versión REST. */
function withDates(data: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) out[k] = v && typeof v.toDate === 'function' ? v.toDate() : v;
  return out;
}

export async function getSalonById(salonId: string): Promise<Record<string, any> | null> {
  const url = `${BASE_URL}/salons/${salonId}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const doc = await res.json();
  return parseDoc(doc);
}

export async function getServicesForSalon(salonId: string): Promise<Record<string, any>[]> {
  const url = `${BASE_URL}/salons/${salonId}/services?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).map(parseDoc);
}

export async function updateAppointmentReminder(
  appointmentId: string,
  field: 'reminderSent24h' | 'reminderSentSameDay' | 'reviewSent'
): Promise<boolean> {
  try {
    await adminDb().collection('appointments').doc(appointmentId).update({ [field]: true });
    return true;
  } catch (e) {
    console.error(`[updateAppointmentReminder] Error para ${appointmentId}/${field}:`, e);
    return false;
  }
}

/** Turno que ya pasó y seguía confirmado: queda como completado. */
export async function markAppointmentCompleted(appointmentId: string): Promise<void> {
  await adminDb().collection('appointments').doc(appointmentId).update({ status: 'completed' });
}
