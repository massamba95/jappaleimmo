"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { hasPermission } from "@/lib/permissions";
import { generateQuittancePDF } from "@/lib/pdf/quittance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, MapPin, Calendar, CreditCard, User, Home, Pencil, Hash, FileDown } from "lucide-react";
import { toast } from "sonner";

interface Lease {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  deposit: number;
  status: string;
  created_at: string;
  properties: {
    title: string;
    address: string;
    city: string;
    type: string;
    charges: number;
  } | null;
  tenants: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  method: string;
  status: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ACTIVE: { label: "Actif", variant: "default" },
  EXPIRED: { label: "Expiré", variant: "secondary" },
  TERMINATED: { label: "Résilié", variant: "destructive" },
};

const paymentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
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

const typeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  COMMERCIAL: "Local commercial",
  LAND: "Terrain",
};

function leaseNumber(id: string, createdAt: string): string {
  const year = new Date(createdAt).getFullYear();
  return `BAI-${year}-${id.slice(0, 6).toUpperCase()}`;
}

export default function LeaseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { orgName, role } = useOrg();
  const canEdit = hasPermission(role, "leases:edit");
  const [lease, setLease] = useState<Lease | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [leaseRes, paymentsRes] = await Promise.all([
        supabase
          .from("leases")
          .select("*, properties(title, address, city, type, charges), tenants(first_name, last_name, phone, email)")
          .eq("id", id)
          .single(),
        supabase
          .from("payments")
          .select("id, amount, due_date, paid_date, method, status")
          .eq("lease_id", id)
          .order("due_date", { ascending: false }),
      ]);
      setLease(leaseRes.data as Lease | null);
      setPayments((paymentsRes.data as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  function handleDownloadQuittance(payment: Payment) {
    if (!lease) return;
    generateQuittancePDF({
      orgName: orgName ?? "Jappalé Immo",
      paymentId: payment.id,
      amount: payment.amount,
      dueDate: payment.due_date,
      paidDate: payment.paid_date,
      method: payment.method,
      leaseNumber: contratNum,
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

  async function handleTerminate() {
    if (!confirm("Confirmer la résiliation de ce bail ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("leases").update({ status: "TERMINATED" }).eq("id", id);
    if (error) { toast.error("Erreur lors de la résiliation."); return; }
    await supabase.from("properties").update({ status: "AVAILABLE" }).eq("id", lease!.property_id);
    toast.success("Bail résilié.");
    setLease((prev) => prev ? { ...prev, status: "TERMINATED" } : null);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  if (!lease) return <div className="text-center py-20"><p>Bail introuvable.</p></div>;

  const status = statusConfig[lease.status];
  const totalMensuel = lease.rent_amount + (lease.properties?.charges ?? 0);
  const contratNum = leaseNumber(lease.id, lease.created_at);
  const paidPayments = payments.filter((p) => p.status === "PAID");
  const totalEncaisse = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <Link href="/dashboard/leases" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />Retour aux baux
      </Link>

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-mono font-medium">{contratNum}</span>
            <Badge variant={status?.variant}>{status?.label}</Badge>
          </div>
          <h1 className="text-2xl font-bold">
            {lease.tenants?.first_name} {lease.tenants?.last_name}
          </h1>
          <p className="text-muted-foreground">{lease.properties?.title}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/dashboard/leases/${id}/edit`}>
              <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" />Modifier</Button>
            </Link>
          )}
          {canEdit && lease.status === "ACTIVE" && (
            <Button variant="destructive" size="sm" onClick={handleTerminate}>
              Résilier
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Numéro de contrat */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Hash className="h-4 w-4" />Contrat</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Numéro</span>
              <span className="font-mono font-bold text-primary">{contratNum}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Début</span>
              <span className="font-medium">{new Date(lease.start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
            </div>
            {lease.end_date && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fin prévue</span>
                <span className="font-medium">{new Date(lease.end_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Caution</span>
              <span className="font-medium">{lease.deposit.toLocaleString("fr-FR")} FCFA</span>
            </div>
          </CardContent>
        </Card>

        {/* Montants */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" />Finances</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Loyer</span>
              <span className="font-medium">{lease.rent_amount.toLocaleString("fr-FR")} FCFA</span>
            </div>
            {(lease.properties?.charges ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Charges</span>
                <span className="font-medium">{lease.properties!.charges.toLocaleString("fr-FR")} FCFA</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-semibold">Total mensuel</span>
              <span className="font-bold text-primary">{totalMensuel.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">Total encaissé</span>
              <span className="font-semibold text-green-600">{totalEncaisse.toLocaleString("fr-FR")} FCFA</span>
            </div>
          </CardContent>
        </Card>

        {/* Locataire */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Locataire</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold">{lease.tenants?.first_name} {lease.tenants?.last_name}</p>
            <p className="text-sm text-muted-foreground">Tél : {lease.tenants?.phone}</p>
            {lease.tenants?.email && <p className="text-sm text-muted-foreground">Email : {lease.tenants.email}</p>}
            <Link href={`/dashboard/tenants/${lease.tenant_id}`} className="text-xs text-primary hover:underline block mt-1">
              Voir la fiche locataire →
            </Link>
          </CardContent>
        </Card>

        {/* Bien */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Home className="h-4 w-4" />Bien loué</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold">{lease.properties?.title}</p>
            <p className="text-sm text-muted-foreground">{typeLabels[lease.properties?.type ?? ""] ?? lease.properties?.type}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {lease.properties?.address}, {lease.properties?.city}
            </div>
            <Link href={`/dashboard/properties/${lease.property_id}`} className="text-xs text-primary hover:underline block mt-1">
              Voir la fiche du bien →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Historique des paiements */}
      <Card className="mt-5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" />Historique des paiements ({payments.length})</CardTitle>
            <Link href="/dashboard/payments/new">
              <Button size="sm">Enregistrer un paiement</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun paiement enregistré pour ce bail.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => {
                const ps = paymentStatusConfig[payment.status];
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{new Date(payment.due_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
                      <p className="text-xs text-muted-foreground">
                        {methodLabels[payment.method] ?? payment.method}
                        {payment.paid_date && ` · Payé le ${new Date(payment.paid_date).toLocaleDateString("fr-FR")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{payment.amount.toLocaleString("fr-FR")} FCFA</span>
                      <Badge variant={ps?.variant} className="text-xs">{ps?.label}</Badge>
                      {payment.status === "PAID" && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 gap-1" onClick={() => handleDownloadQuittance(payment)}>
                          <FileDown className="h-3.5 w-3.5" />
                          <span className="text-xs">PDF</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
