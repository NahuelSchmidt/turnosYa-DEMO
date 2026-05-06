"use client";

import { useState, useEffect } from "react";
import { useServices } from "@/hooks/use-services";
import { useProfessionals } from "@/hooks/use-professionals";
import { useSchedules } from "@/hooks/use-schedules";
import { useSalon } from "@/hooks/use-salon";
import { Service, Professional } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Users, Briefcase, Link as LinkIcon, Copy, Check, Palette, Plus, ExternalLink, Clock, ImageIcon, Loader2, Phone, MessageCircle, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AdminSettingsProps {
  tenantId: string;
}

const COLOR_PRESETS = [
  { name: "Negro", hex: "#000000" },
  { name: "Azul", hex: "#3b82f6" },
  { name: "Violeta", hex: "#8b5cf6" },
  { name: "Rosa", hex: "#ec4899" },
  { name: "Verde", hex: "#10b981" },
  { name: "Naranja", hex: "#f59e0b" },
];

type ServiceType = 'normal' | 'combo' | 'whatsapp';

interface ServiceForm {
  name: string;
  description: string;
  price: number;
  duration: number;
  serviceType: ServiceType;
}

const SERVICE_TYPE_LABELS: Record<ServiceType, { label: string; badge: string; color: string }> = {
  normal:    { label: "Servicio Normal",       badge: "Servicio",  color: "bg-muted text-muted-foreground" },
  combo:     { label: "Combo / Oferta",        badge: "Combo",     color: "bg-amber-100 text-amber-700 border-amber-200" },
  whatsapp:  { label: "Cotizar por WhatsApp",  badge: "WhatsApp",  color: "bg-green-100 text-green-700 border-green-200" },
};

