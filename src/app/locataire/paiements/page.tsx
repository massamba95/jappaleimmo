"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateQuittancePDF } from "@/lib/pdf/quittance";

interface TenantInfo {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  org_id: string;
}

interface PropertyInfo {
  id: string;
  title: string;
  address: string;
  city: string;
  charges: number;
}

interface LeaseInfo {
  id: string;
  created_at: string;
  rent_amount: number;
  property: PropertyInfo | null;
}

interface PaymentRow {
  id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  method: string;
  status: string;
  lease: LeaseInfo | null;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PAID: { label: "Payé", variant: "default" },
  PENDING: { label: "En attente", variant: "outline" },
  LATE: { label: "En retard", variant: "destructive" },
  PARTIAL: { label: "Partiel", variant: "secondary" },
};

const methodLabels: Record<string, string> = {
  CASH: "Espèces",
  TRANSFER: "Virement",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
};

function leaseNumber(id: string, createdAt: string): string {
  const year = new Date(createdAt).getFullYear();
  return `BAI-${year}-${id.slice(0, 6).toUpperCase()}`;
}

export default function LocatairePaiementsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [orgName, setOrgName] = useState<string>("Jappalé Immo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, first_name, last_name, phone, org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!tenantData) {
        setLoading(false);
        return;
      }
      setTenant(tenantData as TenantInfo);

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", tenantData.org_id)
        .single();
      if (org?.name) setOrgName(org.name);

      const { data: leases } = await supabase
        .from("leases")
        .select(
          "id, created_at, rent_amount, properties(id, title, address, city, charges)"
        )
        .eq("tenant_id", tenantData.id);

      const leaseIds = (leases ?? []).map((l) => l.id);
      if (leaseIds.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, lease_id, amount, due_date, paid_date, method, status")
        .in("lease_id", leaseIds)
        .order("due_date", { ascending: false });

      const leaseMap = new Map<string, LeaseInfo>();
      (leases ?? []).forEach((l) => {
        const property = Array.isArray(l.properties)
          ? ((l.properties[0] as unknown) as PropertyInfo | null) ?? null
          : ((l.properties as unknown) as PropertyInfo | null);
        leaseMap.set(l.id, {
          id: l.id,
          created_at: l.created_at,
          rent_amount: l.rent_amount,
          property,
        });
      });

      const rows: PaymentRow[] = (paymentsData ?? []).map((p) => ({
        id: p.id,
        lease_id: p.lease_id,
        amount: p.amount,
        due_date: p.due_date,
        paid_date: p.paid_date,
        method: p.method,
        status: p.status,
        lease: leaseMap.get(p.lease_id) ?? null,
      }));

      setPayments(rows);
      setLoading(false);
    }
    load();
  }, []);

  function handleDownload(payment: PaymentRow) {
    const lease = payment.lease;
    if (!lease || !lease.property || !tenant) {
      toast.error("Informations insuffisantes pour générer la quittance.");
      return;
    }
    generateQuittancePDF({
      orgName,
      paymentId: payment.id,
      amount: payment.amount,
      dueDate: payment.due_date,
      paidDate: payment.paid_date,
      method: payment.method,
      leaseNumber: leaseNumber(lease.id, lease.created_at),
      rentAmount: lease.rent_amount,
      charges: lease.property.charges ?? 0,
      tenantFirstName: tenant.first_name,
      tenantLastName: tenant.last_name,
      tenantPhone: tenant.phone,
      propertyTitle: lease.property.title,
      propertyAddress: lease.property.address,
      propertyCity: lease.property.city,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const lateCount = payments.filter((p) => p.status === "LATE" || p.status === "PARTIAL").length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Mes paiements</h1>
        <p className="text-muted-foreground mt-1">
          Historique de vos loyers et quittances.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total payé
            </p>
            <p className="text-2xl font-bold mt-1">
              {totalPaid.toLocaleString("fr-FR")} FCFA
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Paiements en retard
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${
                lateCount > 0 ? "text-red-600" : ""
              }`}
            >
              {lateCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun paiement</h3>
            <p className="text-muted-foreground mt-1 text-center text-sm">
              Vos paiements apparaîtront ici une fois enregistrés par votre agence.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.map((p) => {
              const status = statusConfig[p.status] ?? {
                label: p.status,
                variant: "outline" as const,
              };
              return (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {p.amount.toLocaleString("fr-FR")} FCFA
                        {p.status === "PARTIAL" && p.lease && (
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            versés · reste{" "}
                            {Math.max(0, p.lease.rent_amount - p.amount).toLocaleString("fr-FR")} FCFA
                          </span>
                        )}
                      </span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Échéance :{" "}
                      {new Date(p.due_date).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {methodLabels[p.method] ?? p.method}
                      {p.paid_date &&
                        ` · payé le ${new Date(p.paid_date).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                  {p.status === "PAID" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full sm:w-auto"
                      onClick={() => handleDownload(p)}
                    >
                      <FileDown className="h-4 w-4" />
                      Télécharger quittance
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
