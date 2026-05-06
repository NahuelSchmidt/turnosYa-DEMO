"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Calendar, Users, MessageCircle, BarChart3, Link2, Star } from "lucide-react";

const FEATURES = [
  {
    id: "agenda",
    icon: Calendar,
    title: "Tu agenda completa en un vistazo",
    desc: "Vista diaria y semanal. Ves todos tus turnos, sus estados y podés cancelar o marcar como completado con un solo clic.",
    preview: (
      <div className="bg-background rounded-2xl border shadow-lg p-4 w-full">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-sm">Mayo 2026</span>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">Hoy</span>
        </div>
        <div className="space-y-2">
          {[
            { time: "09:00", name: "Corte + Barba", person: "Carlos M.", color: "bg-amber-100 border-amber-400 text-amber-800", status: "Pendiente" },
            { time: "10:30", name: "Color completo", person: "Ana G.", color: "bg-green-100 border-green-400 text-green-800", status: "Completado" },
            { time: "12:00", name: "Consulta", person: "Luis P.", color: "bg-blue-100 border-blue-400 text-blue-800", status: "Pendiente" },
            { time: "15:00", name: "Corte de Pelo", person: "María R.", color: "bg-amber-100 border-amber-400 text-amber-800", status: "Pendiente" },
          ].map((apt, i) => (
            <div key={i} className={cn("flex items-center gap-2 p-2 rounded-lg border-l-4 text-xs", apt.color)}>
              <span className="font-mono font-bold w-10 shrink-0">{apt.time}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{apt.name}</p>
                <p className="opacity-70 truncate">{apt.person}</p>
              </div>
              <span className="text-[9px] font-bold opacity-70 shrink-0">{apt.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "reservas",
    icon: Link2,
    title: "Tus clientes reservan solos, 24/7",
    desc: "Cada negocio tiene su propio link personalizado. El cliente elige servicio, profesional, fecha y hora en menos de 2 minutos.",
    preview: (
      <div className="bg-background rounded-2xl border shadow-lg overflow-hidden w-full">
        <div className="bg-muted p-2 flex items-center gap-1.5 border-b">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <div className="flex-1 mx-2 bg-background rounded px-2 py-0.5 text-[9px] text-muted-foreground font-mono">
            turnosya.com/book/tu-negocio
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs font-bold">Elegí tu servicio</p>
          {["Corte de Pelo — $1500 · 30min", "Corte + Barba — $2500 · 60min"].map((s, i) => (
            <div key={i} className={cn("flex items-center gap-2 p-2 rounded-lg border-2 text-xs", i === 1 ? "border-foreground bg-foreground text-background" : "border-border")}>
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", i === 1 ? "border-background" : "border-muted-foreground")}>
                {i === 1 && <div className="w-2 h-2 rounded-full bg-background" />}
              </div>
              <span className="font-medium">{s}</span>
            </div>
          ))}
          <div className="bg-foreground text-background text-xs font-bold py-2 rounded-lg text-center">Continuar →</div>
        </div>
      </div>
    ),
  },
  {
    id: "recordatorios",
    icon: MessageCircle,
    title: "Recordatorios donde tus clientes ya están",
    desc: "Al confirmar el turno, el cliente recibe un WhatsApp automático con todos los detalles y un link para cancelar o reprogramar sin llamar.",
    preview: (
      <div className="bg-[#ECE5DD] rounded-2xl p-4 w-full space-y-3">
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white text-xs font-bold shrink-0">TY</div>
          <div className="bg-white rounded-2xl rounded-bl-none p-3 shadow-sm max-w-[90%]">
            <p className="text-[10px] text-[#25D366] font-bold mb-1">TurnosYa</p>
            <p className="text-xs font-bold text-gray-800">✅ Turno Confirmado</p>
            <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
              Hola María! Tu turno está confirmado:<br/>
              📆 sábado 10 de mayo a las 15:00hs<br/>
              ✂️ Corte de Pelo<br/>
              👤 Con Carlos M.<br/>
              📌 Av. Corrientes 1234
            </p>
            <p className="text-[10px] text-gray-600 mt-2">
              ➡️ Ver, cancelar o reprogramar:<br/>
              <span className="text-blue-600 underline">turnosya.com/turno/abc123</span>
            </p>
            <p className="text-[9px] text-gray-400 text-right mt-1">10:32 ✓✓</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "metricas",
    icon: BarChart3,
    title: "Conocé tus números en tiempo real",
    desc: "Ingresos reales (solo turnos ya realizados), clientes únicos, tasa de ocupación y tendencias de los últimos 6 meses.",
    preview: (
      <div className="bg-background rounded-2xl border shadow-lg p-4 w-full space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Métricas del mes</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Ingresos", value: "$45.200", color: "text-green-600" },
            { label: "Turnos", value: "38", color: "text-blue-600" },
            { label: "Clientes", value: "24", color: "text-purple-600" },
            { label: "Ocupación", value: "87%", color: "text-amber-600" },
          ].map((m, i) => (
            <div key={i} className="bg-muted/40 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">{m.label}</p>
              <p className={cn("text-lg font-black", m.color)}>{m.value}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-2 font-bold">Tendencia 6 meses</p>
          <div className="flex items-end gap-1 h-14">
            {[30, 45, 38, 60, 72, 87].map((h, i) => (
              <div key={i} className="flex-1 bg-primary rounded-t transition-all" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "equipo",
    icon: Users,
    title: "Gestioná tu equipo de trabajo",
    desc: "Agregá todos tus profesionales, asignales servicios y los clientes eligen con quién quieren atenderse.",
    preview: (
      <div className="bg-background rounded-2xl border shadow-lg p-4 w-full space-y-2">
        <p className="text-xs font-bold mb-3">Elegí tu especialista</p>
        {[
          { name: "Carlos M.", specialty: "Barbero Senior", emoji: "✂️" },
          { name: "Ana G.", specialty: "Estilista", emoji: "💇" },
          { name: "Diego R.", specialty: "Colorista", emoji: "🎨" },
        ].map((p, i) => (
          <div key={i} className={cn("flex items-center gap-3 p-3 rounded-xl border-2 text-xs", i === 0 ? "border-foreground bg-foreground text-background" : "border-border")}>
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-lg", i === 0 ? "bg-background" : "bg-muted")}>
              {p.emoji}
            </div>
            <div className="flex-1">
              <p className="font-bold">{p.name}</p>
              <p className={i === 0 ? "text-background/70" : "text-muted-foreground"}>{p.specialty}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "estados",
    icon: Star,
    title: "Control total de cada turno",
    desc: "Marcá cada turno como Completado, Cancelado o No asistió. Los ingresos se calculan solo con los turnos que efectivamente se realizaron.",
    preview: (
      <div className="bg-background rounded-2xl border shadow-lg p-4 w-full space-y-2">
        <p className="text-xs font-bold text-muted-foreground mb-3">Estados de turnos de hoy</p>
        {[
          { time: "09:00", name: "Carlos Rodríguez", label: "Completado", badge: "bg-green-100 text-green-700 border-green-300" },
          { time: "11:00", name: "Martina López", label: "Pendiente", badge: "bg-amber-100 text-amber-700 border-amber-300" },
          { time: "14:00", name: "Juan Pérez", label: "No asistió", badge: "bg-gray-100 text-gray-600 border-gray-300" },
          { time: "16:00", name: "Laura Silva", label: "Cancelado", badge: "bg-red-100 text-red-700 border-red-300" },
        ].map((apt, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg border text-xs">
            <span className="font-mono font-bold text-muted-foreground w-10 shrink-0">{apt.time}</span>
            <p className="font-bold flex-1 truncate">{apt.name}</p>
            <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0", apt.badge)}>
              {apt.label}
            </span>
          </div>
        ))}
      </div>
    ),
  },
];

export function FeaturesAccordion() {
  const [active, setActive] = useState(0);

  return (
    <section className="w-full py-28 border-b">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">FUNCIONALIDADES</p>
          <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter">
            Herramientas pensadas<br className="hidden md:block" /> para tu negocio
          </h2>
          <p className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
            Todo lo que necesitás para gestionar tu agenda de forma profesional.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          {/* Preview — izquierda en desktop */}
          <div className="hidden md:block">
            <div className="sticky top-24">
              <div key={active} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {FEATURES[active].preview}
              </div>
            </div>
          </div>

          {/* Accordion — derecha */}
          <div className="space-y-2">
            {FEATURES.map((f, i) => {
              const isActive = active === i;
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setActive(i)}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200",
                    isActive
                      ? "border-foreground bg-foreground text-background shadow-lg"
                      : "border-border hover:border-foreground/20 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-xl shrink-0 transition-colors mt-0.5", isActive ? "bg-background/20" : "bg-muted")}>
                      <Icon className={cn("w-5 h-5", isActive ? "text-background" : "text-primary")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-bold text-base leading-snug", isActive ? "text-background" : "text-foreground")}>
                        {f.title}
                      </p>
                      {isActive && (
                        <p className="text-sm mt-2 text-background/70 leading-relaxed animate-in fade-in duration-200">
                          {f.desc}
                        </p>
                      )}
                      {/* Preview en mobile solo cuando activo */}
                      {isActive && (
                        <div className="mt-4 md:hidden animate-in fade-in duration-200">
                          {f.preview}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
