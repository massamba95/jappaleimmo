"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

const navItems = [
  { href: "/super-admin",               label: "Vue globale",    icon: LayoutDashboard },
  { href: "/super-admin/organisations", label: "Organisations",  icon: Building2 },
  { href: "/super-admin/abonnements",   label: "Abonnements",    icon: CreditCard },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (!data) { router.replace("/dashboard"); return; }
      setChecking(false);
    }
    check();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Vérification des droits...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-card min-h-screen flex flex-col">
        <div className="p-6 border-b">
          <Link href="/super-admin" className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <div>
              <p className="text-sm font-bold">Super Admin</p>
              <p className="text-xs text-muted-foreground">Jappalé Immo</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/super-admin" && pathname.startsWith(item.href));
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

          <div className="pt-4 border-t mt-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="h-5 w-5" />
              Retour au dashboard
            </Link>
          </div>
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
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
