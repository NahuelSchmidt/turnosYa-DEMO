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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage
                  src={prof.avatarUrl}
                  alt={prof.name}
                  width={100}
                  height={100}
                />
                <AvatarFallback>{prof.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg text-center">{prof.name}</h3>
              <p className="text-sm text-muted-foreground text-center">
                {prof.specialty}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
