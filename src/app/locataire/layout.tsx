"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Building2, Home, CreditCard, Wrench, LogOut } from "lucide-react";

type State = "loading" | "no-tenant" | "ready";

export default function LocataireLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<State>("loading");
  const [tenantName, setTenantName] = useState<string>("");

  const isBienvenue = pathname === "/locataire/bienvenue";

  useEffect(() => {
    if (isBienvenue) {
      setState("ready");
      return;
    }

    async function check() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, first_name, last_name")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!tenant) {
        setState("no-tenant");
        return;
      }

      setTenantName(`${tenant.first_name ?? ""} ${tenant.last_name ?? ""}`.trim());
      setState("ready");
    }

    check();
  }, [router, isBienvenue]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isBienvenue) {
    return <>{children}</>;
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (state === "no-tenant") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="max-w-md text-center space-y-4">
          <Building2 className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-xl font-bold">Espace locataire indisponible</h1>
          <p className="text-muted-foreground text-sm">
            Votre compte n&apos;est pas associé à un locataire. Contactez votre agence pour obtenir l&apos;accès.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/locataire", label: "Accueil", icon: Home, exact: true },
    { href: "/locataire/paiements", label: "Mes paiements", icon: CreditCard, exact: false },
    { href: "/locataire/signaler", label: "Signaler un problème", icon: Wrench, exact: false },
  ];

  function isActive(href: string, exact: boolean): boolean {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-screen">
      {/* Header mobile */}
      <header className="lg:hidden sticky top-0 z-40 bg-card border-b px-4 h-14 flex items-center justify-between">
        <Link href="/locataire" className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-bold">Jappalé Immo</span>
        </Link>
        {tenantName && (
          <p className="text-sm text-muted-foreground truncate max-w-[160px]">{tenantName}</p>
        )}
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex w-64 border-r bg-card min-h-screen flex-col">
          <div className="p-6 border-b">
            <Link href="/locataire" className="flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              <span className="text-lg font-bold">Jappalé Immo</span>
            </Link>
            {tenantName && (
              <div className="mt-3">
                <p className="text-sm font-medium truncate">{tenantName}</p>
                <p className="text-xs text-muted-foreground">Espace locataire</p>
              </div>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </Button>
          </div>
        </aside>

        <main className="flex-1 bg-muted/30">
          <div className="p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">{children}</div>
        </main>
      </div>

      {/* Navbar mobile bottom */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t flex items-center safe-area-bottom">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="text-[10px] text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px]">Quitter</span>
        </button>
      </nav>
    </div>
  );
}
