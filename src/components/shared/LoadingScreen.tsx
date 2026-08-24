"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ message = "Cargando...", fullScreen = true }: LoadingScreenProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", fullScreen ? "min-h-screen" : "p-12")}>
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground font-medium animate-pulse">{message}</p>
    </div>
  );
}
