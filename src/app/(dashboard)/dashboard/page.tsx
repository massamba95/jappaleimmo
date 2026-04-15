"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { getPlanLimits } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, AlertTriangle, Clock, MessageCircle } from "lucide-react";

interface OverduePayment {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  leases: {
    rent_amount: number;
    tenants: { first_name: string; last_name: string; phone: string } | null;
    properties: { title: string } | null;
  } | null;
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("221") ? digits : `221${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

function whatsappMessage(payment: OverduePayment, orgName: string): string {
  const tenant = payment.leases?.tenants;
  const property = payment.leases?.properties;
  const name = `${tenant?.first_name ?? ""} ${tenant?.last_name ?? ""}`.trim();
  const date = new Date(payment.due_date).toLocaleDateString("fr-FR");
  const amount = (payment.leases?.rent_amount ?? payment.amount).toLocaleString("fr-FR");
  return `Bonjour ${name},\n\nNous vous rappelons que votre loyer de ${amount} FCFA pour le bien "${property?.title ?? ""}" était dû le ${date}.\n\nMerci de régulariser votre situation au plus tôt.\n\n${orgName}`;
}

export default function DashboardPage() {
  const { orgId, orgName, orgPlan, orgStatus, trialDaysLeft, userName: hookUserName, loading: orgLoading } = useOrg();
  const [stats, setStats] = useState({
    totalProperties: 0,
    occupiedProperties: 0,
    totalTenants: 0,
    pendingAmount: 0,
    pendingCount: 0,
  });
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      const supabase = createClient();
      setUserName(hookUserName ?? "Utilisateur");
      const today = new Date().toISOString().split("T")[0];

      const [propRes, occRes, tenRes, overdueRes] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "OCCUPIED"),
        supabase.from("tenants").select("*", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase
          .from("payments")
          .select("id, amount, due_date, status, leases(rent_amount, tenants(first_name, last_name, phone), properties!inner(title, org_id))")
          .eq("leases.properties.org_id", orgId!)
          .in("status", ["PENDING", "LATE", "PARTIAL"])
          .lte("due_date", today)
          .order("due_date", { ascending: true }),
      ]);

      const overdue = (overdueRes.data as OverduePayment[]) ?? [];
      const pendingAmount = overdue.reduce((sum, p) => {
        const rent = p.leases?.rent_amount ?? p.amount;
        const paid = p.status === "PARTIAL" ? p.amount : 0;
        return sum + (rent - paid);
      }, 0);

      setStats({
        totalProperties: propRes.count ?? 0,
        occupiedProperties: occRes.count ?? 0,
        totalTenants: tenRes.count ?? 0,
        pendingAmount,
        pendingCount: overdue.length,
      });
      setOverduePayments(overdue);
      setLoading(false);
    }
    load();
  }, [orgId]);

  if (orgLoading || loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  const occupancyRate = stats.totalProperties > 0
    ? Math.round((stats.occupiedProperties / stats.totalProperties) * 100)
    : 0;

  const limits = getPlanLimits(orgPlan ?? "FREE");

  const statCards = [
    {
      title: "Total biens",
      value: `${stats.totalProperties}/${limits.maxProperties}`,
      icon: Building2,
      description: `${stats.occupiedProperties} occupes — Plan ${limits.label}`,
    },
    {
      title: "Locataires",
      value: stats.totalTenants,
      icon: Users,
      description: "Locataires actifs",
    },
    {
      title: "Taux d'occupation",
      value: `${occupancyRate}%`,
      icon: Building2,
      description: `${stats.occupiedProperties}/${stats.totalProperties} biens`,
    },
    {
      title: "Impayes",
      value: `${stats.pendingAmount.toLocaleString("fr-FR")} FCFA`,
      icon: AlertTriangle,
      description: `${stats.pendingCount} paiement(s) en retard`,
      alert: stats.pendingCount > 0,
    },
  ];

  const statusLabels: Record<string, string> = {
    PENDING: "En attente",
    LATE: "En retard",
    PARTIAL: "Partiel",
  };

  const statusVariants: Record<string, "outline" | "destructive" | "secondary"> = {
    PENDING: "outline",
    LATE: "destructive",
    PARTIAL: "secondary",
  };

  return (
    <div>
      {/* Bandeau blocage */}
      {orgStatus === "BLOCKED" && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 text-center">
          Votre abonnement est expire. Renouvelez pour continuer a utiliser toutes les fonctionnalites.
        </div>
      )}

      {/* Bandeau essai */}
      {orgStatus === "TRIAL" && (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-6 flex items-center justify-center gap-2">
          <Clock className="h-5 w-5" />
          <span>
            Periode d&apos;essai — <strong>{trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}</strong>.
            Profitez de toutes les fonctionnalites !
          </span>
        </div>
      )}

      <h1 className="text-3xl font-bold">Tableau de bord</h1>
      <p className="text-muted-foreground mt-1">
        Bienvenue, {userName} ! — {orgName}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mt-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className={stat.alert ? "border-destructive/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.alert ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.alert ? "text-destructive" : ""}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section alertes impayés */}
      {overduePayments.length > 0 ? (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold">Alertes paiements</h2>
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {overduePayments.length}
            </span>
          </div>
          <div className="space-y-3">
            {overduePayments.map((payment) => {
              const tenant = payment.leases?.tenants;
              const property = payment.leases?.properties;
              const rentAmount = payment.leases?.rent_amount ?? payment.amount;
              const remaining = payment.status === "PARTIAL" ? rentAmount - payment.amount : rentAmount;
              const daysLate = Math.floor((Date.now() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24));
              const phone = tenant?.phone ?? "";

              return (
                <Card key={payment.id} className="border-destructive/30 bg-destructive/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{tenant?.first_name} {tenant?.last_name}</p>
                          <Badge variant={statusVariants[payment.status] ?? "outline"}>
                            {statusLabels[payment.status] ?? payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{property?.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                          <span className="font-bold text-destructive">{remaining.toLocaleString("fr-FR")} FCFA</span>
                          <span className="text-muted-foreground">
                            Dû le {new Date(payment.due_date).toLocaleDateString("fr-FR")}
                          </span>
                          {daysLate > 0 && (
                            <span className="text-red-600 font-medium">{daysLate}j de retard</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {phone && (
                          <a
                            href={buildWhatsAppUrl(phone, whatsappMessage(payment, orgName ?? "Jappalé Immo"))}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
                              <MessageCircle className="h-4 w-4" />
                              <span className="hidden sm:inline">Rappeler</span>
                            </Button>
                          </a>
                        )}
                        <Link href="/dashboard/payments">
                          <Button size="sm" variant="outline">Voir</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : stats.totalProperties > 0 && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-sm text-green-700 font-medium">Tous les paiements sont a jour.</p>
        </div>
      )}
    </div>
  );
}
