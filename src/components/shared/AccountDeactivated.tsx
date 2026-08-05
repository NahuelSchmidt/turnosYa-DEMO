"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, LogOut } from "lucide-react";

interface AccountDeactivatedProps {
  salonName?: string;
  onLogout?: () => void;
}

export function AccountDeactivated({ salonName, onLogout }: AccountDeactivatedProps) {
  return (
    <div className="flex items-center justify-center p-4 py-24">
      <Card className="max-w-md w-full text-center shadow-2xl">
        <CardHeader className="pt-10">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-black">Cuenta Desactivada</CardTitle>
          <CardDescription className="text-base mt-2">
            {salonName ? <>La cuenta de <strong>{salonName}</strong> está</> : "Esta cuenta está"} inactiva por el momento. Contactá al administrador de la plataforma para reactivarla.
          </CardDescription>
        </CardHeader>
        {onLogout && (
          <CardContent className="pb-10">
            <Button variant="outline" onClick={onLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
