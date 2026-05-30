import Link from "next/link";
import Image from "next/image";
import { Twitter, Instagram, Facebook } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <Image src="/logo.png" alt="Turnify" width={120} height={40} className="object-contain" />
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              La plataforma para que profesionales independientes gestionen sus turnos, servicios y clientes de forma automatizada y profesional.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-3">
            <div className="space-y-4">
              <h4 className="font-bold font-headline text-foreground uppercase tracking-wider text-xs">Navegación</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold font-headline text-foreground uppercase tracking-wider text-xs">Información</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Términos de Uso
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Soporte
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold font-headline text-foreground uppercase tracking-wider text-xs">Social</h4>
              <div className="flex items-center gap-4 pt-1">
                <Link href="#" aria-label="Twitter" className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all">
                  <Twitter className="h-5 w-5" />
                </Link>
                <Link href="#" aria-label="Instagram" className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all">
                  <Instagram className="h-5 w-5" />
                </Link>
                <Link href="#" aria-label="Facebook" className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all">
                  <Facebook className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border/50 mt-12 pt-8 text-center text-xs text-muted-foreground font-medium">
          <p>&copy; {new Date().getFullYear()} Nexary. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
