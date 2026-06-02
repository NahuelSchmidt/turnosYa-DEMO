"use client";
import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSettings } from "@/components/dashboard/AdminSettings";
import { ProfessionalAgenda } from "@/components/dashboard/ProfessionalAgenda";
import { DollarSign, Calendar, Users, Activity, LogIn, LogOut, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { PlanBadge } from "@/components/ui/plan-badge";
import { LockedFeature } from "@/components/ui/locked-feature";
import { usePlan } from "@/hooks/use-plan";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUser, useAuth as useFirebaseAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { collection, query, where } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppointments } from "@/hooks/use-appointments";
import { useServices } from "@/hooks/use-services";
import { format, subMonths, startOfMonth, endOfMonth, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { parseFirestoreDate } from "@/lib/utils";
import { Trophy, Clock, Star, TrendingUp, Phone, MessageCircle } from "lucide-react";

const chartConfig = {
  Ingresos: { label: "Ingresos ($)", color: "hsl(var(--primary))" },
  Turnos: { label: "Turnos", color: "hsl(var(--muted-foreground))" },
};

// Genera opciones de meses: "todo", mes actual y los 11 anteriores
function getMonthOptions() {
  const options: { value: string; label: string }[] = [{ value: 'all', label: 'Todo el tiempo' }];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), i);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase()),
    });
  }
  return options;
}

