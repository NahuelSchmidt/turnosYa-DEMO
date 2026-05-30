const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

interface EvolutionCredentials {
  instanceName: string;
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

  const chatId = phone.replace(/\D/g, '');

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
