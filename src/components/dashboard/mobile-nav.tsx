"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  Building2,
  LayoutDashboard,
  Home,
  Users,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  UsersRound,
  History,
  MoreHorizontal,
  X,
  UserSquare2,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  AGENT: "Agent",
  ACCOUNTANT: "Comptable",
  SECRETARY: "Secretaire",
};

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { orgName, role, loading } = useOrg();
  const [moreOpen, setMoreOpen] = useState(false);

  const mainTabs: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission | null }[] = [
    { href: "/dashboard", label: "Accueil", icon: LayoutDashboard, permission: null },
    { href: "/dashboard/properties", label: "Biens", icon: Home, permission: "properties:view" },
    { href: "/dashboard/tenants", label: "Locataires", icon: Users, permission: "tenants:view" },
    { href: "/dashboard/payments", label: "Paiements", icon: CreditCard, permission: "payments:view" },
  ];

  const moreItems: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission | null }[] = [
    { href: "/dashboard/owners", label: "Propriétaires", icon: UserSquare2, permission: "owners:view" },
    { href: "/dashboard/leases", label: "Baux", icon: FileText, permission: "leases:view" },
    { href: "/dashboard/activity", label: "Historique", icon: History, permission: "team:manage" },
    { href: "/dashboard/team", label: "Equipe", icon: UsersRound, permission: "team:manage" },
    { href: "/dashboard/settings", label: "Parametres", icon: Settings, permission: null },
  ];

  const visibleMain = mainTabs.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  );

  const visibleMore = moreItems.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  );

  const isMoreActive = visibleMore.some(
    (item) => pathname === item.href || pathname.startsWith(item.href)
  );

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Header mobile minimal */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-bold">Jappalé Immo</span>
        </Link>
        {!loading && orgName && (
          <p className="text-sm text-muted-foreground truncate max-w-[160px]">{orgName}</p>
        )}
      </header>

      {/* Overlay "Plus" */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-card rounded-t-2xl p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold">Menu</p>
              <Button variant="ghost" size="sm" onClick={() => setMoreOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="grid grid-cols-2 gap-2">
              {visibleMore.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Deconnexion
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barre de navigation en bas */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex items-center safe-area-bottom">
        {visibleMain.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              {item.label}
            </Link>
          );
        })}
        <button
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors",
            isMoreActive ? "text-primary" : "text-muted-foreground"
          )}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "stroke-[2.5]")} />
          Plus
        </button>
      </nav>
    </>
  );
}
