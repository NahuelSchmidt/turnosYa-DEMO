"use client";

import { useEffect, useState } from "react";
import { Professional } from "@/lib/data";
import { authJsonHeaders } from "@/lib/auth-headers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle } from "lucide-react";

/**
 * WhatsApp de cada profesional: cuando le reservan o le cancelan un turno, le llega el aviso
 * desde el WhatsApp conectado del negocio. Los números no se muestran en la página pública.
 */
export function StaffWhatsApp({ tenantId, professionals }: { tenantId: string; professionals: Professional[] }) {
  const { toast } = useToast();
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    authJsonHeaders()
      .then(headers => fetch(`/api/staff-contacts?tenantId=${encodeURIComponent(tenantId)}`, { headers }))
      .then(r => (r.ok ? r.json() : { phones: {} }))
      .then(d => { if (alive) { setPhones(d.phones || {}); setLoaded(true); } })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [tenantId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/staff-contacts", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify({ tenantId, phones }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setPhones(data.phones || {});
      toast({ title: "Guardado", description: "Cada mañana le va a llegar a cada uno su agenda del día." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "No se pudo guardar", description: e.message });
    }
    setSaving(false);
  };

  if (!professionals.length) return null;

  return (
    <div className="p-4 border rounded-xl space-y-3">
      <div>
        <p className="text-sm font-bold flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#25D366]" /> Avisos de turnos por WhatsApp
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Cada mañana le llega a cada uno su agenda del día por WhatsApp, desde el número que conectaste. Si se cancela un turno de ese mismo día, también le avisamos. Dejalo vacío si no hace falta. Los clientes no ven estos números.
        </p>
      </div>
      {!loaded ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid gap-2">
          {professionals.map(p => (
            <label key={p.id} className="flex items-center gap-3 min-w-0">
              <span className="text-sm w-28 truncate shrink-0">{(p as any).emoji || ""} {p.name}</span>
              <Input
                inputMode="tel"
                className="h-9 font-mono min-w-0"
                placeholder="Ej: 5491123456789"
                value={phones[p.id] || ""}
                onChange={e => setPhones(prev => ({ ...prev, [p.id]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      )}
      <Button onClick={save} disabled={saving || !loaded} variant="outline" className="w-full">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar WhatsApp del equipo
      </Button>
    </div>
  );
}
