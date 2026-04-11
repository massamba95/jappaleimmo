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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
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
  const [formData, setFormData] = useState({
    lease_id: "",
    amount: "",
    due_date: new Date().toISOString().split("T")[0],
    method: "CASH",
  });

  const { orgId, userId, userName } = useOrg();

  useEffect(() => {
    if (!orgId) return;
    async function loadLeases() {
      const supabase = createClient();

      const { data } = await supabase
        .from("leases")
        .select(
          "id, rent_amount, tenants(first_name, last_name), properties!inner(title, org_id)"
        )
        .eq("status", "ACTIVE")
        .eq("properties.org_id", orgId!);

      if (data) {
        setLeases(data as unknown as LeaseOption[]);
      }
    }
    loadLeases();
  }, [orgId]);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "lease_id") {
      const lease = leases.find((l) => l.id === value);
      if (lease) {
        setFormData((prev) => ({
          ...prev,
          lease_id: value,
          amount: lease.rent_amount.toString(),
        }));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.from("payments").insert({
      lease_id: formData.lease_id,
      amount: parseInt(formData.amount),
      due_date: formData.due_date,
      paid_date: new Date().toISOString().split("T")[0],
      method: formData.method,
      status: "PAID",
    });

    if (error) {
      toast.error("Erreur lors de l'enregistrement du paiement.");
      setLoading(false);
      return;
    }

    const selectedLease = leases.find((l) => l.id === formData.lease_id);
    if (orgId && userId) {
      await logActivity({
        orgId, userId,
        userName: userName ?? "Utilisateur",
        action: "CREATE",
        entityType: "PAYMENT",
        entityName: `${selectedLease?.tenants?.first_name ?? ""} ${selectedLease?.tenants?.last_name ?? ""}`,
        details: `${formData.amount} FCFA - ${formData.method}`,
      });
    }

    toast.success("Paiement enregistre avec succes !");
    router.push("/dashboard/payments");
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/dashboard/payments"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux paiements
      </Link>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Enregistrer un paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Bail (locataire — bien)</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.lease_id}
                onChange={(e) => updateField("lease_id", e.target.value)}
                required
              >
                <option value="">-- Selectionnez un bail --</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenants?.first_name} {lease.tenants?.last_name} — {lease.properties?.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant (FCFA)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="150000"
                  value={formData.amount}
                  onChange={(e) => updateField("amount", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Date d&apos;echeance</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => updateField("due_date", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Methode de paiement</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.method}
                onChange={(e) => updateField("method", e.target.value)}
              >
                <option value="CASH">Especes</option>
                <option value="TRANSFER">Virement bancaire</option>
                <option value="WAVE">Wave</option>
                <option value="ORANGE_MONEY">Orange Money</option>
              </select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Enregistrement..." : "Enregistrer le paiement"}
              </Button>
              <Link href="/dashboard/payments">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
