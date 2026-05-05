
"use client";

import Link from "next/link";
import {
  CalendarCheck,
  Menu,
  LayoutDashboard,
  Home,
  UserCircle,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useUser } from "@/firebase";

export function Header() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    const isDarkMode = theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center mx-auto px-4">
        <div className="mr-auto flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold group">
            <CalendarCheck className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
            <span className="font-headline text-lg tracking-tighter">TurnosYa</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 transition-all hover:text-primary relative py-1",
                pathname === item.href ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full" : "text-muted-foreground"
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

          <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:bg-muted/50 rounded-full">
            <Link href="/dashboard">
              <UserCircle className="h-5 w-5" />
              <span className="sr-only">Mi Perfil</span>
            </Link>
          </Button>

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
                  <CalendarCheck className="h-8 w-8 text-primary" />
                  <span className="font-headline text-2xl tracking-tighter">TurnosYa</span>
                </Link>
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
