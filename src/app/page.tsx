import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Share2, Settings, BarChart3, ArrowRight, Phone, CalendarCheck, Users, BarChart2, CheckCircle } from "lucide-react";
import BookingFlow from "@/components/booking/BookingFlow";
import { FeaturesAccordion } from "@/components/landing/FeaturesAccordion";
import { PricingSection } from "@/components/landing/PricingSection";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ← TU número real sin el +
const PHONE = "542216229441";
const WHATSAPP_MSG = encodeURIComponent("Hola! Quiero saber más sobre Turnify para mi negocio.");
const WHATSAPP_URL = `https://wa.me/${PHONE}?text=${WHATSAPP_MSG}`;
const COMBO_MSG = encodeURIComponent("Hola! Quiero consultar sobre combos y ofertas especiales de Turnify.");
const COMBO_URL = `https://wa.me/${PHONE}?text=${COMBO_MSG}`;

const STEPS = [
  {
    n: "01",
    title: "Te creamos la cuenta",
    desc: "Nos escribís por WhatsApp, configuramos tu negocio y te damos tu link personalizado en minutos.",
    icon: Phone,
  },
  {
    n: "02",
    title: "Compartís tu link",
    desc: "Poné el link en tu bio de Instagram, en tu estado de WhatsApp o donde quieras. Tus clientes entran y reservan solos.",
    icon: Share2,
  },
  {
    n: "03",
    title: "Gestionás desde el panel",
    desc: "Ves todos tus turnos, cancelás, enviás recordatorios y controlás tus ingresos desde un solo lugar.",
    icon: CalendarCheck,
  },
];

