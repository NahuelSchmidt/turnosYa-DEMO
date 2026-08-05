"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import BookingFlow from "@/components/booking/BookingFlow";
import { useParams, useRouter } from 'next/navigation';
import { useSalon } from '@/hooks/use-salon';
import { useBranches } from '@/hooks/use-branches';
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ChevronRight, Loader2 } from "lucide-react";
import { AccountDeactivated } from "@/components/shared/AccountDeactivated";

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = typeof params.tenantId === 'string' ? params.tenantId : 'default';
  const { salon, loading: salonLoading } = useSalon(tenantId);
  const { branches, loading: branchesLoading } = useBranches(tenantId);

  const loading = salonLoading || branchesLoading;

  if (!loading && salon?.isActive === false) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow"><AccountDeactivated salonName={salon?.name} /></main>
        <Footer />
      </div>
    );
  }

  // Si hay sucursales, mostrar selector
  if (!loading && branches.length > 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <section className="w-full py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 md:px-6 max-w-2xl">
              <div className="text-center mb-10">
                {loading ? (
                  <div className="h-10 w-72 bg-muted animate-pulse rounded-lg mx-auto" />
                ) : (
                  <h2
                    className="text-2xl md:text-3xl font-black font-headline"
                    style={salon?.primaryColor ? { color: salon.primaryColor } : undefined}
                  >
                    {salon?.name ?? 'el negocio'}
                  </h2>
                )}
                <p className="text-muted-foreground mt-2">Elegí la sucursal donde querés reservar</p>
              </div>
              <div className="grid gap-3">
                {branches.map(branch => (
                  <Card
                    key={branch.id}
                    className="cursor-pointer hover:shadow-md hover:border-primary transition-all"
                    onClick={() => router.push(`/book/${tenantId}/${branch.id}`)}
                  >
                    <CardContent className="flex items-center justify-between p-5">
                      <div>
                        <p className="font-bold text-lg">{branch.name}</p>
                        {branch.address && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {branch.address}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // Sin sucursales → flujo normal
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section id="booking" className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              {loading ? (
                <div className="h-10 w-72 bg-muted animate-pulse rounded-lg mx-auto" />
              ) : (
                <h2
                  className="text-2xl md:text-3xl font-black font-headline"
                  style={salon?.primaryColor ? { color: salon.primaryColor } : undefined}
                >
                  Agendá tu cita con {salon?.name ?? 'el negocio'}
                </h2>
              )}
            </div>
            <BookingFlow tenantId={tenantId} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
