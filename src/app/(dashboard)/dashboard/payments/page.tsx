"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchBar } from "@/components/dashboard/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, CreditCard, CheckCircle2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateQuittancePDF } from "@/lib/pdf/quittance";

interface Payment {
  id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  method: string;
  status: string;
  leases: {
    id: string;
    created_at: string;
    rent_amount: number;
    tenants: { first_name: string; last_name: string; phone: string } | null;
    properties: { title: string; address: string; city: string; charges: number; org_id: string } | null;
  } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PAID: { label: "Paye", variant: "default" },
  PENDING: { label: "En attente", variant: "outline" },
  LATE: { label: "En retard", variant: "destructive" },
  PARTIAL: { label: "Partiel", variant: "secondary" },
};

const methodLabels: Record<string, string> = {
  CASH: "Especes",
  TRANSFER: "Virement",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
};

export default function PaymentsPage() {
  const router = useRouter();
  const { orgId, orgName, role, userId, userName } = useOrg();
  const canCreate = hasPermission(role, "payments:create");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [completeAmount, setCompleteAmount] = useState("");
  const [completeMethod, setCompleteMethod] = useState("CASH");

  useEffect(() => {
    if (!orgId) return;
    loadPayments();
  }, [orgId]);

  async function loadPayments() {
    const supabase = createClient();
    const { data } = await supabase
      .from("payments")
      .select("*, leases(id, created_at, rent_amount, tenants(first_name, last_name, phone), properties!inner(title, address, city, charges, org_id))")
      .eq("leases.properties.org_id", orgId!)
      .order("created_at", { ascending: false });

    setPayments((data as Payment[]) ?? []);
    setLoading(false);
  }

  function getRemainingAmount(payment: Payment): number {
    if (payment.status !== "PARTIAL" || !payment.leases) return 0;
    return payment.leases.rent_amount - payment.amount;
  }

  async function handleComplete(payment: Payment) {
    if (completing !== payment.id) {
      const remaining = getRemainingAmount(payment);
      setCompleting(payment.id);
      setCompleteAmount(remaining.toString());
      setCompleteMethod("CASH");
      return;
    }

    const amount = parseInt(completeAmount);
    if (!amount || amount <= 0) {
      toast.error("Montant invalide.");
      return;
    }

    const supabase = createClient();
    const remaining = getRemainingAmount(payment);
    const totalAfter = payment.amount + amount;
    const rentAmount = payment.leases?.rent_amount ?? 0;

    // Creer le paiement complementaire
    const { error } = await supabase.from("payments").insert({
      lease_id: payment.lease_id,
      amount: amount,
      due_date: payment.due_date,
      paid_date: new Date().toISOString().split("T")[0],
      method: completeMethod,
      status: totalAfter >= rentAmount ? "PAID" : "PARTIAL",
    });

    if (error) {
      toast.error("Erreur lors de l'enregistrement.");
      return;
    }

    // Si le total est complet, mettre a jour le paiement original en PAID
    if (totalAfter >= rentAmount) {
      await supabase
        .from("payments")
        .update({ status: "PAID" })
        .eq("id", payment.id);
    }

    if (orgId && userId) {
      await logActivity({
        orgId, userId,
        userName: userName ?? "Utilisateur",
        action: "CREATE",
        entityType: "PAYMENT",
        entityName: `${payment.leases?.tenants?.first_name ?? ""} ${payment.leases?.tenants?.last_name ?? ""}`,
        details: `Complement - ${amount.toLocaleString("fr-FR")} FCFA (reste: ${Math.max(0, remaining - amount).toLocaleString("fr-FR")} FCFA)`,
      });
    }

    toast.success("Complement enregistre !");
    setCompleting(null);
    loadPayments();
  }

  function leaseNumber(id: string, createdAt: string): string {
    const year = new Date(createdAt).getFullYear();
    return `BAI-${year}-${id.slice(0, 6).toUpperCase()}`;
  }

  function handleDownloadQuittance(payment: Payment) {
    const lease = payment.leases;
    if (!lease) return;
    generateQuittancePDF({
      orgName: orgName ?? "Jappalé Immo",
      paymentId: payment.id,
      amount: payment.amount,
      dueDate: payment.due_date,
      paidDate: payment.paid_date,
      method: payment.method,
      leaseNumber: leaseNumber(lease.id, lease.created_at),
      rentAmount: lease.rent_amount,
      charges: lease.properties?.charges ?? 0,
      tenantFirstName: lease.tenants?.first_name ?? "",
      tenantLastName: lease.tenants?.last_name ?? "",
      tenantPhone: lease.tenants?.phone ?? "",
      propertyTitle: lease.properties?.title ?? "",
      propertyAddress: lease.properties?.address ?? "",
      propertyCity: lease.properties?.city ?? "",
    });
  }

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const tenant = p.leases?.tenants;
    const property = p.leases?.properties;
    return (
      tenant?.first_name.toLowerCase().includes(q) ||
      tenant?.last_name.toLowerCase().includes(q) ||
      property?.title.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paiements</h1>
          <p className="text-muted-foreground mt-1">Historique de tous les paiements de loyer.</p>
        </div>
        {canCreate && (
          <Link href="/dashboard/payments/new">
            <Button><Plus className="h-4 w-4 mr-2" />Enregistrer un paiement</Button>
          </Link>
        )}
      </div>

      {payments.length > 0 && (
        <div className="mt-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un paiement..." />
        </div>
      )}

      {payments.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun paiement</h3>
            <p className="text-muted-foreground mt-1">Les paiements apparaitront ici une fois enregistres.</p>
            <Link href="/dashboard/payments/new" className="mt-4">
              <Button><Plus className="h-4 w-4 mr-2" />Enregistrer un paiement</Button>
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Aucun resultat pour &quot;{search}&quot;</p>
      ) : (
        <>
          {/* Cartes mobile */}
          <div className="mt-6 space-y-3 md:hidden">
            {filtered.map((payment) => {
              const tenant = payment.leases?.tenants;
              const property = payment.leases?.properties;
              const status = statusConfig[payment.status];
              const remaining = getRemainingAmount(payment);
              const isCompleting = completing === payment.id;
              return (
                <Card key={payment.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{tenant?.first_name} {tenant?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{property?.title}</p>
                      </div>
                      <Badge variant={status?.variant}>{status?.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-3">
                      <span className="text-muted-foreground">Montant</span>
                      <span className="font-bold">{payment.amount.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    {payment.status === "PARTIAL" && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Reste</span>
                        <span className="font-medium text-red-600">{remaining.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Echeance</span>
                      <span>{new Date(payment.due_date).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Methode</span>
                      <span>{methodLabels[payment.method] ?? payment.method}</span>
                    </div>
                    {payment.status === "PARTIAL" && canCreate && (
                      <div className="mt-3 pt-3 border-t">
                        {isCompleting ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={completeAmount}
                              onChange={(e) => setCompleteAmount(e.target.value)}
                              className="flex-1 h-9 text-sm"
                              placeholder="Montant"
                            />
                            <select
                              className="h-9 rounded border border-input bg-background px-2 text-xs"
                              value={completeMethod}
                              onChange={(e) => setCompleteMethod(e.target.value)}
                            >
                              <option value="CASH">Especes</option>
                              <option value="WAVE">Wave</option>
                              <option value="ORANGE_MONEY">OM</option>
                              <option value="TRANSFER">Virement</option>
                            </select>
                            <Button size="sm" onClick={() => handleComplete(payment)}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setCompleting(null)}>x</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => handleComplete(payment)}>
                            Completer le paiement
                          </Button>
                        )}
                      </div>
                    )}
                    {payment.status === "PAID" && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => handleDownloadQuittance(payment)}
                        >
                          <FileDown className="h-4 w-4" />
                          Télécharger la quittance
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Table desktop */}
          <Card className="mt-6 hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Locataire</TableHead>
                    <TableHead>Bien</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Reste</TableHead>
                    <TableHead>Echeance</TableHead>
                    <TableHead>Methode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((payment) => {
                    const tenant = payment.leases?.tenants;
                    const property = payment.leases?.properties;
                    const status = statusConfig[payment.status];
                    const remaining = getRemainingAmount(payment);
                    const isCompleting = completing === payment.id;
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{tenant?.first_name} {tenant?.last_name}</TableCell>
                        <TableCell>{property?.title}</TableCell>
                        <TableCell>{payment.amount.toLocaleString("fr-FR")} FCFA</TableCell>
                        <TableCell>
                          {payment.status === "PARTIAL" ? (
                            <span className="text-red-600 font-medium">{remaining.toLocaleString("fr-FR")} FCFA</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(payment.due_date).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>{methodLabels[payment.method] ?? payment.method}</TableCell>
                        <TableCell><Badge variant={status?.variant}>{status?.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {payment.status === "PARTIAL" && canCreate && (
                              isCompleting ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={completeAmount}
                                    onChange={(e) => setCompleteAmount(e.target.value)}
                                    className="w-24 h-8 text-sm"
                                    placeholder="Montant"
                                  />
                                  <select
                                    className="h-8 rounded border border-input bg-background px-2 text-xs"
                                    value={completeMethod}
                                    onChange={(e) => setCompleteMethod(e.target.value)}
                                  >
                                    <option value="CASH">Especes</option>
                                    <option value="WAVE">Wave</option>
                                    <option value="ORANGE_MONEY">OM</option>
                                    <option value="TRANSFER">Virement</option>
                                  </select>
                                  <Button size="sm" onClick={() => handleComplete(payment)}>
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setCompleting(null)}>x</Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleComplete(payment)}>
                                  Completer
                                </Button>
                              )
                            )}
                            {payment.status === "PAID" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => handleDownloadQuittance(payment)}
                              >
                                <FileDown className="h-3.5 w-3.5" />
                                Quittance
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
