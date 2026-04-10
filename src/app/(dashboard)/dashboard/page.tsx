import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, CreditCard, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: totalProperties } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { count: occupiedProperties } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .eq("status", "OCCUPIED");

  const { count: totalTenants } = await supabase
    .from("tenants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { data: pendingPayments } = await supabase
    .from("payments")
    .select("amount, leases!inner(property_id, properties!inner(user_id))")
    .eq("status", "PENDING")
    .eq("leases.properties.user_id", user!.id);

  const pendingAmount = pendingPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const total = totalProperties ?? 0;
  const occupied = occupiedProperties ?? 0;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const stats = [
    {
      title: "Total biens",
      value: total,
      icon: Building2,
      description: `${occupied} occupes`,
    },
    {
      title: "Locataires",
      value: totalTenants ?? 0,
      icon: Users,
      description: "Locataires actifs",
    },
    {
      title: "Taux d'occupation",
      value: `${occupancyRate}%`,
      icon: Building2,
      description: `${occupied}/${total} biens`,
    },
    {
      title: "Impayes",
      value: `${pendingAmount.toLocaleString("fr-FR")} FCFA`,
      icon: AlertTriangle,
      description: `${pendingPayments?.length ?? 0} paiement(s) en attente`,
    },
  ];

  const { data: recentPayments } = await supabase
    .from("payments")
    .select(
      "*, leases(tenant_id, tenants(first_name, last_name), property_id, properties(title))"
    )
    .eq("leases.properties.user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div>
      <h1 className="text-3xl font-bold">Tableau de bord</h1>
      <p className="text-muted-foreground mt-1">
        Bienvenue, {user!.user_metadata?.first_name ?? "Utilisateur"} !
      </p>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent payments */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Derniers paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentPayments || recentPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Aucun paiement enregistre pour le moment.
            </p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {(payment.leases as Record<string, unknown>)?.tenants
                        ? `${((payment.leases as Record<string, unknown>).tenants as Record<string, string>).first_name} ${((payment.leases as Record<string, unknown>).tenants as Record<string, string>).last_name}`
                        : "Locataire"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.paid_date ?? payment.due_date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {payment.amount.toLocaleString("fr-FR")} FCFA
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        payment.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : payment.status === "LATE"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {payment.status === "PAID"
                        ? "Paye"
                        : payment.status === "LATE"
                        ? "En retard"
                        : "En attente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
