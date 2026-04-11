"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { cn } from "@/lib/utils";
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
  Menu,
  X,
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
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: null },
    { href: "/dashboard/properties", label: "Mes biens", icon: Home, roles: null },
    { href: "/dashboard/tenants", label: "Locataires", icon: Users, roles: null },
    { href: "/dashboard/leases", label: "Baux", icon: FileText, roles: null },
    { href: "/dashboard/payments", label: "Paiements", icon: CreditCard, roles: null },
    { href: "/dashboard/team", label: "Equipe", icon: UsersRound, roles: ["ADMIN"] },
    { href: "/dashboard/settings", label: "Parametres", icon: Settings, roles: ["ADMIN", "MANAGER"] },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-bold">Jappalé Immo</span>
        </Link>
        <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile menu overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 top-14 z-40 bg-background">
          <div className="p-4">
            {!loading && orgName && (
              <div className="mb-4 pb-4 border-b">
                <p className="font-medium">{orgName}</p>
                <p className="text-sm text-muted-foreground">{roleLabels[role ?? ""]}</p>
              </div>
            )}
            <nav className="space-y-1">
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
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
            <div className="mt-6 pt-4 border-t">
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
    </>
  );
}
