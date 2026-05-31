"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

declare global {
  interface Window {
    cloudinary: any;
  }
}

export function ImageUpload({ value, onChange, label = "Subir imagen" }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    // Cargar el script de Cloudinary
    if (!document.getElementById("cloudinary-script")) {
      const script = document.createElement("script");
      script.id = "cloudinary-script";
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const openWidget = () => {
    setLoading(true);
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!window.cloudinary) {
      setLoading(false);
      alert("El widget de Cloudinary no está listo. Intentá de nuevo en unos segundos.");
      return;
    }

    widgetRef.current = window.cloudinary.createUploadWidget(
      {
        cloudName,
        uploadPreset,
        sources: ["local", "camera"],
        multiple: false,
        maxFileSize: 5000000, // 5MB
        cropping: true,
        croppingAspectRatio: 16 / 9,
        language: "es",
        text: {
          es: {
            or: "O",
            back: "Volver",
            close: "Cerrar",
            crop: {
              title: "Recortá tu imagen",
              crop_btn: "Recortar",
              skip_btn: "Usar original",
            },
            local: {
              browse: "Elegir archivo",
              dd_title_single: "Arrastrá tu foto acá",
              drop_title_single: "Soltá la imagen",
            },
          },
        },
      },
      (error: any, result: any) => {
        setLoading(false);
        if (!error && result?.event === "success") {
          onChange(result.info.secure_url);
          widgetRef.current?.close();
        }
      }
    );

    widgetRef.current.open();
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative w-full h-40 rounded-xl overflow-hidden border">
          <img src={value} alt="Imagen del negocio" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <Button type="button" variant="outline" onClick={openWidget} disabled={loading} className="w-full">
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando...</>
        ) : (
          <><Upload className="w-4 h-4 mr-2" /> {value ? "Cambiar imagen" : label}</>
        )}
      </Button>
    </div>
  );
}
