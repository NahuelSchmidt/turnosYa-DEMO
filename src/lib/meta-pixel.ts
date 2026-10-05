// Eventos del Meta Pixel para ver en qué paso se van los que llegan desde los anuncios.
// Los eventos propios (custom) se ven en el Administrador de eventos de Meta.

const sent = new Set<string>();

function fbq(...args: any[]) {
  try { (window as any).fbq?.(...args); } catch {}
}

/** Evento estándar de Meta (Contact, ViewContent, CompleteRegistration...). */
export function trackPixel(event: string, params?: Record<string, any>) {
  fbq('track', event, params);
}

/** Evento propio. Con `once` se manda una sola vez por visita a la página. */
export function trackPixelCustom(event: string, params?: Record<string, any>, once = false) {
  if (once) {
    const key = event + JSON.stringify(params || {});
    if (sent.has(key)) return;
    sent.add(key);
  }
  fbq('trackCustom', event, params);
}

/**
 * Página principal: cuenta los clics en "Probar gratis" y en WhatsApp, y si la persona
 * llegó a ver los precios y la demo. Devuelve la función para limpiar los listeners.
 */
export function watchLandingFunnel() {
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement | null)?.closest?.('a');
    const href = a?.getAttribute('href') || '';
    const texto = (a?.textContent || '').trim().slice(0, 60);
    if (href === '/register' || href.startsWith('/register?')) trackPixelCustom('ClicProbarGratis', { texto });
    else if (href.includes('wa.me/')) trackPixel('Contact', { content_name: `WhatsApp desde la web: ${texto}` });
    else if (href === '#demo-section') trackPixelCustom('ClicDemo', undefined, true);
  };
  document.addEventListener('click', onClick);

  const sections: Record<string, string> = { planes: 'VioPrecios', 'demo-section': 'VioDemo' };
  const observer = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          trackPixelCustom(sections[entry.target.id], undefined, true);
          observer?.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -40% 0px' })
    : null;
  Object.keys(sections).forEach(id => {
    const el = document.getElementById(id);
    if (el) observer?.observe(el);
  });

  return () => {
    document.removeEventListener('click', onClick);
    observer?.disconnect();
  };
}
