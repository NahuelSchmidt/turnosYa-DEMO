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
import { format, subMonths, startOfMonth, endOfMonth, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { parseFirestoreDate } from "@/lib/utils";

const chartConfig = {
  Ingresos: { label: "Ingresos ($)", color: "hsl(var(--primary))" },
  Turnos: { label: "Turnos", color: "hsl(var(--muted-foreground))" },
};

function StatsSection({ tenantId }: { tenantId: string }) {
  const { appointments, loading } = useAppointments(tenantId);
  const { chartData, totalRevenue, totalAppointments, uniqueClients, occupancyRate } = useMemo(() => {
    if (loading || !appointments.length) return { chartData: [], totalRevenue: 0, totalAppointments: 0, uniqueClients: 0, occupancyRate: 0 };
    const now = new Date();
    // Solo turnos ya realizados (fecha pasada) o completados
    const confirmed = appointments.filter(a => 
      (a.status === 'confirmed' && parseFirestoreDate(a.startTime) < now) ||
      a.status === 'completed'
    );
    // Turnos futuros confirmados (para métricas de agenda)
    const upcoming = appointments.filter(a => a.status === 'confirmed' && parseFirestoreDate(a.startTime) >= now);
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM', { locale: es }) };
    });
    const chartData = months.map(({ start, end, label }) => {
      const monthApts = confirmed.filter(a => { const d = parseFirestoreDate(a.startTime); return d >= start && d <= end; });
      return { month: label.charAt(0).toUpperCase() + label.slice(1), Ingresos: monthApts.reduce((s, a) => s + (a.total || 0), 0), Turnos: monthApts.length };
    });
    return {
      chartData,
      totalRevenue: confirmed.reduce((s, a) => s + (a.total || 0), 0),
      totalAppointments: confirmed.length,
      uniqueClients: new Set(confirmed.map(a => a.customerPhone)).size,
      occupancyRate: appointments.length > 0 ? Math.round((confirmed.length / appointments.length) * 100) : 0,
    };
  }, [appointments, loading]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          {[
            { icon: DollarSign, label: "Ingresos", value: `$${totalRevenue.toLocaleString('es-AR')}` },
            { icon: Calendar, label: "Turnos", value: totalAppointments },
            { icon: Users, label: "Clientes", value: uniqueClients },
            { icon: Activity, label: "Ocupación", value: `${occupancyRate}%` },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
              <stat.icon className="w-6 h-6 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">{stat.label}</p>
                <p className="text-lg font-black">{stat.value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Tendencias (últimos 6 meses)</CardTitle></CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={chartData} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={8} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} width={52} />
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
                <TabsTrigger value="stats" className="flex-1">Métricas</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">
                  <span className="sm:hidden">Ajustes</span>
                  <span className="hidden sm:inline">Ajustes y Link</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="agenda"><ProfessionalAgenda tenantId={tenantId} /></TabsContent>
              <TabsContent value="stats">
                {features.hasMetrics
                  ? <StatsSection tenantId={tenantId} />
                  : <LockedFeature featureName="Métricas y Estadísticas" requiredPlan="pro" />}
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
