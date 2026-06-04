// Acceso a Firestore desde el servidor (API routes) usando la REST API.
// No requiere firebase-admin ni service account key.

const PROJECT_ID = 'studio-6398913436-7a565';
const API_KEY = 'AIzaSyBc1gttodLpfA3SFufoYdPQZPxx9XCCGLI';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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

export async function queryConfirmedAppointments(): Promise<Record<string, any>[]> {
  const url = `${BASE_URL}:runQuery?key=${API_KEY}`;
  // Trae confirmed Y completed para poder mandar reseñas después del turno
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'appointments' }],
      where: {
        compositeFilter: {
          op: 'OR',
          filters: [
            { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'confirmed' } } },
            { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'completed' } } },
          ],
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore query failed: ${res.status} ${text}`);
  }

  const results = await res.json();
  return results
    .filter((r: any) => r.document)
    .map((r: any) => parseDoc(r.document));
}

export async function getSalonById(salonId: string): Promise<Record<string, any> | null> {
  const url = `${BASE_URL}/salons/${salonId}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const doc = await res.json();
  return parseDoc(doc);
}

export async function updateAppointmentReminder(
  appointmentId: string,
  field: 'reminderSent24h' | 'reminderSentSameDay' | 'reviewSent'
): Promise<boolean> {
  const url = `${BASE_URL}/appointments/${appointmentId}?updateMask.fieldPaths=${field}&key=${API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { [field]: { booleanValue: true } } }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[updateAppointmentReminder] Error ${res.status} para ${appointmentId}/${field}:`, text);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[updateAppointmentReminder] Excepción para ${appointmentId}/${field}:`, e);
    return false;
  }
}
