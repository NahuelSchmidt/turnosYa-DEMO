import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Share2, Settings, BarChart3, ArrowRight, Phone, CalendarCheck, Users, BarChart2, CheckCircle } from "lucide-react";
import BookingFlow from "@/components/booking/BookingFlow";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ← TU número real sin el +
const PHONE = "542216229441";
const WHATSAPP_MSG = encodeURIComponent("Hola! Quiero saber más sobre TurnosYa para mi negocio.");
const WHATSAPP_URL = `https://wa.me/${PHONE}?text=${WHATSAPP_MSG}`;
const COMBO_MSG = encodeURIComponent("Hola! Quiero consultar sobre combos y ofertas especiales de TurnosYa.");
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

        {/* ── FEATURES ── */}
        <section className="w-full py-28 border-b">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-10 md:grid-cols-3">
              {[
                { title: "Tu Marca, Tu Link", desc: "Recibí un enlace profesional personalizado para tu bio de Instagram o WhatsApp.", icon: Share2 },
                { title: "Control Total", desc: "Configurá servicios, precios, duración y horarios según tu conveniencia.", icon: Settings },
                { title: "Crecimiento Real", desc: "Analizá tus ingresos y ocupación con reportes visuales automáticos.", icon: BarChart3 },
              ].map((f, i) => (
                <div key={i} className="group p-10 rounded-[2.5rem] bg-card border transition-all hover:border-primary/20 hover:shadow-xl">
                  <div className="p-4 w-fit rounded-2xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-8">
                    <f.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold font-headline mb-4">{f.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

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
        <Phone className="h-5 w-5 shrink-0" />
        <span className="hidden sm:inline">Quiero mi panel</span>
      </a>
    </div>
  );
}
