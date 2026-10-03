// Estado de la suscripción de un negocio. Se usa en el panel (para mostrar la prueba
// y bloquear si venció), en la página de reservas y en el servidor.

/** Días de prueba gratis del plan Pro para los que se registran solos. */
export const SELF_SIGNUP_TRIAL_DAYS = 14;
/** Días de tolerancia cuando vence un mes ya pagado: si vence el 10, lo puede usar hasta el 12. */
export const PAID_GRACE_DAYS = 2;
/** Cuántos días antes del vencimiento se le avisa al dueño que tiene que pagar. */
export const EXPIRY_WARNING_DAYS = 4;

const DAY = 24 * 60 * 60 * 1000;

export type SubscriptionState =
  | 'none'     // sin vencimiento (plan gratis o negocios cargados a mano): nunca se bloquea
  | 'trial'    // en prueba gratis
  | 'active'   // pagando y al día
  | 'grace'    // pagando, venció hace poco: se avisa pero todavía se puede usar
  | 'blocked'; // terminó la prueba o venció el pago: hay que pagar o pasar al plan gratis

function toMillis(value: any): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && 'seconds' in value) return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function getSubscriptionState(salon: any, now = Date.now()) {
  const expiresMs = toMillis(salon?.subscriptionExpiresAt);
  const isTrial = salon?.subscriptionStatus === 'trial';
  if (!expiresMs || (salon?.plan || 'basic') === 'basic') {
    return { state: 'none' as SubscriptionState, isTrial: false, daysLeft: null as number | null, expiresAt: null as Date | null, usableUntil: null as Date | null };
  }
  const daysLeft = Math.ceil((expiresMs - now) / DAY);
  let state: SubscriptionState;
  if (expiresMs > now) state = isTrial ? 'trial' : 'active';
  else if (!isTrial && now - expiresMs < PAID_GRACE_DAYS * DAY) state = 'grace';
  else state = 'blocked';
  // Último día que lo puede usar si vence un mes pago (vencimiento + tolerancia)
  const usableUntil = new Date(expiresMs + (isTrial ? 0 : PAID_GRACE_DAYS * DAY));
  return { state, isTrial, daysLeft, expiresAt: new Date(expiresMs), usableUntil };
}

/** ¿El negocio no puede usar Turnify hasta que pague o pase al plan gratis? */
export function isSubscriptionBlocked(salon: any, now = Date.now()) {
  return getSubscriptionState(salon, now).state === 'blocked';
}