export function AdminSettings({ tenantId }: AdminSettingsProps) {
  const { salon, updateSalon, loading: salonLoading } = useSalon(tenantId);
  const { services, updateServices } = useServices(tenantId);
  const { professionals, updateProfessionals } = useProfessionals(tenantId);
  const { timeSlots, updateTimeSlots } = useSchedules(tenantId);
  const { toast } = useToast();

  const bookingLink = typeof window !== "undefined" ? `${window.location.origin}/book/${tenantId}` : "";
  const [copied, setCopied] = useState(false);
  const [isSavingSalon, setIsSavingSalon] = useState(false);

  const [salonForm, setSalonForm] = useState({ name: "", primaryColor: "#000000", whatsappNumber: "" });
  const emptyServiceForm: ServiceForm = { name: "", description: "", price: 0, duration: 0, serviceType: 'normal' };
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [professionalForm, setProfessionalForm] = useState<Omit<Professional, "id">>({ name: "", specialty: "", avatarUrl: "", avatarHint: "" });
  const [editingProfessionalId, setEditingProfessionalId] = useState<string | null>(null);
  const [newTimeSlot, setNewTimeSlot] = useState("");

  useEffect(() => {
    if (salon) setSalonForm({ name: salon.name || "", primaryColor: salon.primaryColor || "#000000", whatsappNumber: salon.whatsappNumber || "" });
  }, [salon]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    toast({ title: "¡Copiado!", description: "El link de reserva está en tu portapapeles." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSalonUpdate = () => {
    setIsSavingSalon(true);
    updateSalon(salonForm);
    toast({ title: "Cambios Guardados" });
    setTimeout(() => setIsSavingSalon(false), 1000);
  };

  const handleServiceSubmit = async () => {
    if (!serviceForm.name) return;
    if (serviceForm.serviceType !== 'whatsapp' && (serviceForm.price < 0 || serviceForm.duration <= 0)) return;

    const currentServices = services || [];
    const serviceData: Service = {
      id: editingServiceId || `ser-${Date.now()}`,
      name: serviceForm.name,
      description: serviceForm.description,
      price: serviceForm.serviceType === 'whatsapp' ? 0 : serviceForm.price,
      duration: serviceForm.serviceType === 'whatsapp' ? 0 : serviceForm.duration,
      ...(serviceForm.serviceType === 'whatsapp' && { type: 'whatsapp' }),
      ...(serviceForm.serviceType === 'combo' && { type: 'combo' as any }),
    };

    const updatedServices = editingServiceId
      ? currentServices.map(s => s.id === editingServiceId ? serviceData : s)
      : [...currentServices, serviceData];

    await updateServices(updatedServices);
    setServiceForm(emptyServiceForm);
    setEditingServiceId(null);
    toast({ title: editingServiceId ? "Servicio actualizado" : "Servicio agregado" });
  };

  const handleDeleteService = async (id: string) => {
    const updated = (services || []).filter(s => s.id !== id);
    await updateServices(updated);
    toast({ title: "Servicio eliminado" });
  };

  const handleEditService = (s: Service) => {
    setEditingServiceId(s.id);
    setServiceForm({
      name: s.name,
      description: s.description,
      price: s.price,
      duration: s.duration,
      serviceType: s.type === 'whatsapp' ? 'whatsapp' : (s.type === 'combo' as any ? 'combo' : 'normal'),
    });
  };

  const handleProfessionalSubmit = async () => {
    if (!professionalForm.name || !professionalForm.specialty) return;
    const currentProfessionals = professionals || [];
    const updated = editingProfessionalId
      ? currentProfessionals.map(p => p.id === editingProfessionalId ? { ...p, ...professionalForm } : p)
      : [...currentProfessionals, { ...professionalForm, id: `prof-${Date.now()}`, avatarUrl: professionalForm.avatarUrl || `https://picsum.photos/seed/${Date.now()}/200/200`, avatarHint: "person portrait" }];
    await updateProfessionals(updated);
    setProfessionalForm({ name: "", specialty: "", avatarUrl: "", avatarHint: "" });
    setEditingProfessionalId(null);
    toast({ title: "Profesional guardado" });
  };

  return (
    <div className="space-y-8 mt-6 pb-20">

      {/* IDENTIDAD VISUAL */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> Identidad Visual</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Nombre del Negocio</Label>
            <Input value={salonForm.name} onChange={e => setSalonForm({ ...salonForm, name: e.target.value })} />
          </div>
          <div className="space-y-3">
            <Label>Color de Marca</Label>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map(p => (
                <button key={p.hex} onClick={() => setSalonForm({ ...salonForm, primaryColor: p.hex })}
                  className={cn("flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all", salonForm.primaryColor === p.hex ? "border-primary ring-2 ring-primary/20" : "border-transparent bg-muted/50")}>
                  <div className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: p.hex }} />
                  <span className="text-[10px] font-bold">{p.name}</span>
                </button>
              ))}
              <Input type="color" value={salonForm.primaryColor} onChange={e => setSalonForm({ ...salonForm, primaryColor: e.target.value })} className="w-12 h-12 p-1 cursor-pointer bg-transparent border-none" />
            </div>
          </div>
          <Button onClick={handleSalonUpdate} disabled={isSavingSalon}>
            {isSavingSalon && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Identidad
          </Button>
        </CardContent>
      </Card>

      {/* WHATSAPP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> WhatsApp del Negocio</CardTitle>
          <CardDescription>Número para recibir avisos de cancelación y cotizaciones. Con código de país, sin +. Ej: <span className="font-mono">5491123456789</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="5491123456789" value={salonForm.whatsappNumber} onChange={e => setSalonForm({ ...salonForm, whatsappNumber: e.target.value.replace(/\D/g, "") })} className="font-mono" />
          <Button onClick={handleSalonUpdate} disabled={isSavingSalon} variant="secondary">
            {isSavingSalon && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Número
          </Button>
        </CardContent>
      </Card>

      {/* LINK */}
      <Card className="border-primary bg-primary/5">
        <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><LinkIcon className="w-5 h-5" /> Tu Link de Reserva</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={bookingLink} className="bg-background font-mono text-xs h-11" />
            <div className="flex gap-2">
              <Button onClick={copyToClipboard} variant={copied ? "default" : "outline"} className="h-11">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}{copied ? "Copiado" : "Copiar"}
              </Button>
              <Button variant="ghost" asChild className="h-11"><a href={bookingLink} target="_blank"><ExternalLink className="w-4 h-4" /></a></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HORARIOS */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Horarios de Turnos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(timeSlots || []).map(slot => (
              <div key={slot} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm border">
                {slot}
                <button onClick={() => updateTimeSlots(timeSlots.filter(s => s !== slot))} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input type="time" value={newTimeSlot} onChange={e => setNewTimeSlot(e.target.value)} />
            <Button onClick={() => { if (newTimeSlot && !timeSlots.includes(newTimeSlot)) { updateTimeSlots([...timeSlots, newTimeSlot].sort()); setNewTimeSlot(""); } }} variant="secondary">
              <Plus className="w-4 h-4 mr-2" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SERVICIOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> Servicios</CardTitle>
          <CardDescription>Agregá servicios normales, combos/ofertas o servicios que se cotizan por WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de servicios existentes */}
          <div className="grid gap-2">
            {(services || []).map(s => {
              const typeInfo = s.type === 'whatsapp' ? SERVICE_TYPE_LABELS.whatsapp : (s.type === 'combo' as any ? SERVICE_TYPE_LABELS.combo : SERVICE_TYPE_LABELS.normal);
              return (
                <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate">{s.name}</p>
                      <Badge variant="outline" className={cn("text-[10px] px-2 py-0 border", typeInfo.color)}>{typeInfo.badge}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                    {s.type !== 'whatsapp' && <p className="text-xs font-semibold mt-0.5">${s.price.toLocaleString('es-AR')} · {s.duration}min</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEditService(s)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteService(s.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulario */}
          <div className="p-4 border rounded-xl bg-muted/10 space-y-4">
            <p className="text-sm font-bold">{editingServiceId ? "Editar Servicio" : "Agregar Servicio"}</p>

            {/* Tipo de servicio */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <RadioGroup value={serviceForm.serviceType} onValueChange={v => setServiceForm({ ...serviceForm, serviceType: v as ServiceType })} className="grid grid-cols-3 gap-3">
                {(Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, typeof SERVICE_TYPE_LABELS[ServiceType]][]).map(([key, val]) => (
                  <div key={key}>
                    <RadioGroupItem value={key} id={`type-${key}`} className="peer sr-only" />
                    <Label htmlFor={`type-${key}`} className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-muted bg-popover hover:bg-accent cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 text-center text-xs font-bold transition-all">
                      {key === 'normal' && <Briefcase className="w-4 h-4" />}
                      {key === 'combo' && <Tag className="w-4 h-4" />}
                      {key === 'whatsapp' && <MessageCircle className="w-4 h-4" />}
                      {val.badge}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Nombre</Label>
                <Input placeholder={serviceForm.serviceType === 'combo' ? "Ej: Combo Corte + Barba" : serviceForm.serviceType === 'whatsapp' ? "Ej: Tintura (cotizar por WhatsApp)" : "Ej: Corte de Pelo"} value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Descripción</Label>
                <Input placeholder={serviceForm.serviceType === 'combo' ? "Ej: 20% de descuento por combo" : "Descripción del servicio"} value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
              </div>
              {serviceForm.serviceType !== 'whatsapp' && (
                <>
                  <div className="space-y-1">
                    <Label>Precio ($)</Label>
                    <Input type="number" value={serviceForm.price || ""} onChange={e => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Duración (min)</Label>
                    <Input type="number" value={serviceForm.duration || ""} onChange={e => setServiceForm({ ...serviceForm, duration: Number(e.target.value) })} />
                  </div>
                </>
              )}
            </div>

            {serviceForm.serviceType === 'whatsapp' && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                Este servicio mostrará un botón de WhatsApp al cliente. El precio y duración se cotizarán por mensaje. Asegurate de tener el número de WhatsApp del negocio configurado arriba.
              </p>
            )}
            {serviceForm.serviceType === 'combo' && (
              <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                Los combos se muestran igual que los servicios normales pero con una etiqueta de "Combo" destacada.
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleServiceSubmit} className="flex-1">{editingServiceId ? "Actualizar" : "Agregar Servicio"}</Button>
              {editingServiceId && <Button variant="ghost" onClick={() => { setEditingServiceId(null); setServiceForm(emptyServiceForm); }}>Cancelar</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EQUIPO */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Equipo de Trabajo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {(professionals || []).map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl border bg-card">
                <Avatar className="h-10 w-10"><AvatarImage src={p.avatarUrl} /><AvatarFallback>{p.name.charAt(0)}</AvatarFallback></Avatar>
                <div className="flex-grow"><p className="font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{p.specialty}</p></div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingProfessionalId(p.id); setProfessionalForm(p); }}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => updateProfessionals((professionals || []).filter(i => i.id !== p.id))} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border rounded-xl bg-muted/10 space-y-3">
            <p className="text-sm font-bold">{editingProfessionalId ? "Editar Profesional" : "Agregar Profesional"}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nombre</Label><Input placeholder="Nombre" value={professionalForm.name} onChange={e => setProfessionalForm({ ...professionalForm, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Especialidad</Label><Input placeholder="Ej: Estilista" value={professionalForm.specialty} onChange={e => setProfessionalForm({ ...professionalForm, specialty: e.target.value })} /></div>
              <div className="space-y-1 md:col-span-2"><Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Foto (link, opcional)</Label><Input placeholder="https://..." value={professionalForm.avatarUrl} onChange={e => setProfessionalForm({ ...professionalForm, avatarUrl: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleProfessionalSubmit} variant="secondary" className="flex-1">{editingProfessionalId ? "Actualizar" : "Agregar al Equipo"}</Button>
              {editingProfessionalId && <Button variant="ghost" onClick={() => { setEditingProfessionalId(null); setProfessionalForm({ name: "", specialty: "", avatarUrl: "", avatarHint: "" }); }}>Cancelar</Button>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
