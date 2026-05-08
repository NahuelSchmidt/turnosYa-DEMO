"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import BookingFlow from "@/components/booking/BookingFlow";
import { useParams } from 'next/navigation';
import { useSalon } from '@/hooks/use-salon';

export default function BookingPage() {
  const params = useParams();
  const tenantId = typeof params.tenantId === 'string' ? params.tenantId : 'default';
  const { salon, isLoading } = useSalon(tenantId);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section id="booking" className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              {isLoading ? (
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
