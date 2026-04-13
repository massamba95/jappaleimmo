"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { hasPermission } from "@/lib/permissions";
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
  History,
  UserSquare2,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  AGENT: "Agent",
  ACCOUNTANT: "Comptable",
  SECRETARY: "Secretaire",
};

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { orgName, role, loading } = useOrg();

  const navItems: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission | null }[] = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, permission: null },
    { href: "/dashboard/properties", label: "Mes biens", icon: Home, permission: "properties:view" },
    { href: "/dashboard/owners", label: "Propriétaires", icon: UserSquare2, permission: "owners:view" },
    { href: "/dashboard/tenants", label: "Locataires", icon: Users, permission: "tenants:view" },
    { href: "/dashboard/leases", label: "Baux", icon: FileText, permission: "leases:view" },
    { href: "/dashboard/payments", label: "Paiements", icon: CreditCard, permission: "payments:view" },
    { href: "/dashboard/activity", label: "Historique", icon: History, permission: "team:manage" },
    { href: "/dashboard/team", label: "Equipe", icon: UsersRound, permission: "team:manage" },
    { href: "/dashboard/settings", label: "Parametres", icon: Settings, permission: null },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  );

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold">Jappalé Immo</span>
        </Link>
        {!loading && orgName && (
          <div className="mt-3">
            <p className="text-sm font-medium truncate">{orgName}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[role ?? ""] ?? role}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
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

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Deconnexion
        </Button>
      </div>
    </aside>
  );
}
