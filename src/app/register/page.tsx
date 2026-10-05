"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { useAuth } from "@/firebase";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, Loader2, MessageCircle } from "lucide-react";
import { SELF_SIGNUP_TRIAL_DAYS } from "@/lib/subscription-status";

// WhatsApp de Turnify para el que prefiere preguntar antes de registrarse
const HELP_WHATSAPP_URL = `https://wa.me/542216229441?text=${encodeURIComponent("¡Hola! Estoy por probar Turnify y tengo una duda:")}`;

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

/** Meta Pixel: cuenta el contacto por WhatsApp desde la página de registro. */
function trackContact() {
  try { (window as any).fbq?.("track", "Contact", { content_name: "WhatsApp desde registro" }); } catch {}
}

const PERKS = [
  "Tus clientes reservan solos desde tu link",
  "Confirmación y recordatorios automáticos por WhatsApp",
  "Seña al reservar para que no te falten clientes",
  "Te avisamos al celu cada vez que reservan",
  "Sin tarjeta: al terminar la prueba elegís si seguís",
];

export default function RegisterPage() {
  const auth = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ businessName: "", email: "", password: "", whatsappNumber: "", website: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Registro con Google: después de elegir la cuenta solo falta el nombre del negocio
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleRegister = async (body: Record<string, any>) => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/register/google", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo crear la cuenta");
    return data;
  };

  const startGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const { existing } = await googleRegister({ check: true });
      if (existing) { router.push("/dashboard"); return; }
      setGoogleEmail(cred.user.email);
      setForm(f => ({ ...f, businessName: f.businessName || "" }));
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") { /* la cerró */ }
      else if (err?.code === "auth/account-exists-with-different-credential") setError("Ese mail ya tiene una cuenta con clave. Iniciá sesión con tu mail y clave.");
      else if (err?.code === "auth/popup-blocked") setError("El navegador bloqueó la ventana de Google. Permitila o registrate con tu mail.");
      else setError(err?.message || "No se pudo entrar con Google");
    }
    setGoogleLoading(false);
  };

  // Si ya entró con Google antes pero no terminó de crear el negocio, sigue donde quedó
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async user => {
      if (!user || googleEmail || !user.providerData.some(p => p.providerId === "google.com")) return;
      try {
        const { existing } = await googleRegister({ check: true });
        if (existing) router.push("/dashboard");
        else setGoogleEmail(user.email);
      } catch {}
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  const cancelGoogle = async () => {
    await signOut(auth).catch(() => {});
    setGoogleEmail(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (googleEmail) {
      try {
        await googleRegister({ businessName: form.businessName, whatsappNumber: form.whatsappNumber, website: form.website });
        try { (window as any).fbq?.("track", "CompleteRegistration", { content_name: "Prueba Pro 14 días (Google)" }); } catch {}
        router.push("/dashboard");
      } catch (err: any) {
        setError(err.message || "No se pudo crear la cuenta");
        setLoading(false);
      }
      return;
    }
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear la cuenta");
      // Meta Pixel: cuenta el registro para medir los anuncios
      try { (window as any).fbq?.("track", "CompleteRegistration", { content_name: "Prueba Pro 14 días" }); } catch {}
      await signInWithEmailAndPassword(auth, form.email.trim().toLowerCase(), form.password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "No se pudo crear la cuenta");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto items-center">
          <div className="space-y-5">
            <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tighter text-balance">
              Probá Turnify gratis {SELF_SIGNUP_TRIAL_DAYS} días
            </h1>
            <p className="text-muted-foreground text-lg">
              Creá tu cuenta en un minuto, con todo el plan Pro, y compartí tu link de reservas hoy mismo.
            </p>
            <ul className="space-y-3">
              {PERKS.map(p => (
                <li key={p} className="flex items-center gap-3 text-sm font-medium">
                  <Check className="w-5 h-5 text-primary shrink-0" /> {p}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              Al terminar la prueba elegís si seguís con el plan Pro, sin permanencia. Si no, podés seguir con el{" "}
              <Link href="/#planes" className="underline font-semibold">plan gratis</Link>.
            </p>
          </div>

          <Card className="shadow-lg min-w-0">
            <CardHeader>
              <CardTitle>Creá tu cuenta</CardTitle>
              <CardDescription>Plan Pro completo, gratis por {SELF_SIGNUP_TRIAL_DAYS} días. Sin tarjeta.</CardDescription>
            </CardHeader>
            <CardContent>
              {!googleEmail ? (
                <div className="space-y-4 mb-4">
                  <Button type="button" variant="outline" onClick={startGoogle} disabled={googleLoading} className="w-full h-12 font-semibold">
                    {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />} Continuar con Google
                  </Button>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> o registrate con tu mail <span className="h-px flex-1 bg-border" />
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-xl border bg-muted/40 p-3 text-sm flex items-center gap-2">
                  <GoogleIcon />
                  <span className="flex-1 min-w-0 truncate">Cuenta de Google: <strong>{googleEmail}</strong></span>
                  <button type="button" onClick={cancelGoogle} className="text-xs underline text-muted-foreground shrink-0">Cambiar</button>
                </div>
              )}
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="r-name">Nombre de tu negocio</Label>
                  <Input id="r-name" required value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="Ej: Barbería Blessed" className="h-12" />
                </div>
                {!googleEmail && (
                  <>
                <div className="space-y-2">
                  <Label htmlFor="r-email">Mail</Label>
                  <Input id="r-email" type="email" required autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tu@mail.com" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-pass">Clave</Label>
                  <Input id="r-pass" type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="h-12" />
                </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="r-wa">WhatsApp del negocio <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input id="r-wa" inputMode="tel" value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="Ej: 5491123456789" className="h-12 font-mono" />
                </div>
                {/* Campo trampa para bots: invisible y fuera del orden de tabulación */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="r-website">Sitio web</label>
                  <input id="r-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={loading} className="w-full h-12 font-bold">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Empezar mi prueba gratis
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  ¿Ya tenés cuenta? <Link href="/dashboard" className="underline">Iniciá sesión</Link>
                </p>
              </form>
              <div className="mt-5 pt-5 border-t text-center space-y-2">
                <p className="text-sm text-muted-foreground">¿Tenés dudas antes de empezar?</p>
                <Button asChild variant="outline" className="w-full h-11 font-semibold">
                  <a href={HELP_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={trackContact}>
                    <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" /> Escribinos por WhatsApp
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
