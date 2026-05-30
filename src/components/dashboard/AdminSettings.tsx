"use client";

import { useState, useEffect } from "react";
import { useServices } from "@/hooks/use-services";
import { useProfessionals } from "@/hooks/use-professionals";
import { useSchedules } from "@/hooks/use-schedules";
import { useSalon } from "@/hooks/use-salon";
import { Service, Professional } from "@/lib/data";
import { LockedFeature } from "@/components/ui/locked-feature";
import { usePlan } from "@/hooks/use-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Users, Briefcase, Link as LinkIcon, Copy, Check, Palette, Plus, ExternalLink, Clock, Loader2, Phone, MessageCircle, Tag, Percent, Ban, Wifi, WifiOff, QrCode, RefreshCw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type ServiceType = 'normal' | 'combo' | 'oferta' | 'whatsapp';

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
  const { services, updateServices } = useServices(tenantId);
  const { professionals, updateProfessionals } = useProfessionals(tenantId);
  const { updateTimeSlots } = useSchedules(tenantId);
  const { toast } = useToast();

  const bookingLink = typeof window !== "undefined" ? `${window.location.origin}/book/${tenantId}` : "";
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [salonForm, setSalonForm] = useState({ name: "", primaryColor: "#000000", whatsappNumber: "", address: "", paymentAlias: "", evolutionInstanceName: "" });
  const [waStatus, setWaStatus] = useState<'loading' | 'authorized' | 'notAuthorized' | 'notConfigured' | 'error'>('notConfigured');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waQrLoading, setWaQrLoading] = useState(false);

  // Horarios por día
  const [weekSchedule, setWeekSchedule] = useState<Record<string, DaySchedule>>(
    Object.fromEntries(DIAS_KEY.map(d => [d, { ...DEFAULT_SCHEDULE, slots: [] }]))
  );
  const [newSlotByDay, setNewSlotByDay] = useState<Record<string, string>>(
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
      });
      if (salon.weekSchedule) {
        setWeekSchedule(salon.weekSchedule);
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

  const checkWaStatus = async () => {
    setWaStatus('loading');
    try {
      const res = await fetch(`/api/whatsapp/status/${tenantId}`);
      const data = await res.json();
      setWaStatus(data.state || 'error');
    } catch {
      setWaStatus('error');
    }
  };

  const loadWaQr = async () => {
    setWaQrLoading(true);
    setWaQr(null);
    try {
      const res = await fetch(`/api/whatsapp/qr/${tenantId}`);
      const data = await res.json();
      // Evolution API devuelve { base64: 'data:image/png;base64,...' } o { state: 'open' }
      if (data.base64) {
        setWaQr(data.base64);
      } else if (data.instance?.state === 'open') {
        setWaStatus('authorized');
      }
    } catch {
      // silencioso
    } finally {
      setWaQrLoading(false);
    }
  };

  // Verificar estado de WhatsApp cuando se carguen las credenciales
  useEffect(() => {
    if (salonForm.evolutionInstanceName) {
      checkWaStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonForm.evolutionInstanceName]);

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

  const [profForm, setProfForm] = useState<Omit<Professional, "id">>({ name: "", specialty: "", avatarUrl: "", avatarHint: "", emoji: "" } as any);
  const [editingProfId, setEditingProfId] = useState<string | null>(null);

  const getServiceType = (s: Service): ServiceType => {
    if ((s as any).type === 'whatsapp') return 'whatsapp';
    if ((s as any).type === 'combo') return 'combo';
    if ((s as any).type === 'oferta') return 'oferta';
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
          <Button onClick={handleSalonUpdate} disabled={isSaving} variant="secondary">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Número
          </Button>
        </CardContent>
      </Card>

      {/* ── WHATSAPP AUTOMÁTICO ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" /> WhatsApp Automático
          </CardTitle>
          <CardDescription>
            Conectá el WhatsApp del negocio para enviar confirmaciones y recordatorios en forma automática.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nombre de instancia */}
          <div className="space-y-1">
            <Label>Nombre de instancia</Label>
            <div className="flex gap-2">
              <Input
                placeholder={`Ej: ${tenantId}`}
                value={salonForm.evolutionInstanceName}
                onChange={e => setSalonForm({ ...salonForm, evolutionInstanceName: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                className="font-mono text-sm"
              />
              <Button
                onClick={async () => {
                  if (!salonForm.evolutionInstanceName) return;
                  await fetch('/api/whatsapp/create-instance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instanceName: salonForm.evolutionInstanceName }),
                  });
                  handleSalonUpdate();
                  setTimeout(() => checkWaStatus(), 1500);
                }}
                disabled={isSaving || !salonForm.evolutionInstanceName}
                variant="secondary"
                size="sm"
              >
                Crear y guardar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Usá el ID del negocio o un nombre único sin espacios.</p>
          </div>

          {/* Estado y QR — solo si hay instancia configurada */}
          {salonForm.evolutionInstanceName && (
            <div className="border rounded-xl p-4 space-y-4 bg-muted/20">
              {/* Status */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {waStatus === 'authorized' ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">WhatsApp conectado</span>
                    </>
                  ) : waStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Verificando estado...</span>
                    </>
                  ) : waStatus === 'notConfigured' ? (
                    <>
                      <WifiOff className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Sin configurar</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">No conectado — escaneá el QR</span>
                    </>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={checkWaStatus} disabled={waStatus === 'loading'}>
                  <RefreshCw className={cn("w-3 h-3 mr-1", waStatus === 'loading' && "animate-spin")} /> Actualizar
                </Button>
              </div>

              {/* QR o botón para mostrarlo */}
              {waStatus !== 'authorized' && (
                <div className="space-y-3">
                  {waQr ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Escaneá este QR con el WhatsApp del negocio:</p>
                      <div className="flex justify-center">
                        <img
                          src={waQr}
                          alt="QR WhatsApp"
                          className="w-48 h-48 rounded-xl border bg-white p-2"
                        />
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        El QR expira en ~20 seg. Si expira, hacé click en "Obtener QR" de nuevo.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={loadWaQr} disabled={waQrLoading} className="flex-1">
                          <RefreshCw className={cn("w-3 h-3 mr-1", waQrLoading && "animate-spin")} /> Renovar QR
                        </Button>
                        <Button variant="default" size="sm" onClick={checkWaStatus} className="flex-1">
                          <Wifi className="w-3 h-3 mr-1" /> Ya escanée
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={loadWaQr} disabled={waQrLoading} className="w-full">
                      {waQrLoading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando QR...</>
                        : <><QrCode className="w-4 h-4 mr-2" /> Obtener QR para escanear</>
                      }
                    </Button>
                  )}
                </div>
              )}

              {waStatus === 'authorized' && (
                <p className="text-xs text-muted-foreground">
                  Los mensajes de confirmación y recordatorios se enviarán automáticamente desde el WhatsApp del negocio.
                </p>
              )}
            </div>
          )}

          {!salonForm.evolutionInstanceName && (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              Creá una instancia en <strong>green-api.com</strong>, copiá el Instance ID y el Token, y guardalos acá. Después el dueño del negocio escanea el QR con su WhatsApp.
            </p>
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

      {/* ── HORARIOS POR DÍA ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Horarios de Atención</CardTitle>
          <CardDescription>Configurá los días y horarios que atendés. Los turnos se generan automáticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Horarios
          </Button>
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
            {(services || []).map(s => {
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

      {/* ── EQUIPO ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Equipo de Trabajo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {(professionals || []).map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl border bg-card">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xl shrink-0">
                  {(p as any).emoji || p.name.charAt(0)}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-bold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.specialty}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingProfId(p.id); setProfForm(p as any); }}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => updateProfessionals((professionals || []).filter(i => i.id !== p.id))} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
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