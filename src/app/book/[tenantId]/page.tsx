"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import BookingFlow from "@/components/booking/BookingFlow";
import { useParams } from 'next/navigation';

export default function BookingPage() {
  const params = useParams();
  const tenantId = typeof params.tenantId === 'string' ? params.tenantId : 'default';

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section id="booking" className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold text-center mb-12 font-headline">
              Agenda tu Cita
            </h2>
            <BookingFlow tenantId={tenantId} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
