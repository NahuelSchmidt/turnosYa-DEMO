"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function loadCloudinaryScript(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).cloudinary) { resolve(); return; }
    const existing = document.getElementById("cloudinary-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = "cloudinary-script";
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

export function ImageUpload({ value, onChange, label = "Subir imagen" }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);

  const openWidget = async () => {
    setLoading(true);
    try {
      await loadCloudinaryScript();

      const widget = (window as any).cloudinary.createUploadWidget(
        {
          cloudName: CLOUD_NAME,
          uploadPreset: UPLOAD_PRESET,
          sources: ["local", "camera", "url"],
          multiple: false,
          maxFileSize: 5000000,
          cropping: false,
        },
        (error: any, result: any) => {
          if (error) {
            console.error("Cloudinary error:", error);
            setLoading(false);
            return;
          }
          if (result?.event === "success") {
            onChange(result.info.secure_url);
            setLoading(false);
          }
          if (result?.event === "close") {
            setLoading(false);
          }
        }
      );

      widget.open();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
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
        {loading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Abriendo...</>
          : <><Upload className="w-4 h-4 mr-2" /> {value ? "Cambiar imagen" : label}</>
        }
      </Button>
    </div>
  );
}
