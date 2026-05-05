
"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { Loader2, Store, Users, ExternalLink, Calendar, Search, ShieldCheck, Copy, Check, Mail, RefreshCw, Trash2, ShieldAlert, LogOut, Info, ExternalLink as LinkIcon } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState } from "react";
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

export default function SuperAdminPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);
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

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      toast({ title: "ID Copiado" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
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

  const firebaseConsoleUrl = "https://console.firebase.google.com/project/studio-6398913436-7a565/firestore/data";

  if (isUserLoading || isAdminChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium animate-pulse uppercase tracking-widest">Verificando Credenciales Maestras...</p>
        </div>
      </div>
    );
  }

  if (!globalAdminData) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full text-center shadow-2xl border-primary/20 bg-card overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="pt-10">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <ShieldAlert className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-black font-headline tracking-tighter uppercase italic">Configuración de Acceso Maestro</CardTitle>
              <CardDescription className="text-lg">
                Este paso se realiza una única vez para activar tu panel global de por vida.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-10 px-8">
              <div className="bg-muted/50 p-6 rounded-2xl border border-dashed border-primary/20 text-left space-y-4">
                <div className="flex items-center gap-4 p-4 bg-background rounded-xl border">
                    <Mail className="w-5 h-5 text-primary" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tu Cuenta Actual</p>
                        <p className="font-mono text-xs font-bold">{user?.email || 'Usuario Autenticado'}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">1. Copia tu ID Maestro</p>
                    <div className="flex items-center gap-2 bg-background border-2 border-primary/20 rounded-xl p-3 font-mono text-sm">
                        <span className="truncate flex-1 text-primary font-black">{user?.uid}</span>
                        <Button onClick={copyUid} size="sm" variant="secondary" className="h-8">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-3 bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                        <Info className="w-3 h-3" /> 2. Pasos en Firebase Console
                    </p>
                    <ol className="text-[11px] leading-relaxed list-decimal list-inside space-y-2 font-medium">
                        <li>Entra aquí: <a href={firebaseConsoleUrl} target="_blank" className="text-primary font-bold underline inline-flex items-center gap-1">Ir a Firebase Console <LinkIcon className="w-3 h-3" /></a></li>
                        <li>Crea la colección: <code className="bg-primary/20 px-1 rounded font-bold">globalAdmins</code></li>
                        <li>Crea un documento con ID: <code className="bg-primary/20 px-1 rounded font-bold">pega tu ID copiado</code></li>
                        <li>Añade el campo: <code className="bg-primary/20 px-1 rounded">role</code> | Valor: <code className="bg-primary/20 px-1 rounded">admin</code></li>
                        <li>Guarda y haz clic en "Verificar Acceso" abajo.</li>
                    </ol>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => window.location.reload()} className="flex-1 h-14 rounded-2xl font-black text-lg shadow-xl uppercase italic">
                  <RefreshCw className="mr-2 h-5 w-5" /> Verificar Acceso
                </Button>
                <Button onClick={handleLogout} variant="outline" className="flex-1 h-14 rounded-2xl font-bold">
                  <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

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
          <div className="flex items-center gap-4 bg-primary text-primary-foreground px-8 py-4 rounded-2xl shadow-2xl">
            <Store className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="font-black text-3xl leading-none">{allSalons?.length || 0}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Negocios Registrados</span>
            </div>
          </div>
        </div>

        <div className="relative mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6" />
          <Input 
            placeholder="Buscar por nombre de negocio o ID..." 
            className="pl-14 h-16 bg-card border-2 rounded-2xl text-lg shadow-sm focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isSalonsLoading ? (
          <div className="flex flex-col items-center justify-center p-32 space-y-4">
            <Loader2 className="w-16 h-16 animate-spin text-primary opacity-20" />
            <p className="text-muted-foreground font-medium uppercase tracking-widest">Consultando base de datos...</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredSalons.map((salon) => (
              <Card key={salon.id} className="group hover:border-primary transition-all duration-300 shadow-sm rounded-3xl overflow-hidden border-muted bg-card">
                <CardHeader className="pb-4 bg-muted/5 group-hover:bg-primary/5 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Store className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="text-[10px] py-1 px-3 uppercase font-black tracking-widest border-primary/20 bg-background">
                      ID: {salon.id}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-black font-headline leading-tight group-hover:text-primary transition-colors">{salon.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 font-medium">
                    <Calendar className="w-4 h-4 text-primary" />
                    {salon.createdAt?.toDate ? format(salon.createdAt.toDate(), "dd MMM yyyy", { locale: es }) : 'Registro Reciente'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-border/50">
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
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" size="lg" className="flex-1 rounded-2xl font-bold hover:bg-primary hover:text-primary-foreground" asChild>
                      <Link href={`/book/${salon.id}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" /> Ver Web
                      </Link>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="lg" className="rounded-2xl text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-black uppercase italic">¿Eliminar Negocio?</AlertDialogTitle>
                          <AlertDialogDescription className="text-lg">
                            Esta acción borrará permanentemente a <strong>{salon.name}</strong> y todos sus servicios. No se puede deshacer.
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
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
