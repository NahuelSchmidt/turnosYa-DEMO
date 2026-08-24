"use client";

import { useState, useEffect } from "react";
import { useServices } from "@/hooks/use-services";
import { useProfessionals } from "@/hooks/use-professionals";
import { useSchedules } from "@/hooks/use-schedules";
import { useSalon } from "@/hooks/use-salon";
import { useBranches } from "@/hooks/use-branches";
import { Service, Professional } from "@/lib/data";
import { LockedFeature } from "@/components/ui/locked-feature";
import { usePlan } from "@/hooks/use-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Users, Briefcase, Link as LinkIcon, Copy, Check, Palette, Plus, ExternalLink, Clock, Loader2, Phone, MessageCircle, Tag, Percent, Ban, Instagram, Facebook, Building2, CalendarClock, ChevronDown, ChevronUp, X } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface AdminSettingsProps {
  tenantId: string;
}

const COLOR_PRESETS = [
  { name: "Negro",   hex: "#000000" },
  { name: "Gris",    hex: "#6b7280" },
  { name: "Azul",    hex: "#3b82f6" },
  { name: "Violeta", hex: "#8b5cf6" },
  { name: "Rosa",    hex: "#ec4899" },
  { name: "Rojo",    hex: "#ef4444" },
  { name: "Verde",   hex: "#10b981" },
  { name: "Naranja", hex: "#f59e0b" },
  { name: "Celeste", hex: "#06b6d4" },
  { name: "Lima",    hex: "#84cc16" },
  { name: "Índigo",  hex: "#6366f1" },
  { name: "Marrón",  hex: "#92400e" },
];

type ServiceType = 'normal' | 'combo' | 'oferta' | 'whatsapp' | 'clase';

const SERVICE_TYPES: { key: ServiceType; label: string; badge: string; badgeClass: string; icon: any; placeholder: string }[] = [
  { key: 'normal',   label: 'Normal',          badge: 'Servicio', badgeClass: 'bg-muted text-muted-foreground',                              icon: Briefcase,     placeholder: 'Ej: Corte de Pelo' },
  { key: 'combo',    label: 'Combo',            badge: 'Combo',    badgeClass: 'bg-blue-100 text-blue-700 border-blue-300',                   icon: Tag,           placeholder: 'Ej: Combo Corte + Barba' },
  { key: 'oferta',   label: 'Oferta',           badge: 'Oferta',   badgeClass: 'bg-orange-100 text-orange-700 border-orange-300',             icon: Percent,       placeholder: 'Ej: 20% off Lunes' },
  { key: 'whatsapp', label: 'Cotizar x WA',     badge: 'WhatsApp', badgeClass: 'bg-green-100 text-green-700 border-green-300',               icon: MessageCircle, placeholder: 'Ej: Tintura (consultar precio)' },
];

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_KEY = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

interface DaySchedule {
  enabled: boolean;
  slots: string[]; // lista de horarios HH:MM
}

const DEFAULT_SCHEDULE: DaySchedule = { enabled: false, slots: [] };

