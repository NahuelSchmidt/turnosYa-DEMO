
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
import { Trash2, Edit, Users, Briefcase, Link as LinkIcon, Copy, Check, Palette, Plus, ExternalLink, Clock, ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AdminSettingsProps {
    tenantId: string;
}

const COLOR_PRESETS = [
  { name: "Negro", hex: "#000000", label: "Minimalista" },
  { name: "Azul", hex: "#3b82f6", label: "Profesional" },
  { name: "Violeta", hex: "#8b5cf6", label: "Moderno" },
  { name: "Rosa", hex: "#ec4899", label: "Elegante" },
  { name: "Verde", hex: "#10b981", label: "Fresco" },
  { name: "Naranja", hex: "#f59e0b", label: "Energético" },
];

export function AdminSettings({ tenantId }: AdminSettingsProps) {
  const { salon, updateSalon, loading: salonLoading } = useSalon(tenantId);
  const { services, updateServices } = useServices(tenantId);
  const { professionals, updateProfessionals } = useProfessionals(tenantId);
  const { timeSlots, updateTimeSlots } = useSchedules(tenantId);
  const { toast } = useToast();

  const bookingLink = typeof window !== 'undefined' ? `${window.location.origin}/book/${tenantId}` : '';
  const [copied, setCopied] = useState(false);
  const [isSavingSalon, setIsSavingSalon] = useState(false);

  const [salonForm, setSalonForm] = useState({ name: '', address: '', primaryColor: '#000000' });
  const [serviceForm, setServiceForm] = useState<Omit<Service, 'id' | 'type'>>({ name: '', description: '', price: 0, duration: 0 });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [professionalForm, setProfessionalForm] = useState<Omit<Professional, 'id'>>({ name: '', specialty: '', avatarUrl: '', avatarHint: '' });
  const [editingProfessionalId, setEditingProfessionalId] = useState<string | null>(null);
  
  const [newTimeSlot, setNewTimeSlot] = useState("");

  useEffect(() => {
    if (salon) {
      setSalonForm({
        name: salon.name || '',
        address: salon.address || '',
        primaryColor: salon.primaryColor || '#000000'
      });
    }
  }, [salon]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    toast({ title: "¡Copiado!", description: "El link de reserva está en tu portapapeles." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSalonUpdate = () => {
    if (!tenantId || tenantId === 'default') {
      toast({ variant: "destructive", title: "Error", description: "No se encontró un ID de salón válido." });
      return;
    }
    setIsSavingSalon(true);
    updateSalon(salonForm);
    toast({ title: "Cambios Guardados", description: "La identidad de tu negocio ha sido actualizada." });
    setTimeout(() => setIsSavingSalon(false), 1000);
  };

  const handleServiceSubmit = async () => {
    if (serviceForm.name && serviceForm.price >= 0 && serviceForm.duration > 0) {
      const currentServices = services || [];
      let updatedServices;
      if (editingServiceId) {
        updatedServices = currentServices.map(s => 
          s.id === editingServiceId ? { ...s, ...serviceForm } : s
        );
      } else {
        const newService: Service = { ...serviceForm, id: `ser-${Date.now()}` };
        updatedServices = [...currentServices, newService];
      }
      await updateServices(updatedServices);
      setServiceForm({ name: '', description: '', price: 0, duration: 0 });
      setEditingServiceId(null);
      toast({ title: "Servicio Guardado" });
    }
  };

  const handleProfessionalSubmit = async () => {
      if (professionalForm.name && professionalForm.specialty) {
          const currentProfessionals = professionals || [];
          let updatedProfessionals;
          if (editingProfessionalId) {
            updatedProfessionals = currentProfessionals.map(p =>
                p.id === editingProfessionalId ? { ...p, ...professionalForm } : p
            );
          } else {
            const newProfessional: Professional = { 
              ...professionalForm, 
              id: `prof-${Date.now()}`,
              avatarUrl: professionalForm.avatarUrl || `https://picsum.photos/seed/${Date.now()}/200/200`,
              avatarHint: 'person portrait'
            };
            updatedProfessionals = [...currentProfessionals, newProfessional];
          }
          await updateProfessionals(updatedProfessionals);
          setProfessionalForm({ name: '', specialty: '', avatarUrl: '', avatarHint: '' });
          setEditingProfessionalId(null);
          toast({ title: "Profesional Guardado" });
      }
  };

  const handleAddTimeSlot = () => {
    if (newTimeSlot && !timeSlots.includes(newTimeSlot)) {
      const updated = [...timeSlots, newTimeSlot].sort();
      updateTimeSlots(updated);
      setNewTimeSlot("");
      toast({ title: "Horario Agregado" });
    }
  };

  const handleRemoveTimeSlot = (slot: string) => {
    updateTimeSlots(timeSlots.filter(s => s !== slot));
    toast({ title: "Horario Eliminado" });
  };

  return (
    <div className="space-y-8 mt-6 pb-20">
      {/* IDENTIDAD VISUAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" /> Identidad Visual
          </CardTitle>
          <CardDescription>Personaliza cómo se ve tu negocio para tus clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salonName">Nombre del Negocio</Label>
              <Input id="salonName" value={salonForm.name} onChange={(e) => setSalonForm({...salonForm, name: e.target.value})} />
            </div>
            
            <div className="space-y-4">
              <Label>Color de Marca</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setSalonForm({ ...salonForm, primaryColor: preset.hex })}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                      salonForm.primaryColor === preset.hex 
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div 
                      className="w-8 h-8 rounded-full shadow-inner border border-white/10" 
                      style={{ backgroundColor: preset.hex }} 
                    />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{preset.name}</span>
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/20">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-bold">Color Personalizado</p>
                  <p className="text-xs text-muted-foreground">Usa el selector para elegir un tono único.</p>
                </div>
                <Input 
                  type="color" 
                  value={salonForm.primaryColor} 
                  onChange={(e) => setSalonForm({ ...salonForm, primaryColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer bg-transparent border-none"
                />
              </div>

              <p className="text-[10px] text-muted-foreground">Este color se aplicará a los botones y elementos interactivos de tu página de reserva.</p>
            </div>
          </div>
          <Button onClick={handleSalonUpdate} disabled={isSavingSalon} className="w-full sm:w-auto">
            {isSavingSalon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar Cambios de Identidad
          </Button>
        </CardContent>
      </Card>

      {/* LINK DE RESERVA */}
      <Card className="border-primary bg-primary/5 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <LinkIcon className="w-5 h-5" /> Tu Link de Reserva
          </CardTitle>
          <CardDescription className="text-foreground/70">Este es el enlace que tus clientes verán. Compártelo en tus redes sociales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={bookingLink} className="bg-background font-mono text-xs md:text-sm h-11" />
            <div className="flex gap-2">
              <Button onClick={copyToClipboard} variant={copied ? "default" : "outline"} className="flex-1 sm:flex-none h-11">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copiar" : "Copiar Link"}
              </Button>
              <Button variant="ghost" asChild className="h-11">
                <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> Ver Página
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HORARIOS DE ATENCIÓN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Horarios de Turnos</CardTitle>
          <CardDescription>Define qué horarios estarán disponibles para reserva en tu agenda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(timeSlots || []).map(slot => (
              <div key={slot} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm border">
                {slot}
                <button onClick={() => handleRemoveTimeSlot(slot)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input 
              type="time" 
              value={newTimeSlot} 
              onChange={e => setNewTimeSlot(e.target.value)} 
            />
            <Button onClick={handleAddTimeSlot} variant="secondary">
              <Plus className="w-4 h-4 mr-2" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* GESTIONAR SERVICIOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5"/>Servicios Ofrecidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {(services || []).map(s => (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-md border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex-grow">
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">${s.price} • {s.duration} min</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingServiceId(s.id); setServiceForm(s); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => updateServices((services || []).filter(item => item.id !== s.id))} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border rounded-lg bg-muted/20 space-y-4 mt-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Servicio</Label>
                  <Input placeholder="Ej: Consulta" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Precio ($)</Label>
                  <Input type="number" value={serviceForm.price || ''} onChange={e => setServiceForm({...serviceForm, price: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Duración (min)</Label>
                  <Input type="number" value={serviceForm.duration || ''} onChange={e => setServiceForm({...serviceForm, duration: Number(e.target.value)})} />
                </div>
             </div>
             <div className="flex gap-2">
               <Button onClick={handleServiceSubmit} className="flex-1">
                 {editingServiceId ? 'Actualizar Servicio' : 'Añadir Servicio'}
               </Button>
               {editingServiceId && (
                 <Button variant="ghost" onClick={() => { setEditingServiceId(null); setServiceForm({ name: '', description: '', price: 0, duration: 0 }); }}>Cancelar</Button>
               )}
             </div>
          </div>
        </CardContent>
      </Card>

      {/* GESTIONAR EQUIPO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5"/>Equipo de Trabajo</CardTitle>
          <CardDescription>Agrega a los profesionales que brindan los servicios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {(professionals || []).map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3 rounded-md border bg-card hover:bg-muted/30 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.avatarUrl} />
                  <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.specialty}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingProfessionalId(p.id); setProfessionalForm(p); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => updateProfessionals((professionals || []).filter(item => item.id !== p.id))} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border rounded-lg bg-muted/20 space-y-4 mt-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Profesional</Label>
                  <Input placeholder="Nombre" value={professionalForm.name} onChange={e => setProfessionalForm({...professionalForm, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Especialidad / Cargo</Label>
                  <Input placeholder="Ej: Estilista, Consultor, etc." value={professionalForm.specialty} onChange={e => setProfessionalForm({...professionalForm, specialty: e.target.value})} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Link de Foto de Perfil (Opcional)</Label>
                  <Input 
                    placeholder="https://ejemplo.com/mi-foto.jpg" 
                    value={professionalForm.avatarUrl} 
                    onChange={e => setProfessionalForm({...professionalForm, avatarUrl: e.target.value})} 
                  />
                  <p className="text-[10px] text-muted-foreground">Pega aquí el enlace de una imagen. Si lo dejas vacío, usaremos una por defecto.</p>
                </div>
             </div>
             <div className="flex gap-2">
               <Button onClick={handleProfessionalSubmit} className="flex-1" variant="secondary">
                  {editingProfessionalId ? 'Actualizar Profesional' : 'Añadir al Equipo'}
               </Button>
               {editingProfessionalId && (
                 <Button variant="ghost" onClick={() => { setEditingProfessionalId(null); setProfessionalForm({ name: '', specialty: '', avatarUrl: '', avatarHint: '' }); }}>Cancelar</Button>
               )}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
