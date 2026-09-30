// Integración con Mercado Pago: cada negocio conecta su propia cuenta (OAuth)
// y las señas se cobran directo a esa cuenta.
//
// Variables de entorno:
//   MP_CLIENT_ID, MP_CLIENT_SECRET  → de la aplicación de Turnify en Mercado Pago Developers
//   APP_URL                         → dominio público (ej: https://www.turnify.pro)

import { adminDb } from '@/lib/firebase-admin';

const MP_API = 'https://api.mercadopago.com';
const MP_AUTH = 'https://auth.mercadopago.com.ar/authorization';

export const APP_URL = (process.env.APP_URL || 'https://www.turnify.pro').replace(/\/$/, '');
export const MP_REDIRECT_URI = `${APP_URL}/api/mercadopago/callback`;

export function isMercadoPagoConfigured(): boolean {
  return !!process.env.MP_CLIENT_ID && !!process.env.MP_CLIENT_SECRET;
}

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID!,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: MP_REDIRECT_URI,
  });
  return `${MP_AUTH}?${params}`;
}

interface MpTokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: number;
  public_key?: string;
  expires_in: number;
}

async function requestToken(body: Record<string, string>): Promise<MpTokenResponse> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago OAuth ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Guarda las credenciales del negocio en una colección que solo lee el servidor. */
async function saveAccount(tenantId: string, token: MpTokenResponse, extra: Record<string, any> = {}) {
  await adminDb().collection('mpAccounts').doc(tenantId).set({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    userId: String(token.user_id),
    publicKey: token.public_key || null,
    expiresAt: Date.now() + token.expires_in * 1000,
    updatedAt: Date.now(),
    ...extra,
  }, { merge: true });
}

export async function connectAccount(tenantId: string, code: string, connectedBy: string) {
  const token = await requestToken({ grant_type: 'authorization_code', code, redirect_uri: MP_REDIRECT_URI });
  await saveAccount(tenantId, token, { connectedBy, connectedAt: Date.now() });
  return token;
}

/** Access token vigente del negocio; lo renueva si vence en menos de 7 días. */
export async function getAccessToken(tenantId: string): Promise<string | null> {
  const snap = await adminDb().collection('mpAccounts').doc(tenantId).get();
  if (!snap.exists) return null;
  const account = snap.data()!;
  if (account.expiresAt - Date.now() > 7 * 24 * 60 * 60 * 1000) return account.accessToken;

  const token = await requestToken({ grant_type: 'refresh_token', refresh_token: account.refreshToken });
  await saveAccount(tenantId, token);
  return token.access_token;
}

async function mpFetch(accessToken: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Mercado Pago ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface DepositPreferenceInput {
  appointmentId: string;
  tenantId: string;
  salonName: string;
  serviceNames: string;
  amount: number;
  expiresAt: Date;
}

export async function createDepositPreference(accessToken: string, input: DepositPreferenceInput) {
  const returnUrl = `${APP_URL}/confirmation?tenantId=${encodeURIComponent(input.tenantId)}&appointmentId=${encodeURIComponent(input.appointmentId)}`;
  return mpFetch(accessToken, '/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [{
        id: input.appointmentId,
        title: `Seña - ${input.serviceNames}`.slice(0, 250),
        description: `Seña de turno en ${input.salonName}`.slice(0, 250),
        quantity: 1,
        currency_id: 'ARS',
        unit_price: input.amount,
      }],
      external_reference: input.appointmentId,
      notification_url: `${APP_URL}/api/payments/webhook?tenantId=${encodeURIComponent(input.tenantId)}`,
      back_urls: { success: returnUrl, failure: returnUrl, pending: returnUrl },
      auto_return: 'approved',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: input.expiresAt.toISOString(),
      // Efectivo (Rapipago, Pago Fácil) tarda días en acreditarse: no sirve para señar un turno
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
      statement_descriptor: input.salonName.slice(0, 22),
    }),
  }) as Promise<{ id: string; init_point: string }>;
}

export async function getPayment(accessToken: string, paymentId: string) {
  return mpFetch(accessToken, `/v1/payments/${encodeURIComponent(paymentId)}`) as Promise<{
    id: number;
    status: string;
    external_reference: string | null;
    transaction_amount: number;
    currency_id: string;
  }>;
}