export default function Home() {
  const demoTenantId = "admin-tenant-1";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="flex-grow">

        {/* ── HERO ── */}
        <section className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden border-b py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,120,120,0.05),transparent)] pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center text-center space-y-10">
              <Badge variant="outline" className="py-1.5 px-4 border-primary/20 bg-primary/5 text-primary text-sm font-medium">
                La herramienta definitiva para profesionales independientes
              </Badge>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight font-headline max-w-6xl leading-[0.85] text-balance">
                Agenda llena, <br />
                <span className="opacity-30">sin complicaciones.</span>
              </h1>
              <p className="max-w-2xl mx-auto text-muted-foreground text-xl md:text-2xl leading-relaxed">
                Dejá de coordinar citas por WhatsApp. Tu página de reservas lista en minutos para que tus clientes agenden 24/7.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
                <Button size="lg" className="h-16 px-10 text-xl font-bold rounded-2xl shadow-2xl transition-transform hover:scale-105 active:scale-95" asChild>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    Quiero mi panel de turnos
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="h-16 px-10 text-xl font-bold rounded-2xl border-2 transition-transform hover:scale-105 active:scale-95" asChild>
                  <a href="#demo-section">Probar Demo Interactiva</a>
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground pt-2">
                <Link href="/dashboard" className="underline underline-offset-4 hover:text-primary font-medium">
                  Acceder a mi panel →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <FeaturesAccordion />

        {/* ── CÓMO FUNCIONA ── */}
        <section className="w-full py-28 border-b bg-muted/10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">SIMPLE Y RÁPIDO</Badge>
              <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter mb-4">¿Cómo funciona?</h2>
              <p className="text-muted-foreground text-xl max-w-xl mx-auto">En 3 pasos tenés tu página de reservas funcionando.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {STEPS.map((step, i) => (
                <div key={i} className="relative flex flex-col gap-4 p-8 rounded-[2rem] bg-card border hover:shadow-lg transition-all">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-black text-primary/20 font-headline">{step.n}</span>
                    <div className="p-3 rounded-xl bg-primary/10">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold font-headline">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PANEL ADMIN (imagen/mockup) ── */}
        <section className="w-full py-28 border-b">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
              <div className="space-y-6">
                <Badge variant="outline">PANEL DE ADMINISTRACIÓN</Badge>
                <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter">
                  Todo tu negocio en un solo lugar
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Desde el panel podés ver tu agenda del día, gestionar turnos, enviar recordatorios, configurar servicios y analizar tus ingresos — todo sin salir de la pantalla.
                </p>
                <ul className="space-y-3">
                  {[
                    "Vista de agenda diaria y semanal",
                    "Recordatorios por WhatsApp con un clic",
                    "Métricas de ingresos y ocupación",
                    "Configuración de servicios y horarios",
                    "Link de reserva personalizado",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="rounded-2xl h-14 px-8 font-bold" asChild>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    Quiero empezar <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              </div>

              {/* Mockup visual del panel */}
              <div className="relative">
                <div className="rounded-3xl border bg-card shadow-2xl overflow-hidden">
                  <div className="bg-muted p-3 border-b flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <div className="flex-1 mx-4 bg-background rounded-lg px-3 py-1 text-xs text-muted-foreground font-mono">
                      turnosya.com/dashboard
                    </div>
                  </div>
                  <div className="p-6 space-y-4 bg-background">
                    {/* Header mock */}
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="h-6 w-40 bg-foreground/10 rounded-lg" />
                        <div className="h-3 w-24 bg-foreground/5 rounded mt-2" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-16 bg-foreground/10 rounded-lg" />
                        <div className="h-8 w-16 bg-primary/20 rounded-lg" />
                      </div>
                    </div>
                    {/* Stats mock */}
                    <div className="grid grid-cols-4 gap-3">
                      {["$45.000", "12 turnos", "8 clientes", "85%"].map((v, i) => (
                        <div key={i} className="bg-muted/40 rounded-xl p-3 text-center">
                          <p className="font-black text-sm">{v}</p>
                          <div className="h-2 w-12 bg-foreground/5 rounded mx-auto mt-1" />
                        </div>
                      ))}
                    </div>
                    {/* Appointments mock */}
                    <div className="space-y-2">
                      <div className="h-3 w-20 bg-foreground/10 rounded" />
                      {["10:00 · María González", "11:30 · Carlos Pérez", "14:00 · Ana López"].map((apt, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-primary rounded-full" />
                            <div>
                              <p className="text-xs font-bold">{apt}</p>
                              <div className="h-2 w-16 bg-foreground/10 rounded mt-1" />
                            </div>
                          </div>
                          <div className="h-6 w-6 bg-green-500/20 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              </div>
            </div>
          </div>
        </section>

        <PricingSection />

        {/* ── DEMO ── */}
        <section id="demo-section" className="w-full py-32 bg-muted/20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge className="mb-4 bg-primary text-primary-foreground">DEMO EN VIVO</Badge>
              <h2 className="text-4xl md:text-7xl font-bold mb-8 font-headline tracking-tighter">
                Probá la experiencia
              </h2>
              <p className="text-muted-foreground text-xl mb-8">
                Así de fácil será para tus clientes agendar un turno.
              </p>
            </div>
            <div className="relative max-w-5xl mx-auto">
              <div className="relative bg-card rounded-[2rem] md:rounded-[3rem] shadow-2xl border overflow-hidden">
                <div className="bg-muted p-4 md:p-6 border-b flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="bg-background border px-6 py-1.5 rounded-xl text-xs text-muted-foreground font-mono truncate max-w-[200px] md:max-w-none">
                    turnosya.com/book/barberia-estilo
                  </div>
                  <div className="w-12" />
                </div>
                <div className="p-4 md:p-12 lg:p-16 bg-background">
                  <BookingFlow tenantId={demoTenantId} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── DEMO ADMIN ── */}
        <section className="w-full py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge className="mb-4 bg-primary text-primary-foreground">PANEL DE GESTIÓN</Badge>
              <h2 className="text-4xl md:text-7xl font-bold mb-8 font-headline tracking-tighter">
                Vos ves todo en tiempo real
              </h2>
              <p className="text-muted-foreground text-xl mb-8">
                Mientras tus clientes reservan, vos gestionás desde un panel simple y completo.
              </p>
            </div>
            <div className="relative max-w-5xl mx-auto">
              <div className="relative bg-card rounded-[2rem] md:rounded-[3rem] shadow-2xl border overflow-hidden">
                <div className="bg-muted p-4 md:p-6 border-b flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="bg-background border px-6 py-1.5 rounded-xl text-xs text-muted-foreground font-mono truncate max-w-[200px] md:max-w-none">
                    turnify.pro/dashboard
                  </div>
                  <div className="w-12" />
                </div>
                <div className="p-6 md:p-10 bg-background space-y-6">
                  {/* Header fake del dashboard */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                    <div>
                      <p className="font-black text-lg">Barbería El Estilo ✂️</p>
                      <p className="text-xs text-muted-foreground">Plan Pro</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600 font-bold">3 turnos hoy</span>
                    </div>
                  </div>

                  {/* Tabs fake */}
                  <div className="flex gap-2 border-b pb-2">
                    {['Agenda', 'Clientes', 'Métricas', 'Ajustes'].map((tab, i) => (
                      <span key={tab} className={`text-sm font-bold px-3 py-1.5 rounded-lg cursor-default ${i === 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{tab}</span>
                    ))}
                  </div>

                  {/* Turnos del día fake */}
                  <div className="space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hoy</p>
                    {[
                      { time: '10:00', name: 'Juan Pérez', service: 'Corte de Pelo', status: 'completed', color: 'bg-blue-50 border-blue-400 dark:bg-blue-950/20' },
                      { time: '11:30', name: 'Martín García', service: 'Corte + Barba', status: 'confirmed', color: 'bg-green-50 border-green-400 dark:bg-green-950/20' },
                      { time: '14:00', name: 'Lucas Rodríguez', service: 'Afeitado Clásico', status: 'confirmed', color: 'bg-green-50 border-green-400 dark:bg-green-950/20' },
                    ].map((apt, i) => (
                      <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border-l-4 ${apt.color}`}>
                        <div className="text-center w-12 shrink-0">
                          <p className="font-black text-base">{apt.time}</p>
                          <p className="text-[10px] text-muted-foreground">hs</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{apt.name}</p>
                          <p className="text-xs text-muted-foreground">{apt.service}</p>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${apt.status === 'completed' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
                          {apt.status === 'completed' ? 'Completado' : 'Confirmado'}
                        </span>
                      </div>
                    ))}
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-4">Próximos 7 días</p>
                    {[
                      { time: 'Mañana 09:30', name: 'Carlos López', service: 'Corte de Pelo' },
                      { time: 'Mañana 15:00', name: 'Diego Fernández', service: 'Corte + Barba' },
                    ].map((apt, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl border-l-4 bg-green-50 border-green-400 dark:bg-green-950/20">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{apt.name}</p>
                          <p className="text-xs text-muted-foreground">{apt.service} · {apt.time}</p>
                        </div>
                        <span className="text-[10px] font-black px-2 py-1 rounded-full border bg-green-100 text-green-700 border-green-300">Confirmado</span>
                      </div>
                    ))}
                  </div>

                  {/* WhatsApp badge */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                    <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <div>
                      <p className="text-xs font-black text-green-700 dark:text-green-400">WhatsApp automático activado</p>
                      <p className="text-xs text-green-600 dark:text-green-500">Los clientes reciben confirmación y recordatorios automáticamente</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="w-full py-32 relative overflow-hidden bg-foreground text-background">
          <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
            <h2 className="text-5xl md:text-8xl font-black mb-6 font-headline tracking-tighter">Tu agenda hoy mismo.</h2>
            <p className="text-background/70 mb-12 text-xl md:text-2xl max-w-2xl mx-auto font-medium">
              Escribinos y en minutos activamos tu página de reservas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-16 px-12 text-xl font-black rounded-2xl shadow-2xl transition-all hover:scale-105 bg-background text-foreground hover:bg-background/90" asChild>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Empeza YA
                </a>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />

      {/* Botón flotante */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90 px-5 py-3 rounded-full shadow-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
        aria-label="Contactar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="hidden sm:inline">Quiero mi panel</span>
      </a>
    </div>
  );
}
