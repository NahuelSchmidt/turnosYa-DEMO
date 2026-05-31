"use client";

import { use } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import BookingFlow from "@/components/booking/BookingFlow";
import { useSalon } from '@/hooks/use-salon';
import { useBranches } from '@/hooks/use-branches';
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import Link from "next/link";

export default function BranchBookingPage({ params }: { params: Promise<{ tenantId: string; branchId: string }> }) {
  const { tenantId, branchId } = use(params);
  const { salon, loading: salonLoading } = useSalon(tenantId);
  const { branches, loading: branchesLoading } = useBranches(tenantId);

  const branch = branches.find(b => b.id === branchId);
  const loading = salonLoading || branchesLoading;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              {loading ? (
                <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <>
                  <Link href={`/book/${tenantId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Cambiar sucursal
                  </Link>
                  <h2
                    className="text-2xl md:text-3xl font-black font-headline"
                    style={salon?.primaryColor ? { color: salon.primaryColor } : undefined}
                  >
                    {branch?.name ?? salon?.name ?? 'el negocio'}
                  </h2>
                  {branch?.address && (
                    <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-2">
                      <MapPin className="w-4 h-4" />
                      {branch.address}
                    </div>
                  )}
                </>
              )}
            </div>
            <BookingFlow tenantId={tenantId} branchId={branchId} branchData={branch} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
