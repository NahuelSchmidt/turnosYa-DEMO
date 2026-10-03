// Precios de los planes pagos de Turnify (en pesos).
// Mercado Pago cobra comisión, por eso la transferencia sale un poco menos.

export const SUBSCRIPTION_PRICES = {
  pro: { mercadopago: 19900, transfer: 19000, year: 199000 },
  premium: { mercadopago: 34900, transfer: 33000, year: 349000 },
} as const;

export type PaidPlanId = keyof typeof SUBSCRIPTION_PRICES;
export type PaymentMethod = 'mercadopago' | 'transfer';

export const money = (n: number) => `$${n.toLocaleString('es-AR')}`;
