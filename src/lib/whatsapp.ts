const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

interface EvolutionCredentials {
  instanceName: string;
}

// Para que WhatsApp no confunda los envíos con spam (los números se envían desde el
// WhatsApp de cada negocio vía Evolution, que no es la API oficial):
// - antes de mandar se muestra "escribiendo…" unos segundos, como una persona;
// - no se le manda a números que no tienen WhatsApp (los rebotes suman sospecha).
const TYPING_MIN_MS = 1200;
const TYPING_MAX_MS = 2800;
const NUMBER_CHECK_TTL_MS = 6 * 60 * 60 * 1000;
const numberCheckCache = new Map<string, { exists: boolean; at: number }>();

function toChatId(phone: string) {
  let chatId = phone.replace(/\D/g, '');
  // Agregar código de país Argentina si no tiene prefijo internacional
  if (chatId.length <= 10) chatId = '54' + chatId;
  return chatId;
}

/** ¿El número tiene WhatsApp? Si la consulta falla, se asume que sí (no frenamos el envío). */
async function hasWhatsApp(instanceName: string, chatId: string): Promise<boolean> {
  const key = `${instanceName}:${chatId}`;
  const cached = numberCheckCache.get(key);
  if (cached && Date.now() - cached.at < NUMBER_CHECK_TTL_MS) return cached.exists;

  try {
    const res = await fetch(`${EVOLUTION_URL}/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY! },
      body: JSON.stringify({ numbers: [chatId] }),
    });
    if (!res.ok) return true;
    const data = await res.json();
    const result = Array.isArray(data) ? data[0] : null;
    if (!result || typeof result.exists !== 'boolean') return true;
    numberCheckCache.set(key, { exists: result.exists, at: Date.now() });
    return result.exists;
  } catch {
    return true;
  }
}

/** Pausa al azar entre mensajes seguidos (ej: recordatorios del cron), para no mandar en ráfaga. */
export function waitBetweenMessages(minMs = 1500, maxMs = 4000) {
  return new Promise(resolve => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  credentials?: EvolutionCredentials
): Promise<boolean> {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    console.warn('[WhatsApp] EVOLUTION_API_URL o EVOLUTION_API_KEY no configurados en .env.local');
    return false;
  }

  const instanceName = credentials?.instanceName;
  if (!instanceName) {
    console.warn('[WhatsApp] instanceName no configurado para este negocio');
    return false;
  }

  const chatId = toChatId(phone);

  if (!(await hasWhatsApp(instanceName, chatId))) {
    console.warn('[WhatsApp] El número no tiene WhatsApp, no se envía:', chatId.slice(0, 5) + '…');
    return false;
  }

  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_KEY,
      },
      body: JSON.stringify({
        number: chatId,
        text: message,
        // Muestra "escribiendo…" antes de mandar
        delay: Math.round(TYPING_MIN_MS + Math.random() * (TYPING_MAX_MS - TYPING_MIN_MS)),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[WhatsApp] Error al enviar:', res.status, text);
    }

    return res.ok;
  } catch (e) {
    console.error('[WhatsApp] Excepción al enviar:', e);
    return false;
  }
}