function StatsSection({ tenantId }: { tenantId: string }) {
  const { appointments, loading } = useAppointments(tenantId);
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const { chartData, totalRevenue, totalAppointments, uniqueClients, occupancyRate } = useMemo(() => {
    if (loading || !appointments.length) return { chartData: [], totalRevenue: 0, totalAppointments: 0, uniqueClients: 0, occupancyRate: 0 };
    const now = new Date();
    const allDone = appointments.filter(a =>
      (a.status === 'confirmed' && parseFirestoreDate(a.startTime) < now) ||
      a.status === 'completed'
    );

    // Filtrar por período seleccionado
    const confirmed = period === 'all' ? allDone : allDone.filter(a => {
      return format(parseFirestoreDate(a.startTime), 'yyyy-MM') === period;
    });

    // Gráfico: si es "todo" muestra últimos 6 meses, si es un mes muestra los días
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM', { locale: es }) };
    });
    const chartData = months.map(({ start, end, label }) => {
      const monthApts = allDone.filter(a => { const d = parseFirestoreDate(a.startTime); return d >= start && d <= end; });
      return { month: label.charAt(0).toUpperCase() + label.slice(1), Ingresos: monthApts.reduce((s, a) => s + (a.total || 0), 0), Turnos: monthApts.length };
    });

    return {
      chartData,
      totalRevenue: confirmed.reduce((s, a) => s + (a.total || 0), 0),
      totalAppointments: confirmed.length,
      uniqueClients: new Set(confirmed.map(a => a.customerPhone)).size,
      occupancyRate: appointments.length > 0 ? Math.round((confirmed.length / appointments.length) * 100) : 0,
    };
  }, [appointments, loading, period]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="grid gap-6 overflow-hidden">
      {/* Selector de período */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-muted-foreground shrink-0">Período:</label>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          {[
            { icon: DollarSign, label: "Ingresos", value: `$${totalRevenue.toLocaleString('es-AR')}` },
            { icon: Calendar, label: "Turnos", value: totalAppointments },
            { icon: Users, label: "Clientes", value: uniqueClients },
            { icon: Activity, label: "Ocupación", value: `${occupancyRate}%` },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-2 p-2 md:p-3 bg-muted/30 rounded-xl">
              <stat.icon className="w-6 h-6 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">{stat.label}</p>
                <p className="text-base md:text-lg font-black">{stat.value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {chartData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader><CardTitle className="text-base md:text-xl">Tendencias (últimos 6 meses)</CardTitle></CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ChartContainer config={chartConfig} className="h-[200px] md:h-[300px] w-full overflow-hidden">
              <BarChart data={chartData} margin={{ right: 10, left: -10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={8} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" orientation="left" width={45} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="Ingresos" fill="var(--color-Ingresos)" radius={4} yAxisId="left" />
                <Bar dataKey="Turnos" fill="var(--color-Turnos)" radius={4} yAxisId="left" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AdvancedStatsSection({ tenantId }: { tenantId: string }) {
  const { appointments, loading } = useAppointments(tenantId);
  const { services } = useServices(tenantId);
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const { topClients, topServices, peakHours, peakDays } = useMemo(() => {
    if (loading || !appointments.length) return { topClients: [], topServices: [], peakHours: [], peakDays: [] };

    const all = appointments.filter(a => a.status === 'confirmed' || a.status === 'completed');
    const confirmed = period === 'all' ? all : all.filter(a =>
      format(parseFirestoreDate(a.startTime), 'yyyy-MM') === period
    );

    // Top clientes
    const clientMap: Record<string, { name: string; count: number; total: number }> = {};
    confirmed.forEach(a => {
      const key = a.customerPhone || a.customerName;
      if (!clientMap[key]) clientMap[key] = { name: a.customerName, count: 0, total: 0 };
      clientMap[key].count++;
      clientMap[key].total += a.total || 0;
    });
    const topClients = Object.values(clientMap).sort((a, b) => b.count - a.count).slice(0, 5);

    // Servicios más pedidos
    const serviceMap: Record<string, { name: string; count: number }> = {};
    confirmed.forEach(a => {
      (a.serviceIds || []).forEach((id: string) => {
        const svc = services?.find(s => s.id === id);
        const name = svc?.name || id;
        if (!serviceMap[id]) serviceMap[id] = { name, count: 0 };
        serviceMap[id].count++;
      });
    });
    const topServices = Object.values(serviceMap).sort((a, b) => b.count - a.count).slice(0, 5);

    // Horas pico
    const hourMap: Record<number, number> = {};
    confirmed.forEach(a => {
      const h = parseFirestoreDate(a.startTime).getHours();
      hourMap[h] = (hourMap[h] || 0) + 1;
    });
    const peakHours = Object.entries(hourMap)
      .map(([h, count]) => ({ hour: `${h}:00`, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    // Días más ocupados
    const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayMap: Record<number, number> = {};
    confirmed.forEach(a => {
      const d = parseFirestoreDate(a.startTime).getDay();
      dayMap[d] = (dayMap[d] || 0) + 1;
    });
    const peakDays = Object.entries(dayMap)
      .map(([d, count]) => ({ day: DIAS[Number(d)], count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    return { topClients, topServices, peakHours, peakDays };
  }, [appointments, services, loading]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="grid gap-6 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Estadísticas Avanzadas</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-muted-foreground shrink-0">Período:</label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">

        {/* Top clientes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Clientes más frecuentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topClients.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos aún.</p> : topClients.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-muted-foreground w-5">#{i + 1}</span>
                  <span className="text-sm font-bold truncate">{c.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold">{c.count} turno{c.count !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">${c.total.toLocaleString('es-AR')}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Servicios más pedidos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-primary" /> Servicios más pedidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topServices.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos aún.</p> : topServices.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-muted-foreground w-5">#{i + 1}</span>
                  <span className="text-sm font-bold truncate">{s.name}</span>
                </div>
                <span className="text-xs font-bold shrink-0">{s.count} vece{s.count !== 1 ? 's' : 'z'}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Horas pico */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Horas pico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {peakHours.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos aún.</p> : peakHours.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <span className="text-xs font-black text-muted-foreground w-5">#{i + 1}</span>
                <span className="text-sm font-bold">{h.hour}hs</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${(h.count / peakHours[0].count) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{h.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Días más ocupados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Días más ocupados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {peakDays.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos aún.</p> : peakDays.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <span className="text-xs font-black text-muted-foreground w-5">#{i + 1}</span>
                <span className="text-sm font-bold">{d.day}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${(d.count / peakDays[0].count) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{d.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function ClientsSection({ tenantId }: { tenantId: string }) {
  const { appointments, loading } = useAppointments(tenantId);
  const [search, setSearch] = useState("");

  const clients = useMemo(() => {
    if (loading || !appointments.length) return [];
    const map: Record<string, { name: string; phone: string; visits: number; total: number; lastVisit: Date }> = {};
    appointments
      .filter(a => a.status === 'confirmed' || a.status === 'completed')
      .forEach(a => {
        const key = a.customerPhone || a.customerName;
        const date = parseFirestoreDate(a.startTime);
        if (!map[key]) map[key] = { name: a.customerName, phone: a.customerPhone || '', visits: 0, total: 0, lastVisit: date };
        map[key].visits++;
        map[key].total += a.total || 0;
        if (date > map[key].lastVisit) map[key].lastVisit = date;
      });
    return Object.values(map).sort((a, b) => b.visits - a.visits);
  }, [appointments, loading]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{clients.length} clientes únicos</p>
      </div>
      <input
        placeholder="Buscar por nombre o teléfono..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin clientes aún.</p>
        ) : filtered.map((c, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-black text-primary">{c.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.phone || 'Sin teléfono'}</p>
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              <p className="text-xs font-bold">{c.visits} visita{c.visits !== 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground">${c.total.toLocaleString('es-AR')}</p>
              <p className="text-xs text-muted-foreground">{format(c.lastVisit, "dd/MM/yy", { locale: es })}</p>
            </div>
            {c.phone && (
              <a
                href={`https://wa.me/54${c.phone.replace(/\D/g,'')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#25D366] hover:opacity-70 shrink-0"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const salonsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || user.isAnonymous) return null;
    return query(collection(db, "salons"), where(`adminMembers.${user.uid}`, "==", true));
  }, [db, user?.uid, user?.isAnonymous]);

  const { data: userSalons, isLoading: isSalonsLoading } = useCollection(salonsQuery);
  const currentSalon = userSalons?.[0];
  const tenantId = currentSalon?.id;

  const { plan, features } = usePlan(tenantId || '');

  const { appointments: allAppointments } = useAppointments(tenantId || '');
  const hasTodayConfirmed = useMemo(
    () => allAppointments.some(a => isToday(parseFirestoreDate(a.startTime)) && a.status === 'confirmed'),
    [allAppointments]
  );

  const handleLogin = async () => {
    if (!email || !password) { setError("Completá todos los campos."); return; }
    setIsLoggingIn(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Credenciales inválidas. Reintentá.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (isUserLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  const isRealUser = user && !user.isAnonymous;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <h1 className="text-3xl font-bold mb-8 font-headline">Panel de Control</h1>

        {/* No logueado → login */}
        {!isRealUser ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Acceso para Negocios</CardTitle>
              <CardDescription>Ingresá con las credenciales que te proporcionamos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@negocio.com" className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="h-12" />
              </div>
              {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
              <Button onClick={handleLogin} disabled={isLoggingIn} className="w-full h-12 font-bold">
                {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Ingresar
              </Button>
              <p className="text-center text-xs text-muted-foreground">¿No tenés acceso? Contactá al administrador.</p>
            </CardContent>
          </Card>

        ) : isSalonsLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

        ) : !tenantId ? (
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle>Sin negocio asignado</CardTitle>
              <CardDescription>Tu cuenta no tiene un negocio vinculado. Contactá al administrador.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
              </Button>
            </CardContent>
          </Card>

        ) : (
          /* Panel del negocio */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30 p-4 rounded-lg border">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-headline">{currentSalon?.name}</h2>
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <PlanBadge plan={plan} />
                </div>
                <p className="text-xs text-muted-foreground uppercase">ID: {tenantId}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
              </Button>
            </div>

            <Tabs defaultValue="agenda">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="agenda" className="flex-1">
                  <span className="flex items-center gap-1.5">
                    Agenda
                    {hasTodayConfirmed && (
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="clients" className="flex-1">Clientes</TabsTrigger>
                <TabsTrigger value="stats" className="flex-1">Métricas</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">
                  <span className="sm:hidden">Ajustes</span>
                  <span className="hidden sm:inline">Ajustes y Link</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="agenda"><ProfessionalAgenda tenantId={tenantId} /></TabsContent>
              <TabsContent value="clients">
                {features.hasMetrics
                  ? <ClientsSection tenantId={tenantId} />
                  : <LockedFeature featureName="Lista de Clientes" requiredPlan="pro" />}
              </TabsContent>
              <TabsContent value="stats">
                {features.hasMetrics ? (
                  <>
                    <StatsSection tenantId={tenantId} />
                    {plan === 'premium'
                      ? <AdvancedStatsSection tenantId={tenantId} />
                      : <LockedFeature featureName="Estadísticas Avanzadas (clientes frecuentes, servicios más pedidos, horas pico)" requiredPlan="premium" />
                    }
                  </>
                ) : (
                  <LockedFeature featureName="Métricas y Estadísticas" requiredPlan="pro" />
                )}
              </TabsContent>
              <TabsContent value="settings"><AdminSettings tenantId={tenantId} /></TabsContent>
            </Tabs>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
