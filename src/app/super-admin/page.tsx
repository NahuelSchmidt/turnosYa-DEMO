"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { Loader2, Store, ExternalLink, Calendar, Search, ShieldCheck, Trash2, ShieldAlert, LogOut, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const planLabels: Record<string, { label: string; className: string }> = {
  basic: { label: 'Basic', className: 'bg-gray-100 text-gray-600 border-gray-300' },
  pro: { label: 'Pro', className: 'bg-blue-100 text-blue-700 border-blue-300' },
  premium: { label: 'Premium ⭐', className: 'bg-amber-100 text-amber-700 border-amber-300' },
};

export default function SuperAdminPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const globalAdminRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "globalAdmins", user.uid);
  }, [db, user?.uid]);

  const { data: globalAdminData, isLoading: isAdminChecking } = useDoc(globalAdminRef);

  const salonsQuery = useMemoFirebase(() => {
    if (!db || !globalAdminData) return null;
    return query(collection(db, "salons"), orderBy("createdAt", "desc"));
  }, [db, globalAdminData]);

  const { data: allSalons, isLoading: isSalonsLoading } = useCollection(salonsQuery);

  const filteredSalons = allSalons?.filter(salon =>
    salon.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salon.id?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const now = new Date();

  const getSubscriptionStatus = (salon: any) => {
    const expiresAt = salon.subscriptionExpiresAt?.toDate?.() || (salon.subscriptionExpiresAt ? new Date(salon.subscriptionExpiresAt) : null);
    if (!expiresAt) return { status: 'unknown', daysLeft: null, expiresAt: null };
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { status: 'expired', daysLeft, expiresAt };
    if (daysLeft <= 7) return { status: 'expiring', daysLeft, expiresAt };
    return { status: 'active', daysLeft, expiresAt };
  };

  const stats = useMemo(() => {
    const salons = allSalons || [];
    return {
      total: salons.length,
      active: salons.filter(s => getSubscriptionStatus(s).status === 'active').length,
      expiring: salons.filter(s => getSubscriptionStatus(s).status === 'expiring').length,
      expired: salons.filter(s => getSubscriptionStatus(s).status === 'expired').length,
      byPlan: {
        basic: salons.filter(s => (s.plan || 'basic') === 'basic').length,
        pro: salons.filter(s => s.plan === 'pro').length,
        premium: salons.filter(s => s.plan === 'premium').length,
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSalons]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const handleDeleteSalon = (salonId: string, salonName: string) => {
    if (!db) return;
    const salonDocRef = doc(db, "salons", salonId);
    deleteDocumentNonBlocking(salonDocRef);
    toast({
      title: "Negocio Eliminado",
      description: `${salonName} ha sido removido de la plataforma.`,
    });
  };

  const handleToggleActive = (salonId: string, salonName: string, isActive: boolean) => {
    if (!db) return;
    const salonDocRef = doc(db, "salons", salonId);
    updateDocumentNonBlocking(salonDocRef, {
      isActive: !isActive,
      updatedAt: serverTimestamp(),
    });
    toast({
      title: isActive ? "Cuenta Desactivada" : "Cuenta Reactivada",
      description: isActive
        ? `${salonName} fue desactivado. Sus datos se conservan y puede reactivarse cuando quiera.`
        : `${salonName} volvió a tener acceso al panel y a su página de reservas.`,
    });
  };

  // Cargando
  if (isUserLoading || isAdminChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // No es admin → pantalla de acceso denegado, sin mostrar ningún UID
  if (!globalAdminData) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center shadow-2xl">
            <CardHeader className="pt-10">
              <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                <ShieldAlert className="w-10 h-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-black">Acceso Denegado</CardTitle>
              <CardDescription className="text-base mt-2">
                No tenés permisos para acceder a esta sección.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-10 flex flex-col gap-3">
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Volver al Inicio</Link>
              </Button>
              {user && !user.isAnonymous && (
                <Button variant="ghost" onClick={handleLogout} className="w-full text-muted-foreground">
                  <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Es admin → panel completo
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-[0.2em]">
                <ShieldCheck className="w-3 h-3 mr-1" /> Acceso Maestro Activo
              </Badge>
            </div>
            <h1 className="text-5xl font-black font-headline tracking-tighter mb-2 uppercase italic">Panel de Control Global</h1>
            <p className="text-muted-foreground text-lg">Administración centralizada de todos los negocios.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-3 bg-primary text-primary-foreground px-6 py-3 rounded-2xl shadow-2xl">
              <Store className="w-6 h-6" />
              <div><span className="font-black text-2xl">{stats.total}</span><p className="text-[10px] uppercase opacity-80">Total</p></div>
            </div>
            <div className="flex items-center gap-3 bg-green-600 text-white px-6 py-3 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
              <div><span className="font-black text-2xl">{stats.active}</span><p className="text-[10px] uppercase opacity-80">Activos</p></div>
            </div>
            {stats.expiring > 0 && (
              <div className="flex items-center gap-3 bg-orange-500 text-white px-6 py-3 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
                <div><span className="font-black text-2xl">{stats.expiring}</span><p className="text-[10px] uppercase opacity-80">Por vencer</p></div>
              </div>
            )}
            {stats.expired > 0 && (
              <div className="flex items-center gap-3 bg-destructive text-white px-6 py-3 rounded-2xl">
                <XCircle className="w-6 h-6" />
                <div><span className="font-black text-2xl">{stats.expired}</span><p className="text-[10px] uppercase opacity-80">Vencidos</p></div>
              </div>
            )}
          </div>
        </div>

        <div className="relative mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
          <Input
            placeholder="Buscar por nombre de negocio o ID..."
            className="pl-14 h-16 bg-card border-2 rounded-2xl text-lg shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isSalonsLoading ? (
          <div className="flex justify-center p-32">
            <Loader2 className="w-16 h-16 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredSalons.map((salon) => {
              const sub = getSubscriptionStatus(salon);
              const isActive = salon.isActive !== false;
              return (
              <Card key={salon.id} className={`group hover:border-primary transition-all duration-300 shadow-sm rounded-3xl overflow-hidden ${!isActive ? 'border-muted-foreground/30 opacity-70' : sub.status === 'expired' ? 'border-destructive/50' : sub.status === 'expiring' ? 'border-orange-400/50' : ''}`}>
                <CardHeader className="pb-4 bg-muted/5 group-hover:bg-primary/5 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <Store className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="text-[10px] py-1 px-3 uppercase font-black tracking-widest">
                      ID: {salon.id}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-2xl font-black font-headline leading-tight group-hover:text-primary transition-colors">{salon.name}</CardTitle>
                    <Badge variant="outline" className={`text-[10px] py-0.5 px-2 font-black ${planLabels[salon.plan || 'basic'].className}`}>
                      {planLabels[salon.plan || 'basic'].label}
                    </Badge>
                    {!isActive && (
                      <Badge variant="outline" className="text-[10px] py-0.5 px-2 font-black bg-muted text-muted-foreground border-muted-foreground/30">
                        <PowerOff className="w-3 h-3 mr-1" /> Desactivado
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2 font-medium">
                    <Calendar className="w-4 h-4 text-primary" />
                    {salon.createdAt?.toDate ? format(salon.createdAt.toDate(), "dd MMM yyyy", { locale: es }) : 'Registro Reciente'}
                  </CardDescription>
                  {/* Vencimiento */}
                  {sub.expiresAt && (
                    <div className={`flex items-center gap-1.5 text-xs font-bold mt-1 ${sub.status === 'expired' ? 'text-destructive' : sub.status === 'expiring' ? 'text-orange-500' : 'text-green-600'}`}>
                      {sub.status === 'expired' ? <XCircle className="w-3.5 h-3.5" /> : sub.status === 'expiring' ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {sub.status === 'expired' ? `Vencido hace ${Math.abs(sub.daysLeft!)} días` : sub.status === 'expiring' ? `Vence en ${sub.daysLeft} días` : `Vence ${format(sub.expiresAt, "dd MMM yyyy", { locale: es })}`}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-3 gap-4 py-6 border-y border-border/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Branding</span>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full border shadow-inner" style={{ backgroundColor: salon.primaryColor || '#000' }} />
                        <span className="text-xs font-mono font-bold uppercase">{salon.primaryColor || '#000000'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Agenda</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black">{salon.timeSlots?.length || 0}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">TURNOS</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Plan</span>
                      <Badge variant="outline" className={`text-[10px] py-0.5 px-2 font-black w-fit ${planLabels[salon.plan || 'basic'].className}`}>
                        {planLabels[salon.plan || 'basic'].label}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" size="lg" className="flex-1 rounded-2xl font-bold hover:bg-primary hover:text-primary-foreground" asChild>
                      <Link href={`/book/${salon.id}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" /> Ver Web
                      </Link>
                    </Button>
                    {isActive ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="lg" className="rounded-2xl text-orange-600 hover:bg-orange-500/10">
                            <PowerOff className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black">¿Desactivar Negocio?</AlertDialogTitle>
                            <AlertDialogDescription className="text-lg">
                              <strong>{salon.name}</strong> perderá acceso al panel y su página de reservas quedará bloqueada. No se borra ningún dato y podés reactivarlo cuando quiera retomar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleToggleActive(salon.id, salon.name, true)}
                              className="bg-orange-600 text-white hover:bg-orange-600/90 rounded-xl font-bold"
                            >
                              Desactivar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        variant="ghost"
                        size="lg"
                        className="rounded-2xl text-green-600 hover:bg-green-500/10"
                        onClick={() => handleToggleActive(salon.id, salon.name, false)}
                      >
                        <Power className="h-5 w-5" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="lg" className="rounded-2xl text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-black">¿Eliminar Negocio?</AlertDialogTitle>
                          <AlertDialogDescription className="text-lg">
                            Esta acción borrará permanentemente a <strong>{salon.name}</strong>. No se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteSalon(salon.id, salon.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
                          >
                            Eliminar para Siempre
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}