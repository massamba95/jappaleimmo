"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { logActivity } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface LeaseOption {
  id: string;
  rent_amount: number;
  tenants: { first_name: string; last_name: string } | null;
  properties: { title: string } | null;
}

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [leases, setLeases] = useState<LeaseOption[]>([]);
  const [selectedLease, setSelectedLease] = useState<LeaseOption | null>(null);
  const [paymentType, setPaymentType] = useState<"full" | "partial" | "advance" | "pending">("full");
  const [advanceMonths, setAdvanceMonths] = useState(1);
  const [formData, setFormData] = useState({
    lease_id: "",
    amount: "",
    due_date: new Date().toISOString().split("T")[0],
    method: "CASH",
    note: "",
  });

  const { orgId, userId, userName } = useOrg();

  useEffect(() => {
    if (!orgId) return;
    async function loadLeases() {
      const supabase = createClient();
      const { data } = await supabase
        .from("leases")
        .select("id, rent_amount, tenants(first_name, last_name), properties!inner(title, org_id)")
        .eq("status", "ACTIVE")
        .eq("properties.org_id", orgId!);

      if (data) setLeases(data as unknown as LeaseOption[]);
    }
    loadLeases();
  }, [orgId]);

  function selectLease(leaseId: string) {
    const lease = leases.find((l) => l.id === leaseId);
    setSelectedLease(lease ?? null);
    setFormData((prev) => ({
      ...prev,
      lease_id: leaseId,
      amount: lease?.rent_amount.toString() ?? "",
    }));
    setPaymentType("full");
    setAdvanceMonths(1);
  }

  function handleTypeChange(type: "full" | "partial" | "advance" | "pending") {
    setPaymentType(type);
    if (!selectedLease) return;

    if (type === "full") {
      setFormData((prev) => ({ ...prev, amount: selectedLease.rent_amount.toString() }));
    } else if (type === "partial") {
      setFormData((prev) => ({ ...prev, amount: "" }));
    } else if (type === "advance") {
      setFormData((prev) => ({ ...prev, amount: (selectedLease.rent_amount * advanceMonths).toString() }));
    } else if (type === "pending") {
      setFormData((prev) => ({ ...prev, amount: selectedLease.rent_amount.toString() }));
    }
  }

  function handleAdvanceMonthsChange(months: number) {
    setAdvanceMonths(months);
    if (selectedLease) {
      setFormData((prev) => ({ ...prev, amount: (selectedLease.rent_amount * months).toString() }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.lease_id) {
      toast.error("Veuillez selectionner un bail.");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const amount = parseInt(formData.amount);
    const rentAmount = selectedLease?.rent_amount ?? 0;

    // Paiement attendu (PENDING) — pas encore recu
    if (paymentType === "pending") {
      const { error } = await supabase.from("payments").insert({
        lease_id: formData.lease_id,
        amount: amount,
        due_date: formData.due_date,
        paid_date: null,
        method: formData.method,
        status: "PENDING",
      });

      if (error) {
        toast.error("Erreur lors de l'enregistrement.");
        setLoading(false);
        return;
      }

      if (orgId && userId) {
        await logActivity({
          orgId, userId,
          userName: userName ?? "Utilisateur",
          action: "CREATE",
          entityType: "PAYMENT",
          entityName: `${selectedLease?.tenants?.first_name ?? ""} ${selectedLease?.tenants?.last_name ?? ""}`,
          details: `Paiement attendu - ${amount.toLocaleString("fr-FR")} FCFA - echeance ${formData.due_date}`,
        });
      }

      toast.success("Paiement attendu enregistre !");
      router.push("/dashboard/payments");
      router.refresh();
      return;
    }

    // Determiner le statut
    let status = "PAID";
    if (paymentType === "partial" && amount < rentAmount) {
      status = "PARTIAL";
    }

    // Pour l'avance, creer plusieurs paiements
    if (paymentType === "advance" && advanceMonths > 1) {
      const baseDate = new Date(formData.due_date);
      const payments = [];

      for (let i = 0; i < advanceMonths; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        payments.push({
          lease_id: formData.lease_id,
          amount: rentAmount,
          due_date: dueDate.toISOString().split("T")[0],
          paid_date: new Date().toISOString().split("T")[0],
          method: formData.method,
          status: "PAID",
        });
      }

      const { error } = await supabase.from("payments").insert(payments);

      if (error) {
        toast.error("Erreur lors de l'enregistrement.");
        setLoading(false);
        return;
      }

      if (orgId && userId) {
        await logActivity({
          orgId, userId,
          userName: userName ?? "Utilisateur",
          action: "CREATE",
          entityType: "PAYMENT",
          entityName: `${selectedLease?.tenants?.first_name ?? ""} ${selectedLease?.tenants?.last_name ?? ""}`,
          details: `Avance ${advanceMonths} mois - ${amount.toLocaleString("fr-FR")} FCFA - ${formData.method}`,
        });
      }

      toast.success(`Avance de ${advanceMonths} mois enregistree !`);
    } else {
      // Paiement unique (complet ou partiel)
      const { error } = await supabase.from("payments").insert({
        lease_id: formData.lease_id,
        amount: amount,
        due_date: formData.due_date,
        paid_date: new Date().toISOString().split("T")[0],
        method: formData.method,
        status: status,
      });

      if (error) {
        toast.error("Erreur lors de l'enregistrement.");
        setLoading(false);
        return;
      }

      if (orgId && userId) {
        await logActivity({
          orgId, userId,
          userName: userName ?? "Utilisateur",
          action: "CREATE",
          entityType: "PAYMENT",
          entityName: `${selectedLease?.tenants?.first_name ?? ""} ${selectedLease?.tenants?.last_name ?? ""}`,
          details: `${paymentType === "partial" ? "Partiel" : "Complet"} - ${amount.toLocaleString("fr-FR")} FCFA - ${formData.method}`,
        });
      }

      toast.success(`Paiement ${paymentType === "partial" ? "partiel" : ""} enregistre !`);
    }

    router.push("/dashboard/payments");
    router.refresh();
  }

  return (
    <div>
      <Link href="/dashboard/payments" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />Retour aux paiements
      </Link>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Enregistrer un paiement</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bail */}
            <div className="space-y-2">
              <Label>Bail (locataire — bien)</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.lease_id}
                onChange={(e) => selectLease(e.target.value)}
                required
              >
                <option value="">-- Selectionnez un bail --</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenants?.first_name} {lease.tenants?.last_name} — {lease.properties?.title} ({lease.rent_amount.toLocaleString("fr-FR")} FCFA)
                  </option>
                ))}
              </select>
            </div>

            {/* Type de paiement */}
            {selectedLease && (
              <div className="space-y-2">
                <Label>Type de paiement</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${paymentType === "full" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    onClick={() => handleTypeChange("full")}
                  >
                    Complet
                    <p className="text-xs mt-1 opacity-75">1 mois</p>
                  </button>
                  <button
                    type="button"
                    className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${paymentType === "partial" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    onClick={() => handleTypeChange("partial")}
                  >
                    Partiel
                    <p className="text-xs mt-1 opacity-75">Montant libre</p>
                  </button>
                  <button
                    type="button"
                    className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${paymentType === "advance" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    onClick={() => handleTypeChange("advance")}
                  >
                    Avance
                    <p className="text-xs mt-1 opacity-75">Plusieurs mois</p>
                  </button>
                  <button
                    type="button"
                    className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${paymentType === "pending" ? "bg-orange-500 text-white border-orange-500" : "hover:bg-muted"}`}
                    onClick={() => handleTypeChange("pending")}
                  >
                    Attendu
                    <p className="text-xs mt-1 opacity-75">Non encore recu</p>
                  </button>
                </div>
              </div>
            )}

            {/* Nombre de mois (avance) */}
            {paymentType === "advance" && selectedLease && (
              <div className="space-y-2">
                <Label>Nombre de mois d&apos;avance</Label>
                <div className="flex gap-2">
                  {[2, 3, 4, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${advanceMonths === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                      onClick={() => handleAdvanceMonthsChange(m)}
                    >
                      {m} mois
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total : <strong>{(selectedLease.rent_amount * advanceMonths).toLocaleString("fr-FR")} FCFA</strong> ({advanceMonths} x {selectedLease.rent_amount.toLocaleString("fr-FR")})
                </p>
              </div>
            )}

            {/* Info paiement attendu */}
            {paymentType === "pending" && selectedLease && (
              <div className="flex items-start gap-2 bg-orange-50 text-orange-700 p-3 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Ce paiement sera marque comme <strong>en attente</strong>. Il apparaitra dans les alertes du tableau de bord si la date d&apos;echeance est depassee.</span>
              </div>
            )}

            {/* Avertissement paiement partiel */}
            {paymentType === "partial" && selectedLease && (
              <div className="flex items-start gap-2 bg-yellow-50 text-yellow-700 p-3 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Le loyer mensuel est de <strong>{selectedLease.rent_amount.toLocaleString("fr-FR")} FCFA</strong>. Le montant partiel sera marque comme paiement incomplet.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant (FCFA)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="150000"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  disabled={paymentType === "advance"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">{paymentType === "advance" ? "Debut de l'avance" : "Date d'echeance"}</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Methode de paiement</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.method}
                onChange={(e) => setFormData((prev) => ({ ...prev, method: e.target.value }))}
              >
                <option value="CASH">Especes</option>
                <option value="TRANSFER">Virement bancaire</option>
                <option value="WAVE">Wave</option>
                <option value="ORANGE_MONEY">Orange Money</option>
              </select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Enregistrement..." : paymentType === "advance" ? `Enregistrer l'avance de ${advanceMonths} mois` : paymentType === "pending" ? "Enregistrer le paiement attendu" : "Enregistrer le paiement"}
              </Button>
              <Link href="/dashboard/payments">
                <Button type="button" variant="outline">Annuler</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
