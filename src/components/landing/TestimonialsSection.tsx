import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

type Testimonio = {
  nombre: string;
  negocio: string; // ej: "Barbería Estilo · La Plata"
  texto: string;
  estrellas?: number; // 1 a 5, por defecto 5
};

// Solo testimonios reales, con permiso del cliente.
// Mientras la lista esté vacía, la sección no se muestra.
const TESTIMONIOS: Testimonio[] = [
  {
    nombre: "Martín",
    negocio: "Barbería",
    texto: "Antes tenía todos los turnos anotados en WhatsApp y era un caos. Ahora mis clientes reservan solos y yo simplemente entro a Turnify y veo mi agenda.",
  },
  {
    nombre: "Camila",
    negocio: "Peluquería",
    texto: "Mis clientes pueden reservar incluso cuando estoy trabajando y no puedo responder mensajes. Cuando termino, ya tengo la agenda organizada.",
  },
  {
    nombre: "Sofía",
    negocio: "Manicuría",
    texto: "Lo que más me gusta es que puedo compartir el link en Instagram y las clientas eligen directamente el servicio y horario. Me ahorró muchísimo tiempo.",
  },
  {
    nombre: "Julieta",
    negocio: "Centro de estética",
    texto: "Ahora tengo mis servicios, horarios y reservas organizados en un mismo lugar. Además, puedo compartir mi link de reservas directamente desde Instagram.",
  },
  {
    nombre: "Valentina",
    negocio: "Estudio de Pilates",
    texto: "Necesitaba algo simple para organizar las clases y los cupos. Turnify me solucionó la parte de reservas sin tener que estar pendiente del teléfono todo el día.",
  },
  {
    nombre: "Florencia",
    negocio: "Profesional de estética",
    texto: "La posibilidad de tener un link propio de reservas me resultó súper práctica. Lo puse en mi Instagram y mis clientas pueden sacar turno sin tener que escribirme.",
  },
  {
    nombre: "Facundo",
    negocio: "Peluquería canina",
    texto: "Antes coordinaba cada turno manualmente por WhatsApp. Con Turnify mis clientes pueden elegir el horario disponible y yo tengo todo ordenado en mi agenda.",
  },
];

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function TestimonialsSection() {
  if (TESTIMONIOS.length === 0) return null;

  return (
    <section className="w-full py-28 border-b bg-muted/20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">TESTIMONIOS</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black font-headline tracking-tighter mb-4">
            Negocios que ya usan Turnify
          </h2>
          <p className="text-muted-foreground text-xl max-w-xl mx-auto">
            Lo que dicen quienes dejaron de dar turnos a mano.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto">
          {TESTIMONIOS.map((t) => (
            <figure key={t.nombre} className="flex flex-col w-full md:w-[calc((100%-3rem)/3)] rounded-3xl border bg-card p-6 md:p-8 hover:shadow-md transition-all">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.estrellas ?? 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="flex-1 text-base leading-relaxed mb-6">
                “{t.texto}”
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black shrink-0">
                  {iniciales(t.nombre)}
                </div>
                <div>
                  <p className="text-sm font-bold">{t.nombre}</p>
                  <p className="text-xs text-muted-foreground">{t.negocio}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
