"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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

interface PropertyOption {
  id: string;
  title: string;
  rent_amount: number;
  city: string;
}

interface TenantOption {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export default function NewLeasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [formData, setFormData] = useState({
    property_id: "",
    tenant_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    rent_amount: "",
    deposit: "0",
  });

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [propertiesRes, tenantsRes] = await Promise.all([
        supabase
          .from("properties")
          .select("id, title, rent_amount, city")
          .eq("user_id", user.id)
          .order("title"),
        supabase
          .from("tenants")
          .select("id, first_name, last_name, phone")
          .eq("user_id", user.id)
          .order("last_name"),
      ]);

      setProperties(propertiesRes.data ?? []);
      setTenants(tenantsRes.data ?? []);
    }
    loadData();
  }, []);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "property_id") {
      const property = properties.find((p) => p.id === value);
      if (property) {
        setFormData((prev) => ({
          ...prev,
          property_id: value,
          rent_amount: property.rent_amount.toString(),
          deposit: property.rent_amount.toString(),
        }));
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.property_id || !formData.tenant_id) {
      toast.error("Veuillez selectionner un bien et un locataire.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Creer le bail
    const { error: leaseError } = await supabase.from("leases").insert({
      property_id: formData.property_id,
      tenant_id: formData.tenant_id,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      rent_amount: parseInt(formData.rent_amount),
      deposit: parseInt(formData.deposit) || 0,
      status: "ACTIVE",
    });

    if (leaseError) {
      toast.error("Erreur lors de la creation du bail.");
      console.error(leaseError);
      setLoading(false);
      return;
    }

    // Mettre a jour le statut du bien en OCCUPIED
    await supabase
      .from("properties")
      .update({ status: "OCCUPIED" })
      .eq("id", formData.property_id);

    toast.success("Bail cree avec succes !");
    router.push("/dashboard/leases");
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/dashboard/leases"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux baux
      </Link>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Creer un bail</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bien */}
            <div className="space-y-2">
              <Label>Bien immobilier</Label>
              <Select
                value={formData.property_id}
                onValueChange={(v) => v && updateField("property_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez un bien" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.title} — {property.city} ({property.rent_amount.toLocaleString("fr-FR")} FCFA)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {properties.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun bien disponible.{" "}
                  <Link href="/dashboard/properties/new" className="text-primary hover:underline">
                    Ajouter un bien
                  </Link>
                </p>
              )}
            </div>

            {/* Locataire */}
            <div className="space-y-2">
              <Label>Locataire</Label>
              <Select
                value={formData.tenant_id}
                onValueChange={(v) => v && updateField("tenant_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez un locataire" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name} — {tenant.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tenants.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun locataire disponible.{" "}
                  <Link href="/dashboard/tenants/new" className="text-primary hover:underline">
                    Ajouter un locataire
                  </Link>
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de debut</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => updateField("start_date", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin (optionnel)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => updateField("end_date", e.target.value)}
                />
              </div>
            </div>

            {/* Montants */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent_amount">Loyer mensuel (FCFA)</Label>
                <Input
                  id="rent_amount"
                  type="number"
                  placeholder="150000"
                  value={formData.rent_amount}
                  onChange={(e) => updateField("rent_amount", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit">Caution (FCFA)</Label>
                <Input
                  id="deposit"
                  type="number"
                  placeholder="150000"
                  value={formData.deposit}
                  onChange={(e) => updateField("deposit", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creation en cours..." : "Creer le bail"}
              </Button>
              <Link href="/dashboard/leases">
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
