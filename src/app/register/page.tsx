"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/firebase";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check, Loader2 } from "lucide-react";

const PERKS = [
  "Tus clientes reservan solos desde tu link",
  "Agenda en el celu o la compu",
  "Te avisamos al celu cada vez que reservan",
  "Gratis para siempre, sin tarjeta",
];

export default function RegisterPage() {
  const auth = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ businessName: "", email: "", password: "", whatsappNumber: "", website: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo crear la cuenta");
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
              Empezá gratis con Turnify
            </h1>
            <p className="text-muted-foreground text-lg">
              Creá tu cuenta en un minuto y compartí tu link de reservas hoy mismo.
            </p>
            <ul className="space-y-3">
              {PERKS.map(p => (
                <li key={p} className="flex items-center gap-3 text-sm font-medium">
                  <Check className="w-5 h-5 text-primary shrink-0" /> {p}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              ¿Querés confirmaciones y recordatorios automáticos por WhatsApp y seña al reservar? Eso viene en el{" "}
              <Link href="/#planes" className="underline font-semibold">plan Pro</Link>.
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Creá tu cuenta</CardTitle>
              <CardDescription>Plan gratis: 1 profesional y hasta 50 turnos por mes.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="r-name">Nombre de tu negocio</Label>
                  <Input id="r-name" required value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="Ej: Barbería Ro" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-email">Mail</Label>
                  <Input id="r-email" type="email" required autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tu@mail.com" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-pass">Clave</Label>
                  <Input id="r-pass" type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="h-12" />
                </div>
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
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear mi cuenta gratis
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  ¿Ya tenés cuenta? <Link href="/dashboard" className="underline">Iniciá sesión</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
