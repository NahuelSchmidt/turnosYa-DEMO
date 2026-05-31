"use client";

import { use, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useSalon } from "@/hooks/use-salon";
import { useServices } from "@/hooks/use-services";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Clock, Star, CalendarCheck, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_KEY = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`w-5 h-5 transition-colors ${(hover || value) >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ tenantId }: { tenantId: string }) {
  const db = useFirestore();
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!name || !comment || rating === 0 || !db) return;
    setSending(true);
    try {
      await addDoc(collection(db, "reviews"), {
        salonId: tenantId,
        customerName: name,
        comment,
        rating,
        createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <div className="text-center py-6 space-y-2">
      <Star className="w-10 h-10 text-yellow-400 fill-yellow-400 mx-auto" />
      <p className="font-bold">¡Gracias por tu reseña!</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Tu nombre</Label>
        <Input placeholder="Ej: María García" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Calificación</Label>
        <StarRating value={rating} onChange={setRating} />
      </div>
      <div className="space-y-1">
        <Label>Comentario</Label>
        <Textarea placeholder="Contá tu experiencia..." value={comment} onChange={e => setComment(e.target.value)} rows={3} />
      </div>
      <Button onClick={handleSubmit} disabled={sending || !name || !comment || rating === 0} className="w-full">
        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Enviar reseña
      </Button>
    </div>
  );
}

function ReviewsList({ tenantId }: { tenantId: string }) {
  const db = useFirestore();
  const reviewsRef = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return query(collection(db, "reviews"), where("salonId", "==", tenantId));
  }, [db, tenantId]);
  const { data: reviews } = useCollection<any>(reviewsRef);

  if (!reviews || reviews.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-4">Sin reseñas aún. ¡Sé el primero!</p>
  );

  const avg = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black">{avg.toFixed(1)}</span>
        <div>
          <StarRating value={Math.round(avg)} />
          <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {reviews.map((r: any) => (
          <div key={r.id} className="border rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">{r.customerName}</p>
              <StarRating value={r.rating} />
            </div>
            <p className="text-sm text-muted-foreground">{r.comment}</p>
            {r.createdAt?.toDate && (
              <p className="text-xs text-muted-foreground">
                {format(r.createdAt.toDate(), "dd 'de' MMMM yyyy", { locale: es })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileContent({ tenantId }: { tenantId: string }) {
  const { salon, loading: salonLoading } = useSalon(tenantId);
  const { services, loading: servicesLoading } = useServices(tenantId);
  const [showReviewForm, setShowReviewForm] = useState(false);

  if (salonLoading || servicesLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  if (!salon) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Negocio no encontrado.</p>
    </div>
  );

  const bookableServices = (services || []).filter(s => s.duration > 0 && s.type !== 'whatsapp');
  const weekSchedule = (salon as any).weekSchedule || {};
  const activeDays = DIAS_KEY.map((key, i) => ({ key, label: DIAS[i], schedule: weekSchedule[key] })).filter(d => d.schedule?.enabled);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {/* Hero del negocio */}
        <div className="relative w-full h-48 md:h-64 bg-muted overflow-hidden">
          {(salon as any).coverImageUrl ? (
            <img src={(salon as any).coverImageUrl} alt={salon.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
              <CalendarCheck className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-start gap-6">

            {/* Info principal */}
            <div className="flex-1 space-y-6">
              {/* Nombre y descripcion */}
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-black font-headline" style={salon.primaryColor ? { color: salon.primaryColor } : undefined}>
                    {salon.name}
                  </h1>
                </div>
                {(salon as any).description && (
                  <p className="text-muted-foreground mt-2">{(salon as any).description}</p>
                )}
                {salon.address && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(salon.address)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {salon.address}
                    </a>
                  </div>
                )}
              </div>

              {/* Horarios */}
              {activeDays.length > 0 && (
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="font-bold text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Horarios de atención</p>
                    <div className="grid grid-cols-2 gap-1">
                      {activeDays.map(d => (
                        <div key={d.key} className="text-sm">
                          <span className="font-medium">{d.label}:</span>
                          <span className="text-muted-foreground ml-1">
                            {d.schedule.slots?.length > 0
                              ? `${d.schedule.slots[0]} - ${d.schedule.slots[d.schedule.slots.length - 1]}hs`
                              : 'Abierto'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Servicios */}
              {bookableServices.length > 0 && (
                <div className="space-y-3">
                  <p className="font-bold">Servicios</p>
                  <div className="grid gap-2">
                    {bookableServices.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                        <div>
                          <p className="font-bold text-sm">{s.name}</p>
                          {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{s.duration} min</p>
                        </div>
                        <p className="font-black text-sm shrink-0">${s.price.toLocaleString('es-AR')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reseñas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Reseñas</p>
                  <Button variant="outline" size="sm" onClick={() => setShowReviewForm(!showReviewForm)}>
                    {showReviewForm ? "Cancelar" : "Dejar reseña"}
                  </Button>
                </div>
                {showReviewForm && (
                  <Card><CardContent className="pt-4"><ReviewForm tenantId={tenantId} /></CardContent></Card>
                )}
                <ReviewsList tenantId={tenantId} />
              </div>
            </div>

            {/* CTA sticky */}
            <div className="md:w-72 shrink-0">
              <Card className="sticky top-4 border-2">
                <CardContent className="pt-6 space-y-4 text-center">
                  <CalendarCheck className="w-10 h-10 text-primary mx-auto" />
                  <div>
                    <p className="font-black text-lg">Reservá tu turno</p>
                    <p className="text-sm text-muted-foreground">Rápido, sin llamadas</p>
                  </div>
                  <Button asChild className="w-full h-12 font-bold text-base">
                    <Link href={`/book/${tenantId}`}>Sacar turno ahora</Link>
                  </Button>
                  {salon.whatsappNumber && (
                    <a
                      href={`https://wa.me/${salon.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-[#25D366] hover:underline font-medium"
                    >
                      O escribinos por WhatsApp
                    </a>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function NegocioPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  return <ProfileContent tenantId={tenantId} />;
}
