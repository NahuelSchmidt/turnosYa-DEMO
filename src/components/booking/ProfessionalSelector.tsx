"use client";

import Image from "next/image";
import { Professional } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProfessionalSelectorProps {
  allProfessionals: Professional[];
  selectedProfessional: Professional | null;
  onSelectProfessional: (professional: Professional) => void;
}

export default function ProfessionalSelector({
  allProfessionals,
  selectedProfessional,
  onSelectProfessional,
}: ProfessionalSelectorProps) {
  const professionalsList = allProfessionals || [];

  if (professionalsList.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4 font-headline">Elige un Profesional</h2>
        <div className="rounded-lg border bg-card text-card-foreground p-8 text-center shadow-sm">
          <p className="text-muted-foreground">No hay profesionales cargados. El administrador debe añadir profesionales desde el panel de configuración.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 font-headline">Elige un Profesional</h2>
      <div className="flex flex-col gap-2">
        {professionalsList.map((prof) => (
          <Card
            key={prof.id}
            onClick={() => onSelectProfessional(prof)}
            className={`cursor-pointer transition-all ${
              selectedProfessional?.id === prof.id
                ? "border-primary ring-2 ring-primary shadow-lg"
                : "hover:shadow-md"
            }`}
          >
            <CardContent className="flex flex-row items-center gap-3 p-3">
              <div className="w-11 h-11 shrink-0 rounded-full bg-muted flex items-center justify-center text-2xl">
                {(prof as any).emoji || prof.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{prof.name}</h3>
                <p className="text-xs text-muted-foreground">{prof.specialty}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
