import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Share2, Settings, BarChart3, ArrowRight, MessageCircle } from "lucide-react";
import BookingFlow from "@/components/booking/BookingFlow";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const WHATSAPP_NUMBER = "5491112345678"; // ← cambiá por tu número real
const WHATSAPP_MSG = encodeURIComponent("Hola! Quiero saber más sobre TurnosYa para mi negocio.");
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;

export default function Home() {
  const demoTenantId = "admin-tenant-1";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="flex-grow">

        {/* Hero Section */}
        <section className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden border-b py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,120,120,0.05),transparent)] pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center text-center space-y-10">
              <Badge variant="outline" className="py-1.5 px-4 border-primary/20 bg-primary/5 text-primary text-sm font-medium">
                La herramienta definitiva para profesionales independientes
              </Badge>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight font-headline max-w-6xl leading-[0.85] text-balance text-foreground">
                Agenda llena, <br />
                <span className="opacity-30">sin complicaciones.</span>
              </h1>
              <p className="max-w-2xl mx-auto text-muted-foreground text-xl md:text-2xl leading-relaxed">
                Deja de coordinar citas por WhatsApp. Tu página de reservas lista en minutos para que tus clientes agenden 24/7.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-6">
                <Button
                  size="lg"
                  className="h-16 px-10 text-xl font-bold rounded-2xl shadow-2xl transition-transform hover:scale-105 active:scale-95"
                  asChild
                >
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-3 h-6 w-6" />
                    Quiero mi panel de turnos
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 px-10 text-xl font-bold rounded-2xl border-2 transition-transform hover:scale-105 active:scale-95"
                  asChild
                >
                  <a href="#demo-section">Probar Demo Interactiva</a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                ¿Ya tenés cuenta?{" "}
                <Link href="/dashboard" className="underline underline-offset-4 hover:text-primary font-medium">
                  Ingresar al panel →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="w-full py-28 border-b">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-10 md:grid-cols-3">
              {[
                {
                  title: "Tu Marca, Tu Link",
                  desc: "Recibí un enlace profesional personalizado para tu bio de Instagram o WhatsApp.",
                  icon: Share2,
                },
                {
                  title: "Control Total",
                  desc: "Configurá servicios, precios, duración y horarios según tu conveniencia.",
                  icon: Settings,
                },
                {
                  title: "Crecimiento Real",
                  desc: "Analizá tus ingresos y ocupación con reportes visuales automáticos.",
                  icon: BarChart3,
                },
              ].map((f, i) => (
                <div key={i} className="group p-10 rounded-[2.5rem] bg-card border transition-all hover:border-primary/20 hover:shadow-xl">
                  <div className="p-4 w-fit rounded-2xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-8">
                    <f.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold font-headline mb-4 text-foreground">{f.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo-section" className="w-full py-32 bg-muted/20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge className="mb-4 bg-primary text-primary-foreground">DEMO EN VIVO</Badge>
              <h2 className="text-4xl md:text-7xl font-bold mb-8 font-headline tracking-tighter text-foreground">
                Prueba la experiencia
              </h2>
              <p className="text-muted-foreground text-xl mb-8">
                Interactuá con el flujo de reserva real. Así de fácil será para tus clientes agendar un turno.
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

        {/* Final CTA */}
        <section className="w-full py-32 relative overflow-hidden bg-foreground text-background">
          <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
            <h2 className="text-5xl md:text-8xl font-black mb-6 font-headline tracking-tighter">
              Tu agenda, hoy.
            </h2>
            <p className="text-background/70 mb-12 text-xl md:text-2xl max-w-2xl mx-auto font-medium">
              Escribinos por WhatsApp y en minutos activamos tu página de reservas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-16 px-12 text-xl font-black rounded-2xl shadow-2xl transition-all hover:scale-105 bg-background text-foreground hover:bg-background/90"
                asChild
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-3 h-6 w-6" />
                  Escribinos por WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />

      {/* Botón flotante de WhatsApp */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90 px-5 py-3 rounded-full shadow-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95 group"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-5 w-5 shrink-0" />
        <span className="hidden sm:inline">Quiero mi panel</span>
      </a>
    </div>
  );
}
