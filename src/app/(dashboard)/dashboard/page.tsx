"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { getPlanLimits } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, AlertTriangle, Clock } from "lucide-react";

export default function DashboardPage() {
  const { orgId, orgName, orgPlan, orgStatus, trialDaysLeft, userName: hookUserName, loading: orgLoading } = useOrg();
  const [stats, setStats] = useState({
    totalProperties: 0,
    occupiedProperties: 0,
    totalTenants: 0,
    pendingAmount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      const supabase = createClient();
      setUserName(hookUserName ?? "Utilisateur");

      const [propRes, occRes, tenRes] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "OCCUPIED"),
        supabase.from("tenants").select("*", { count: "exact", head: true }).eq("org_id", orgId!),
      ]);

      setStats({
        totalProperties: propRes.count ?? 0,
        occupiedProperties: occRes.count ?? 0,
        totalTenants: tenRes.count ?? 0,
        pendingAmount: 0,
        pendingCount: 0,
      });
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
      description: `${stats.pendingCount} paiement(s) en attente`,
    },
  ];

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