export function AdminSettings({ tenantId }: AdminSettingsProps) {
  const { features } = usePlan(tenantId);
  const { salon, updateSalon } = useSalon(tenantId);
  const { branches, addBranch, updateBranch, deleteBranch } = useBranches(tenantId);
  const { services, updateServices } = useServices(tenantId);
  const { professionals, updateProfessionals } = useProfessionals(tenantId);
  const { updateTimeSlots } = useSchedules(tenantId);
  const { toast } = useToast();

  const bookingLink = typeof window !== "undefined" ? `${window.location.origin}/book/${tenantId}` : "";
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [salonForm, setSalonForm] = useState({ name: "", primaryColor: "#000000", whatsappNumber: "", address: "", paymentAlias: "", evolutionInstanceName: "", whatsappEmoji: "", description: "", coverImageUrl: "", instagram: "", facebook: "", tiktok: "" });

  // Horarios por día (turnos 1-a-1)
  const [weekSchedule, setWeekSchedule] = useState<Record<string, DaySchedule>>(
    Object.fromEntries(DIAS_KEY.map(d => [d, { ...DEFAULT_SCHEDULE, slots: [] }]))
  );
  const [newSlotByDay, setNewSlotByDay] = useState<Record<string, string>>(
    Object.fromEntries(DIAS_KEY.map(d => [d, '']))
  );

  // Horarios por día (clases) — independientes de los horarios de turnos
  const [classWeekSchedule, setClassWeekSchedule] = useState<Record<string, DaySchedule>>(
    Object.fromEntries(DIAS_KEY.map(d => [d, { ...DEFAULT_SCHEDULE, slots: [] }]))
  );
  const [newClassSlotByDay, setNewClassSlotByDay] = useState<Record<string, string>>(
    Object.fromEntries(DIAS_KEY.map(d => [d, '']))
  );

  // Días bloqueados
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [dateToBlock, setDateToBlock] = useState<Date | undefined>(undefined);

  // Horarios bloqueados
  const [blockedSlots, setBlockedSlots] = useState<{ date: string; time: string }[]>([]);
  const [slotDateToBlock, setSlotDateToBlock] = useState<string>('');
  const [slotTimeToBlock, setSlotTimeToBlock] = useState<string>('');

  useEffect(() => {
    if (salon) {
      setSalonForm({
        name: salon.name || "",
        primaryColor: salon.primaryColor || "#000000",
        whatsappNumber: salon.whatsappNumber || "",
        address: salon.address || "",
        paymentAlias: (salon as any).paymentAlias || "",
        evolutionInstanceName: (salon as any).evolutionInstanceName || "",
        whatsappEmoji: (salon as any).whatsappEmoji || "",
        description: (salon as any).description || "",
        coverImageUrl: (salon as any).coverImageUrl || "",
        instagram: (salon as any).instagram || "",
        facebook: (salon as any).facebook || "",
        tiktok: (salon as any).tiktok || "",
      });
      if (salon.weekSchedule) {
        setWeekSchedule(salon.weekSchedule);
      }
      if ((salon as any).classWeekSchedule) {
        setClassWeekSchedule((salon as any).classWeekSchedule);
      }
      if (salon.blockedDates) {
        setBlockedDates(salon.blockedDates);
      }
      if (salon.blockedSlots) {
        setBlockedSlots(salon.blockedSlots);
      }
    }
  }, [salon]);

  // Generar slots únicos de todos los días activos
  const generateSlotsFromSchedule = (schedule: Record<string, DaySchedule>) => {
    const allSlots = new Set<string>();
    DIAS_KEY.forEach(day => {
      const d = schedule[day];
      if (!d.enabled) return;
      (d.slots || []).forEach(s => allSlots.add(s));
    });
    return Array.from(allSlots).sort();
  };

  const addSlotToDay = (dayKey: string) => {
    const slot = newSlotByDay[dayKey];
    if (!slot) return;
    // Validate HH:MM format
    const match = slot.match(/^([0-9]{1,2}):([0-9]{2})$/);
    if (!match) return;
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h > 23 || m > 59) return;
    const normalized = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const current = weekSchedule[dayKey]?.slots || [];
    if (current.includes(normalized)) return;
    const updated = { ...weekSchedule, [dayKey]: { ...weekSchedule[dayKey], slots: [...current, normalized].sort() } };
    setWeekSchedule(updated);
    setNewSlotByDay(prev => ({ ...prev, [dayKey]: '' }));
  };

  const removeSlotFromDay = (dayKey: string, slot: string) => {
    const current = weekSchedule[dayKey]?.slots || [];
    const updated = { ...weekSchedule, [dayKey]: { ...weekSchedule[dayKey], slots: current.filter(s => s !== slot) } };
    setWeekSchedule(updated);
  };

  const addSlotToClassDay = (dayKey: string) => {
    const slot = newClassSlotByDay[dayKey];
    if (!slot) return;
    const match = slot.match(/^([0-9]{1,2}):([0-9]{2})$/);
    if (!match) return;
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h > 23 || m > 59) return;
    const normalized = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const current = classWeekSchedule[dayKey]?.slots || [];
    if (current.includes(normalized)) return;
    const updated = { ...classWeekSchedule, [dayKey]: { ...classWeekSchedule[dayKey], slots: [...current, normalized].sort() } };
    setClassWeekSchedule(updated);
    setNewClassSlotByDay(prev => ({ ...prev, [dayKey]: '' }));
  };

  const removeSlotFromClassDay = (dayKey: string, slot: string) => {
    const current = classWeekSchedule[dayKey]?.slots || [];
    const updated = { ...classWeekSchedule, [dayKey]: { ...classWeekSchedule[dayKey], slots: current.filter(s => s !== slot) } };
    setClassWeekSchedule(updated);
  };

  const saveClassSchedule = () => {
    setIsSaving(true);
    const slots = generateSlotsFromSchedule(classWeekSchedule);
    updateSalon({ classWeekSchedule, classTimeSlots: slots });
    toast({ title: "Horarios de clases guardados" });
    setTimeout(() => setIsSaving(false), 1000);
  };

  const addBlockedDate = () => {
    if (!dateToBlock) return;
    const dateStr = format(dateToBlock, 'yyyy-MM-dd');
    if (blockedDates.includes(dateStr)) return;
    const updated = [...blockedDates, dateStr].sort();
    setBlockedDates(updated);
    setDateToBlock(undefined);
  };

  const removeBlockedDate = (dateStr: string) => {
    setBlockedDates(prev => prev.filter(d => d !== dateStr));
  };

  const addBlockedSlot = () => {
    if (!slotDateToBlock || !slotTimeToBlock) return;
    const already = blockedSlots.some(bs => bs.date === slotDateToBlock && bs.time === slotTimeToBlock);
    if (already) return;
    setBlockedSlots(prev => [...prev, { date: slotDateToBlock, time: slotTimeToBlock }].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
    setSlotDateToBlock('');
    setSlotTimeToBlock('');
  };

  const removeBlockedSlot = (date: string, time: string) => {
    setBlockedSlots(prev => prev.filter(bs => !(bs.date === date && bs.time === time)));
  };

  const saveBlockedDates = () => {
    setIsSaving(true);
    const slots = generateSlotsFromSchedule(weekSchedule);
    updateSalon({ ...salonForm, weekSchedule, timeSlots: slots, blockedDates, blockedSlots });
    toast({ title: "Días y horarios bloqueados guardados" });
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleSalonUpdate = () => {
    setIsSaving(true);
    const slots = generateSlotsFromSchedule(weekSchedule);
    updateSalon({ ...salonForm, weekSchedule, timeSlots: slots, blockedDates });
    toast({ title: "Cambios Guardados" });
    setTimeout(() => setIsSaving(false), 1000);
  };


  const emptyBranchSchedule = Object.fromEntries(DIAS_KEY.map(d => [d, { enabled: false, slots: [] }]));
  const [branchForm, setBranchForm] = useState({ name: "", address: "", professionalIds: [] as string[], weekSchedule: emptyBranchSchedule as Record<string, { enabled: boolean; slots: string[] }> });
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [newBranchSlotByDay, setNewBranchSlotByDay] = useState<Record<string, string>>(Object.fromEntries(DIAS_KEY.map(d => [d, ''])));

  const handleBranchSubmit = () => {
    if (!branchForm.name) return;
    const data = { name: branchForm.name, address: branchForm.address, professionalIds: branchForm.professionalIds, weekSchedule: branchForm.weekSchedule };
    if (editingBranchId) {
      updateBranch(editingBranchId, data);
    } else {
      addBranch(data);
    }
    setBranchForm({ name: "", address: "", professionalIds: [], weekSchedule: emptyBranchSchedule });
    setEditingBranchId(null);
    toast({ title: editingBranchId ? "Sucursal actualizada" : "Sucursal agregada" });
  };

  const addSlotToBranchDay = (dayKey: string) => {
    const slot = newBranchSlotByDay[dayKey];
    if (!slot) return;
    const match = slot.match(/^([0-9]{1,2}):([0-9]{2})$/);
    if (!match) return;
    const h = parseInt(match[1]); const m = parseInt(match[2]);
    if (h > 23 || m > 59) return;
    const normalized = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const current = branchForm.weekSchedule[dayKey]?.slots || [];
    if (current.includes(normalized)) return;
    setBranchForm(prev => ({ ...prev, weekSchedule: { ...prev.weekSchedule, [dayKey]: { ...prev.weekSchedule[dayKey], slots: [...current, normalized].sort() } } }));
    setNewBranchSlotByDay(prev => ({ ...prev, [dayKey]: '' }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    toast({ title: "¡Copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  type SForm = { name: string; description: string; price: number; duration: number; serviceType: ServiceType; professionalIds: string[] };
  const emptyForm: SForm = { name: "", description: "", price: 0, duration: 0, serviceType: 'normal', professionalIds: [] };
  const [serviceForm, setServiceForm] = useState<SForm>(emptyForm);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  type ClassForm = { name: string; description: string; price: number; duration: number; capacity: number; address: string; professionalIds: string[] };
  const emptyClassForm: ClassForm = { name: "", description: "", price: 0, duration: 0, capacity: 0, address: "", professionalIds: [] };
  const [classForm, setClassForm] = useState<ClassForm>(emptyClassForm);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const [profForm, setProfForm] = useState<Omit<Professional, "id">>({ name: "", specialty: "", avatarUrl: "", avatarHint: "", emoji: "" } as any);
  const [editingProfId, setEditingProfId] = useState<string | null>(null);

  // Horarios por profesional
  const [expandedProfSchedule, setExpandedProfSchedule] = useState<string | null>(null);
  const [profSchedule, setProfSchedule] = useState<Record<string, Record<string, DaySchedule>>>({});
  const [profSlotInput, setProfSlotInput] = useState<Record<string, Record<string, string>>>({});

  const initProfSchedule = (prof: Professional) => {
    const existing = (prof as any).weekSchedule || Object.fromEntries(DIAS_KEY.map(d => [d, { enabled: false, slots: [] }]));
    setProfSchedule(prev => ({ ...prev, [prof.id]: existing }));
    setProfSlotInput(prev => ({ ...prev, [prof.id]: Object.fromEntries(DIAS_KEY.map(d => [d, ''])) }));
  };

  const toggleProfDay = (profId: string, dayKey: string) => {
    setProfSchedule(prev => ({
      ...prev,
      [profId]: { ...prev[profId], [dayKey]: { ...prev[profId][dayKey], enabled: !prev[profId][dayKey]?.enabled } }
    }));
  };

  const addProfSlot = (profId: string, dayKey: string) => {
    const raw = profSlotInput[profId]?.[dayKey] || '';
    const normalized = raw.length === 4 && !raw.includes(':') ? `${raw.slice(0,2)}:${raw.slice(2)}` : raw;
    if (!/^\d{2}:\d{2}$/.test(normalized)) return;
    const current = profSchedule[profId]?.[dayKey]?.slots || [];
    if (current.includes(normalized)) return;
    setProfSchedule(prev => ({
      ...prev,
      [profId]: { ...prev[profId], [dayKey]: { ...prev[profId][dayKey], slots: [...current, normalized].sort() } }
    }));
    setProfSlotInput(prev => ({ ...prev, [profId]: { ...prev[profId], [dayKey]: '' } }));
  };

  const removeProfSlot = (profId: string, dayKey: string, slot: string) => {
    setProfSchedule(prev => ({
      ...prev,
      [profId]: { ...prev[profId], [dayKey]: { ...prev[profId][dayKey], slots: prev[profId][dayKey].slots.filter(s => s !== slot) } }
    }));
  };

  const saveProfSchedule = (profId: string) => {
    const schedule = profSchedule[profId];
    const updated = (professionals || []).map(p => p.id === profId ? { ...p, weekSchedule: schedule } : p);
    updateProfessionals(updated);
    toast({ title: "Horarios guardados" });
    setExpandedProfSchedule(null);
  };

  const clearProfSchedule = (profId: string) => {
    const updated = (professionals || []).map(p => {
      if (p.id !== profId) return p;
      const { weekSchedule, ...rest } = p as any;
      return rest;
    });
    updateProfessionals(updated);
    toast({ title: "Horario personalizado eliminado — usa el horario del negocio" });
    setExpandedProfSchedule(null);
  };

  const getServiceType = (s: Service): ServiceType => {
    if ((s as any).type === 'whatsapp') return 'whatsapp';
    if ((s as any).type === 'combo') return 'combo';
    if ((s as any).type === 'oferta') return 'oferta';
    if ((s as any).type === 'clase') return 'clase';
    return 'normal';
  };

  const handleServiceSubmit = async () => {
    if (!serviceForm.name) return;
    if (serviceForm.serviceType !== 'whatsapp' && (serviceForm.price < 0 || serviceForm.duration <= 0)) {
      toast({ variant: "destructive", title: "Completá precio y duración" });
      return;
    }
    const isSpecial = serviceForm.serviceType !== 'normal';
    const serviceData: any = {
      id: editingServiceId || `ser-${Date.now()}`,
      name: serviceForm.name,
      description: serviceForm.description,
      price: serviceForm.serviceType === 'whatsapp' ? 0 : serviceForm.price,
      duration: serviceForm.serviceType === 'whatsapp' ? 0 : serviceForm.duration,
      ...(isSpecial && { type: serviceForm.serviceType }),
      ...(serviceForm.professionalIds.length > 0 && { professionalIds: serviceForm.professionalIds }),
    };
    const updated = editingServiceId
      ? (services || []).map(s => s.id === editingServiceId ? serviceData : s)
      : [...(services || []), serviceData];
    await updateServices(updated);
    setServiceForm(emptyForm);
    setEditingServiceId(null);
    toast({ title: editingServiceId ? "Servicio actualizado" : "Servicio agregado" });
  };

  const handleDeleteService = async (id: string) => {
    await updateServices((services || []).filter(s => s.id !== id));
    toast({ title: "Servicio eliminado" });
  };

  const handleClassSubmit = async () => {
    if (!classForm.name) return;
    if (classForm.price < 0 || classForm.duration <= 0) {
      toast({ variant: "destructive", title: "Completá precio y duración" });
      return;
    }
    if (classForm.capacity <= 0) {
      toast({ variant: "destructive", title: "Completá el cupo de la clase" });
      return;
    }
    const classData: any = {
      id: editingClassId || `ser-${Date.now()}`,
      name: classForm.name,
      description: classForm.description,
      price: classForm.price,
      duration: classForm.duration,
      type: 'clase',
      capacity: classForm.capacity,
      ...(classForm.address.trim() && { address: classForm.address.trim() }),
      ...(classForm.professionalIds.length > 0 && { professionalIds: classForm.professionalIds }),
    };
    const updated = editingClassId
      ? (services || []).map(s => s.id === editingClassId ? classData : s)
      : [...(services || []), classData];
    await updateServices(updated);
    setClassForm(emptyClassForm);
    setEditingClassId(null);
    toast({ title: editingClassId ? "Clase actualizada" : "Clase agregada" });
  };

  const handleProfSubmit = async () => {
    if (!profForm.name || !profForm.specialty) return;
    const updated = editingProfId
      ? (professionals || []).map(p => p.id === editingProfId ? { ...p, ...profForm } : p)
      : [...(professionals || []), { ...profForm, id: `prof-${Date.now()}`, avatarUrl: '', avatarHint: '' }];
    await updateProfessionals(updated);
    setProfForm({ name: "", specialty: "", avatarUrl: "", avatarHint: "", emoji: "" } as any);
    setEditingProfId(null);
    toast({ title: "Profesional guardado" });
  };

  const updateDay = (dayKey: string, field: keyof DaySchedule, value: any) => {
    setWeekSchedule(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], [field]: value } }));
  };

  return (
    <div className="space-y-8 mt-6 pb-20">

      {/* ── IDENTIDAD VISUAL ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> Identidad Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Nombre del Negocio</Label>
            <Input value={salonForm.name} onChange={e => setSalonForm({ ...salonForm, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Descripción <span className="text-xs text-muted-foreground">(se muestra en tu página de perfil)</span></Label>
            <textarea
              placeholder="Ej: Somos un centro de estética especializado en tratamientos faciales y corporales..."
              value={salonForm.description}
              onChange={e => setSalonForm({ ...salonForm, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Foto de portada</Label>
            {features.hasProfilePage ? (
              <>
                <ImageUpload
                  value={salonForm.coverImageUrl}
                  onChange={url => setSalonForm({ ...salonForm, coverImageUrl: url })}
                  label="Subir foto de portada"
                />
                <p className="text-xs text-muted-foreground">Se muestra en la parte superior de tu página de perfil.</p>
              </>
            ) : (
              <LockedFeature featureName="Foto de Portada" requiredPlan="premium" />
            )}
          </div>
          <div className="space-y-3">
            <Label>Redes sociales <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-500 shrink-0" />
                <Input placeholder="@tunegocio o URL de Instagram" value={salonForm.instagram} onChange={e => setSalonForm({ ...salonForm, instagram: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-500 shrink-0" />
                <Input placeholder="URL de Facebook" value={salonForm.facebook} onChange={e => setSalonForm({ ...salonForm, facebook: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm shrink-0">🎵</span>
                <Input placeholder="@tunegocio o URL de TikTok" value={salonForm.tiktok} onChange={e => setSalonForm({ ...salonForm, tiktok: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Dirección / Ubicación</Label>
            <Input placeholder="Ej: Av. Corrientes 1234, Buenos Aires" value={salonForm.address} onChange={e => setSalonForm({ ...salonForm, address: e.target.value })} />
            <p className="text-xs text-muted-foreground">Se muestra al cliente en la confirmación y en el mensaje de WhatsApp.</p>
          </div>

          {/* Color picker mejorado */}
          {features.hasBrandColor ? (
            <div className="space-y-3">
              <Label>Color de Marca</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PRESETS.map(p => (
                  <button
                    key={p.hex}
                    onClick={() => setSalonForm({ ...salonForm, primaryColor: p.hex })}
                    title={p.name}
                    className={cn(
                      "relative h-10 rounded-xl transition-all",
                      salonForm.primaryColor === p.hex
                        ? "ring-2 ring-offset-2 ring-foreground scale-110"
                        : "hover:scale-105 opacity-80 hover:opacity-100"
                    )}
                    style={{ backgroundColor: p.hex }}
                  >
                    {salonForm.primaryColor === p.hex && (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-xl border shadow-inner" style={{ backgroundColor: salonForm.primaryColor }} />
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Color personalizado</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={salonForm.primaryColor}
                      onChange={e => setSalonForm({ ...salonForm, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border p-0.5"
                    />
                    <Input
                      value={salonForm.primaryColor}
                      onChange={e => setSalonForm({ ...salonForm, primaryColor: e.target.value })}
                      className="font-mono text-sm h-8 w-28"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <LockedFeature featureName="Color de Marca Personalizado" requiredPlan="premium" />
          )}

          <Button onClick={handleSalonUpdate} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Identidad
          </Button>
        </CardContent>
      </Card>

      {/* ── WHATSAPP ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> WhatsApp del Negocio</CardTitle>
          <CardDescription>Con código de país, sin +. Ej: <span className="font-mono">5491123456789</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="5491123456789" value={salonForm.whatsappNumber}
            onChange={e => setSalonForm({ ...salonForm, whatsappNumber: e.target.value.replace(/\D/g, "") })} className="font-mono" />
          <div className="space-y-2">
            <Label>Alias o CBU de pago</Label>
            <Input placeholder="Ej: negocio.reiki.mp" value={salonForm.paymentAlias}
              onChange={e => setSalonForm({ ...salonForm, paymentAlias: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Emoji del negocio <span className="text-xs text-muted-foreground">(se muestra en los mensajes de WhatsApp)</span></Label>
            <Input placeholder="Ej: 💆 ✂️ 💅 🧴 🏋️" value={salonForm.whatsappEmoji}
              onChange={e => setSalonForm({ ...salonForm, whatsappEmoji: e.target.value })} className="text-xl w-24" maxLength={4} />
            <p className="text-xs text-muted-foreground">Pegá un emoji que represente tu negocio.</p>
          </div>
          <Button onClick={handleSalonUpdate} disabled={isSaving} variant="secondary">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Número
          </Button>
        </CardContent>
      </Card>

      {/* ── PERFIL PÚBLICO ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ExternalLink className="w-5 h-5 text-primary" /> Tu Página de Perfil</CardTitle>
          <CardDescription>Página pública con info del negocio, servicios y reseñas.</CardDescription>
        </CardHeader>
        <CardContent>
          {features.hasProfilePage ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input readOnly value={typeof window !== "undefined" ? `${window.location.origin}/negocio/${tenantId}` : ""} className="bg-background font-mono text-xs h-11" />
              <Button variant="outline" asChild className="h-11">
                <a href={`/negocio/${tenantId}`} target="_blank"><ExternalLink className="w-4 h-4 mr-2" /> Ver perfil</a>
              </Button>
            </div>
          ) : (
            <LockedFeature featureName="Página de Perfil Pública" requiredPlan="premium" />
          )}
        </CardContent>
      </Card>

      {/* ── LINK ── */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary"><LinkIcon className="w-5 h-5" /> Tu Link de Reserva</CardTitle>
        </CardHeader>
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

      {/* ── CLASES GRUPALES (on/off) ── */}
      {features.hasClasses && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-violet-600" /> Clases Grupales</CardTitle>
            <CardDescription>Activalo solo si tu negocio da clases o talleres con cupo (yoga, pilates, etc). Si no, dejalo apagado.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="font-bold text-sm">¿Ofrecés clases grupales?</p>
                <p className="text-xs text-muted-foreground">Muestra la sección para configurar clases con cupo máximo, aparte de tus turnos normales.</p>
              </div>
              <Switch checked={!!(salon as any)?.classesEnabled} onCheckedChange={v => updateSalon({ classesEnabled: v })} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── HORARIOS POR DÍA ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Horarios</CardTitle>
          <CardDescription>Los turnos y las clases tienen horarios independientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="turnos">
            <TabsList className="mb-4">
              <TabsTrigger value="turnos">Turnos</TabsTrigger>
              {features.hasClasses && (salon as any)?.classesEnabled && <TabsTrigger value="clases">Clases</TabsTrigger>}
            </TabsList>

            <TabsContent value="turnos" className="space-y-3">
              {DIAS.map((dia, i) => {
                const key = DIAS_KEY[i];
                const d = weekSchedule[key] || DEFAULT_SCHEDULE;
                const daySlots = d.slots || [];
                return (
                  <div key={key} className={cn("rounded-xl border p-4 transition-all", d.enabled ? "bg-card" : "bg-muted/20")}>
                    <div className="flex items-center gap-3 mb-3">
                      <Switch checked={d.enabled} onCheckedChange={v => updateDay(key, 'enabled', v)} />
                      <span className={cn("font-bold", d.enabled ? "text-foreground" : "text-muted-foreground")}>{dia}</span>
                      {d.enabled && daySlots.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-auto">{daySlots.length} horario{daySlots.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {d.enabled && (
                      <div className="space-y-3">
                        {/* Horarios existentes */}
                        {daySlots.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {daySlots.map(slot => (
                              <div key={slot} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg text-sm font-mono">
                                {slot}
                                <button onClick={() => removeSlotFromDay(key, slot)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {daySlots.length === 0 && (
                          <p className="text-xs text-muted-foreground">Sin horarios. Agregá al menos uno.</p>
                        )}
                        {/* Agregar horario */}
                        <div className="flex gap-2 max-w-xs">
                          <Input
                            placeholder="Ej: 13:00"
                            value={newSlotByDay[key] || ''}
                            onChange={e => {
                              let val = e.target.value.replace(/[^0-9:]/g, '');
                              // Auto-insert colon after 2 digits
                              if (val.length === 2 && !val.includes(':')) val = val + ':';
                              if (val.length > 5) val = val.slice(0, 5);
                              setNewSlotByDay(prev => ({ ...prev, [key]: val }));
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') addSlotToDay(key); }}
                            className="h-8 text-sm font-mono w-24"
                            maxLength={5}
                          />
                          <Button size="sm" variant="secondary" onClick={() => addSlotToDay(key)} className="h-8 px-3">
                            <Plus className="w-3 h-3 mr-1" /> Agregar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button onClick={handleSalonUpdate} disabled={isSaving} className="w-full mt-2">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Horarios de Turnos
              </Button>
            </TabsContent>

            {features.hasClasses && (salon as any)?.classesEnabled && (
              <TabsContent value="clases" className="space-y-3">
                <p className="text-xs text-muted-foreground -mt-1 mb-1">Definí los horarios puntuales de tus clases (ej: 18:00), independientes de la grilla de turnos.</p>
                {DIAS.map((dia, i) => {
                  const key = DIAS_KEY[i];
                  const d = classWeekSchedule[key] || DEFAULT_SCHEDULE;
                  const daySlots = d.slots || [];
                  return (
                    <div key={key} className={cn("rounded-xl border p-4 transition-all", d.enabled ? "bg-card" : "bg-muted/20")}>
                      <div className="flex items-center gap-3 mb-3">
                        <Switch checked={d.enabled} onCheckedChange={v => setClassWeekSchedule(prev => ({ ...prev, [key]: { ...prev[key], enabled: v } }))} />
                        <span className={cn("font-bold", d.enabled ? "text-foreground" : "text-muted-foreground")}>{dia}</span>
                        {d.enabled && daySlots.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-auto">{daySlots.length} horario{daySlots.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      {d.enabled && (
                        <div className="space-y-3">
                          {daySlots.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {daySlots.map(slot => (
                                <div key={slot} className="flex items-center gap-1 bg-violet-100 dark:bg-violet-950/30 px-2 py-1 rounded-lg text-sm font-mono">
                                  {slot}
                                  <button onClick={() => removeSlotFromClassDay(key, slot)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {daySlots.length === 0 && (
                            <p className="text-xs text-muted-foreground">Sin horarios. Agregá al menos uno.</p>
                          )}
                          <div className="flex gap-2 max-w-xs">
                            <Input
                              placeholder="Ej: 18:00"
                              value={newClassSlotByDay[key] || ''}
                              onChange={e => {
                                let val = e.target.value.replace(/[^0-9:]/g, '');
                                if (val.length === 2 && !val.includes(':')) val = val + ':';
                                if (val.length > 5) val = val.slice(0, 5);
                                setNewClassSlotByDay(prev => ({ ...prev, [key]: val }));
                              }}
                              onKeyDown={e => { if (e.key === 'Enter') addSlotToClassDay(key); }}
                              className="h-8 text-sm font-mono w-24"
                              maxLength={5}
                            />
                            <Button size="sm" variant="secondary" onClick={() => addSlotToClassDay(key)} className="h-8 px-3">
                              <Plus className="w-3 h-3 mr-1" /> Agregar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button onClick={saveClassSchedule} disabled={isSaving} className="w-full mt-2">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Horarios de Clases
                </Button>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* ── DÍAS BLOQUEADOS ── */}
      {!features.hasBlockedDates ? (
        <LockedFeature featureName="Días y Horarios Bloqueados" requiredPlan="pro" />
      ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-destructive" /> Días Bloqueados</CardTitle>
          <CardDescription>Bloqueá feriados, vacaciones o días sin atención. Los clientes no podrán reservar en estas fechas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={dateToBlock}
                onSelect={setDateToBlock}
                locale={es}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                modifiers={{ blocked: blockedDates.map(s => new Date(s + 'T12:00:00')) }}
                modifiersClassNames={{ blocked: 'bg-destructive/20 text-destructive font-bold rounded-md' }}
                className="rounded-md border"
              />
            </div>
            <div className="flex-1 space-y-3">
              <Button
                variant="destructive"
                size="sm"
                disabled={!dateToBlock}
                onClick={addBlockedDate}
                className="w-full md:w-auto"
              >
                <Ban className="w-4 h-4 mr-2" />
                Bloquear día seleccionado
              </Button>
              {blockedDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin días bloqueados.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Días bloqueados ({blockedDates.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {blockedDates.map(dateStr => {
                      const d = new Date(dateStr + 'T12:00:00');
                      return (
                        <div key={dateStr} className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 text-destructive px-3 py-1.5 rounded-lg text-sm font-medium">
                          <span className="capitalize">{format(d, "dd 'de' MMMM yyyy", { locale: es })}</span>
                          <button onClick={() => removeBlockedDate(dateStr)} className="ml-1 hover:opacity-70 transition-opacity">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* ── Horarios bloqueados ── */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <p className="font-bold text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-destructive" /> Horarios Bloqueados</p>
              <p className="text-xs text-muted-foreground mt-1">Bloqueá un horario puntual en una fecha específica sin bloquear el día completo.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={slotDateToBlock}
                  onChange={e => setSlotDateToBlock(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label>Horario</Label>
                <Select value={slotTimeToBlock} onValueChange={setSlotTimeToBlock}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar horario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {generateSlotsFromSchedule(weekSchedule).length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Sin horarios configurados.</div>
                    ) : (
                      generateSlotsFromSchedule(weekSchedule).map(slot => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={!slotDateToBlock || !slotTimeToBlock}
              onClick={addBlockedSlot}
              className="w-full sm:w-auto"
            >
              <Ban className="w-4 h-4 mr-2" /> Bloquear horario
            </Button>
            {blockedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin horarios bloqueados.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Horarios bloqueados ({blockedSlots.length})</p>
                <div className="flex flex-wrap gap-2">
                  {blockedSlots.map(bs => {
                    const d = new Date(bs.date + 'T12:00:00');
                    return (
                      <div key={`${bs.date}-${bs.time}`} className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 text-destructive px-3 py-1.5 rounded-lg text-sm font-medium">
                        <span className="capitalize">{format(d, "dd/MM/yyyy", { locale: es })} · {bs.time}</span>
                        <button onClick={() => removeBlockedSlot(bs.date, bs.time)} className="ml-1 hover:opacity-70 transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Button onClick={saveBlockedDates} disabled={isSaving} variant="outline" className="w-full">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Días y Horarios Bloqueados
          </Button>
        </CardContent>
      </Card>
      )}

      {/* ── SERVICIOS ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> Servicios</CardTitle>
          <CardDescription>Agregá servicios normales, combos, ofertas o a cotizar por WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {(services || []).filter(s => getServiceType(s) !== 'clase').map(s => {
              const typeKey = getServiceType(s);
              const typeInfo = SERVICE_TYPES.find(t => t.key === typeKey)!;
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate">{s.name}</p>
                      {typeKey !== 'normal' && (
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0 border", typeInfo.badgeClass)}>
                          {typeInfo.badge}
                        </Badge>
                      )}
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                    {typeKey !== 'whatsapp' && <p className="text-xs font-semibold mt-0.5">${s.price.toLocaleString('es-AR')} · {s.duration}min</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingServiceId(s.id);
                      setServiceForm({ name: s.name, description: s.description, price: s.price, duration: s.duration, serviceType: typeKey, professionalIds: (s as any).professionalIds || [] });
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteService(s.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 border rounded-xl bg-muted/10 space-y-4">
            <p className="text-sm font-bold">{editingServiceId ? "Editar Servicio" : "Agregar Servicio"}</p>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <RadioGroup value={serviceForm.serviceType} onValueChange={v => setServiceForm({ ...serviceForm, serviceType: v as ServiceType })}
                className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SERVICE_TYPES.filter(t => features.hasCombosAndOffers || (t.key !== 'combo' && t.key !== 'oferta')).map(t => (
                  <div key={t.key}>
                    <RadioGroupItem value={t.key} id={`type-${t.key}`} className="peer sr-only" />
                    <Label htmlFor={`type-${t.key}`}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-muted bg-popover hover:bg-accent cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 text-center transition-all">
                      <t.icon className="w-4 h-4" />
                      <span className="text-xs font-bold">{t.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Nombre</Label>
                <Input placeholder={SERVICE_TYPES.find(t => t.key === serviceForm.serviceType)?.placeholder}
                  value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input placeholder="Descripción del servicio" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
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
              {(professionals || []).length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Profesionales asignados <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(professionals || []).map(p => (
                      <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/20 transition-colors">
                        <Checkbox
                          checked={serviceForm.professionalIds.includes(p.id)}
                          onCheckedChange={(checked) => {
                            setServiceForm(prev => ({
                              ...prev,
                              professionalIds: checked
                                ? [...prev.professionalIds, p.id]
                                : prev.professionalIds.filter(id => id !== p.id),
                            }));
                          }}
                        />
                        <span className="text-sm truncate">{(p as any).emoji || ''} {p.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Si no seleccionás ninguno, el servicio estará disponible con todos.</p>
                </div>
              )}
            </div>
            {serviceForm.serviceType === 'whatsapp' && (
              <p className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3">
                Este servicio mostrará un botón de WhatsApp. Asegurate de tener el número configurado arriba.
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleServiceSubmit} className="flex-1">
                {editingServiceId ? "Actualizar Servicio" : "Agregar Servicio"}
              </Button>
              {editingServiceId && (
                <Button variant="ghost" onClick={() => { setEditingServiceId(null); setServiceForm(emptyForm); }}>Cancelar</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CLASES ── */}
      {!features.hasClasses ? (
        <LockedFeature featureName="Clases con Cupo" requiredPlan="pro" />
      ) : !(salon as any)?.classesEnabled ? null : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-violet-600" /> Clases</CardTitle>
          <CardDescription>Franjas horarias grupales con cupo máximo de clientes (ej: yoga, pilates).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {(services || []).filter(s => getServiceType(s) === 'clase').map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold truncate">{s.name}</p>
                    <Badge variant="outline" className="text-[10px] px-2 py-0 border border-violet-300 bg-violet-100 text-violet-700">Clase</Badge>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                  <p className="text-xs font-semibold mt-0.5">${s.price.toLocaleString('es-AR')} · {s.duration}min · {(s as any).capacity || 0} cupos</p>
                  {(s as any).address && <p className="text-xs text-muted-foreground truncate mt-0.5">📍 {(s as any).address}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditingClassId(s.id);
                    setClassForm({ name: s.name, description: s.description, price: s.price, duration: s.duration, capacity: (s as any).capacity || 0, address: (s as any).address || "", professionalIds: (s as any).professionalIds || [] });
                  }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteService(s.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {(services || []).filter(s => getServiceType(s) === 'clase').length === 0 && (
              <p className="text-sm text-muted-foreground">Todavía no agregaste ninguna clase.</p>
            )}
          </div>

          <div className="p-4 border rounded-xl bg-muted/10 space-y-4">
            <p className="text-sm font-bold">{editingClassId ? "Editar Clase" : "Agregar Clase"}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Nombre</Label>
                <Input placeholder="Ej: Yoga Grupal" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input placeholder="Descripción de la clase" value={classForm.description} onChange={e => setClassForm({ ...classForm, description: e.target.value })} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Dirección <span className="text-muted-foreground text-xs">(opcional — si no la cargás, se usa la del negocio)</span></Label>
                <Input placeholder="Ej: Plaza San Martín, frente al club" value={classForm.address} onChange={e => setClassForm({ ...classForm, address: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Precio ($)</Label>
                <Input type="number" value={classForm.price || ""} onChange={e => setClassForm({ ...classForm, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Duración (min)</Label>
                <Input type="number" value={classForm.duration || ""} onChange={e => setClassForm({ ...classForm, duration: Number(e.target.value) })} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Cupos <span className="text-muted-foreground text-xs">(cantidad de clientes por horario)</span></Label>
                <Input type="number" min={1} placeholder="Ej: 10" value={classForm.capacity || ""} onChange={e => setClassForm({ ...classForm, capacity: Number(e.target.value) })} />
              </div>
              {(professionals || []).length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Profesionales asignados <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(professionals || []).map(p => (
                      <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/20 transition-colors">
                        <Checkbox
                          checked={classForm.professionalIds.includes(p.id)}
                          onCheckedChange={(checked) => {
                            setClassForm(prev => ({
                              ...prev,
                              professionalIds: checked
                                ? [...prev.professionalIds, p.id]
                                : prev.professionalIds.filter(id => id !== p.id),
                            }));
                          }}
                        />
                        <span className="text-sm truncate">{(p as any).emoji || ''} {p.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Si no seleccionás ninguno, la clase estará disponible con todos.</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleClassSubmit} className="flex-1">
                {editingClassId ? "Actualizar Clase" : "Agregar Clase"}
              </Button>
              {editingClassId && (
                <Button variant="ghost" onClick={() => { setEditingClassId(null); setClassForm(emptyClassForm); }}>Cancelar</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* ── SUCURSALES ── */}
      {features.maxProfessionals >= 999999 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Sucursales</CardTitle>
            <CardDescription>Gestioná múltiples sucursales. Cada una tiene sus propios profesionales y horarios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branches.length > 0 && (
              <div className="grid gap-2">
                {branches.map(branch => (
                  <div key={branch.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                    <Building2 className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-grow min-w-0">
                      <p className="font-bold truncate">{branch.name}</p>
                      {branch.address && <p className="text-xs text-muted-foreground truncate">{branch.address}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingBranchId(branch.id);
                        setBranchForm({ name: branch.name, address: branch.address || "", professionalIds: branch.professionalIds || [], weekSchedule: branch.weekSchedule || emptyBranchSchedule });
                      }}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteBranch(branch.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="p-4 border rounded-xl bg-muted/10 space-y-4">
              <p className="text-sm font-bold">{editingBranchId ? "Editar Sucursal" : "Agregar Sucursal"}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nombre</Label>
                  <Input placeholder="Ej: Sucursal Centro" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Dirección <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                  <Input placeholder="Ej: Av. Corrientes 1234" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
                </div>
              </div>

              {/* Profesionales */}
              {(professionals || []).length > 0 && (
                <div className="space-y-2">
                  <Label>Profesionales de esta sucursal</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(professionals || []).map(p => (
                      <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/20 transition-colors">
                        <Checkbox
                          checked={branchForm.professionalIds.includes(p.id)}
                          onCheckedChange={checked => setBranchForm(prev => ({
                            ...prev,
                            professionalIds: checked
                              ? [...prev.professionalIds, p.id]
                              : prev.professionalIds.filter(id => id !== p.id)
                          }))}
                        />
                        <span className="text-sm truncate">{(p as any).emoji || ''} {p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Horarios por día */}
              <div className="space-y-2">
                <Label>Horarios de esta sucursal</Label>
                <div className="space-y-2">
                  {DIAS.map((dia, i) => {
                    const key = DIAS_KEY[i];
                    const d = branchForm.weekSchedule[key] || { enabled: false, slots: [] };
                    return (
                      <div key={key} className={cn("rounded-xl border p-3 transition-all", d.enabled ? "bg-card" : "bg-muted/20")}>
                        <div className="flex items-center gap-3 mb-2">
                          <Switch checked={d.enabled} onCheckedChange={v => setBranchForm(prev => ({ ...prev, weekSchedule: { ...prev.weekSchedule, [key]: { ...prev.weekSchedule[key], enabled: v } } }))} />
                          <span className={cn("font-bold text-sm", d.enabled ? "text-foreground" : "text-muted-foreground")}>{dia}</span>
                        </div>
                        {d.enabled && (
                          <div className="space-y-2">
                            {(d.slots || []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {(d.slots || []).map(slot => (
                                  <div key={slot} className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-lg text-xs font-mono">
                                    {slot}
                                    <button onClick={() => setBranchForm(prev => ({ ...prev, weekSchedule: { ...prev.weekSchedule, [key]: { ...prev.weekSchedule[key], slots: prev.weekSchedule[key].slots.filter(s => s !== slot) } } }))} className="ml-1 text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 max-w-xs">
                              <Input
                                placeholder="Ej: 13:00"
                                value={newBranchSlotByDay[key] || ''}
                                onChange={e => {
                                  let val = e.target.value.replace(/[^0-9:]/g, '');
                                  if (val.length === 2 && !val.includes(':')) val = val + ':';
                                  if (val.length > 5) val = val.slice(0, 5);
                                  setNewBranchSlotByDay(prev => ({ ...prev, [key]: val }));
                                }}
                                onKeyDown={e => { if (e.key === 'Enter') addSlotToBranchDay(key); }}
                                className="h-7 text-xs font-mono w-24"
                                maxLength={5}
                              />
                              <Button size="sm" variant="secondary" onClick={() => addSlotToBranchDay(key)} className="h-7 px-2 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Agregar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleBranchSubmit} variant="secondary" className="flex-1" disabled={!branchForm.name}>
                  {editingBranchId ? "Actualizar Sucursal" : "Agregar Sucursal"}
                </Button>
                {editingBranchId && (
                  <Button variant="ghost" onClick={() => { setEditingBranchId(null); setBranchForm({ name: "", address: "", professionalIds: [], weekSchedule: emptyBranchSchedule }); }}>Cancelar</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <LockedFeature featureName="Múltiples Sucursales" requiredPlan="premium" />
      )}

      {/* ── EQUIPO ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Equipo de Trabajo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {(professionals || []).map(p => (
              <div key={p.id} className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center gap-4 p-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xl shrink-0">
                    {(p as any).emoji || p.name.charAt(0)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-bold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.specialty}</p>
                    {(p as any).weekSchedule && (
                      <span className="text-[10px] text-primary font-bold">Horario personalizado</span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Configurar horarios"
                      onClick={() => {
                        if (expandedProfSchedule === p.id) {
                          setExpandedProfSchedule(null);
                        } else {
                          initProfSchedule(p);
                          setExpandedProfSchedule(p.id);
                        }
                      }}
                    >
                      <CalendarClock className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingProfId(p.id); setProfForm(p as any); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => updateProfessionals((professionals || []).filter(i => i.id !== p.id))} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>

                {/* Panel de horarios del profesional */}
                {expandedProfSchedule === p.id && profSchedule[p.id] && (
                  <div className="border-t bg-muted/10 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold flex items-center gap-2"><CalendarClock className="w-4 h-4 text-primary" /> Horario de {p.name}</p>
                      {(p as any).weekSchedule && (
                        <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => clearProfSchedule(p.id)}>
                          Usar horario del negocio
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Si configurás horario propio, reemplaza al horario general del negocio solo para este profesional.</p>
                    <div className="grid gap-2">
                      {DIAS_KEY.map(dayKey => {
                        const dayNames: Record<string, string> = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };
                        const d = profSchedule[p.id][dayKey] || { enabled: false, slots: [] };
                        return (
                          <div key={dayKey} className="rounded-lg border bg-card p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={d.enabled}
                                  onChange={() => toggleProfDay(p.id, dayKey)}
                                  className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm font-semibold">{dayNames[dayKey]}</span>
                              </label>
                              <span className="text-xs text-muted-foreground">{d.slots.length} horario{d.slots.length !== 1 ? 's' : ''}</span>
                            </div>
                            {d.enabled && (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-1">
                                  {d.slots.map(slot => (
                                    <span key={slot} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                      {slot}
                                      <button onClick={() => removeProfSlot(p.id, dayKey, slot)}><X className="w-3 h-3" /></button>
                                    </span>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="time"
                                    value={profSlotInput[p.id]?.[dayKey] || ''}
                                    onChange={e => setProfSlotInput(prev => ({ ...prev, [p.id]: { ...prev[p.id], [dayKey]: e.target.value } }))}
                                    className="text-sm border rounded-md px-2 py-1 bg-background"
                                  />
                                  <Button size="sm" variant="outline" onClick={() => addProfSlot(p.id, dayKey)}>
                                    <Plus className="w-3 h-3 mr-1" /> Agregar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveProfSchedule(p.id)} className="flex-1">Guardar horarios</Button>
                      <Button variant="ghost" onClick={() => setExpandedProfSchedule(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-4 border rounded-xl bg-muted/10 space-y-3">
            <p className="text-sm font-bold">{editingProfId ? "Editar Profesional" : "Agregar Profesional"}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nombre</Label><Input placeholder="Nombre" value={profForm.name} onChange={e => setProfForm({ ...profForm, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Especialidad</Label><Input placeholder="Ej: Estilista" value={profForm.specialty} onChange={e => setProfForm({ ...profForm, specialty: e.target.value })} /></div>
              <div className="space-y-1 md:col-span-2">
                <Label>Emoji representativo</Label>
                <Input placeholder="Ej: ✂️  💇  🧔  💆  💅  👨‍⚕️" value={(profForm as any).emoji || ""} onChange={e => setProfForm({ ...profForm, emoji: e.target.value } as any)} className="text-xl" />
                <p className="text-xs text-muted-foreground mt-1">Pegá un emoji que represente a este profesional.</p>
              </div>
            </div>
            {!editingProfId && (professionals || []).length >= features.maxProfessionals && (
              <p className="text-sm text-destructive font-medium">Límite de profesionales alcanzado para tu plan.</p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleProfSubmit}
                variant="secondary"
                className="flex-1"
                disabled={!editingProfId && (professionals || []).length >= features.maxProfessionals}
              >
                {editingProfId ? "Actualizar" : "Agregar al Equipo"}
              </Button>
              {editingProfId && <Button variant="ghost" onClick={() => { setEditingProfId(null); setProfForm({ name: "", specialty: "", avatarUrl: "", avatarHint: "", emoji: "" } as any); }}>Cancelar</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}