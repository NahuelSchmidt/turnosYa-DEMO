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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <CardContent className="flex flex-col items-center justify-center p-3 sm:p-6">
              <div className="w-14 h-14 sm:w-24 sm:h-24 mb-2 sm:mb-4 rounded-full bg-muted flex items-center justify-center text-3xl sm:text-5xl">
                {(prof as any).emoji || prof.name.charAt(0)}
              </div>
              <h3 className="font-semibold text-sm sm:text-lg text-center leading-tight">{prof.name}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-0.5">
                {prof.specialty}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
