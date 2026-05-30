"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, Menu, LayoutDashboard, Home, UserCircle, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { PlanBadge } from "@/components/ui/plan-badge";
import { usePlan } from "@/hooks/use-plan";
import { PlanType } from "@/lib/data";

function useSalonPlan() {
  const { user } = useUser();
  const db = useFirestore();

  const salonsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || user.isAnonymous) return null;
    return query(collection(db, "salons"), where(`adminMembers.${user.uid}`, "==", true));
  }, [db, user?.uid, user?.isAnonymous]);

  const { data: userSalons } = useCollection(salonsQuery);
  const tenantId = userSalons?.[0]?.id;
  const { plan } = usePlan(tenantId || '');

  return { tenantId, plan: tenantId ? plan : null };
}

export function Header() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const { user } = useUser();
  const { tenantId, plan } = useSalonPlan();

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    const isDarkMode = theme === "dark";
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const navItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const isRealUser = user && !user.isAnonymous;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center mx-auto px-4">
        <div className="mr-auto flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold group">
            <Image src="/logo.png" alt="Turnify" width={28} height={28} className="transition-transform group-hover:scale-110" />
            <span className="font-headline text-lg tracking-tighter">Turnify</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 transition-all hover:text-primary relative py-1",
                pathname === item.href
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:bg-muted/50 rounded-full">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Cambiar tema</span>
          </Button>

          <div className="flex items-center gap-2">
            {isRealUser && plan && (
              <PlanBadge plan={plan as PlanType} className="hidden sm:inline-flex" />
            )}
            <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:bg-muted/50 rounded-full">
              <Link href="/dashboard">
                <UserCircle className="h-5 w-5" />
                <span className="sr-only">Mi Perfil</span>
              </Link>
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden rounded-xl">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="rounded-r-3xl">
              <div className="flex flex-col gap-8 pt-10">
                <Link href="/" className="flex items-center gap-3 font-bold px-2">
                  <Image src="/logo.png" alt="Turnify" width={32} height={32} />
                  <span className="font-headline text-2xl tracking-tighter">Turnify</span>
                </Link>
                {isRealUser && plan && (
                  <div className="px-2">
                    <PlanBadge plan={plan as PlanType} />
                  </div>
                )}
                <nav className="grid gap-2">
                  {navItems.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl p-4 text-lg font-bold transition-all",
                          pathname === item.href ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
