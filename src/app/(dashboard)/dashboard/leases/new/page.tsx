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
import { ArrowLeft, Building2, MapPin, DoorOpen, Ruler, User } from "lucide-react";
import { toast } from "sonner";

interface PropertyOption {
  id: string;
  title: string;
  type: string;
  address: string;
  city: string;
  rooms: number | null;
  area: number | null;
  rent_amount: number;
  charges: number;
  status: string;
  parent: { id: string; title: string } | null;
}

interface TenantOption {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
}

const typeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  COMMERCIAL: "Local commercial",
  LAND: "Terrain",
};

export default function NewLeasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyOption | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantOption | null>(null);
  const [formData, setFormData] = useState({
    property_id: "",
    tenant_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    rent_amount: "",
    deposit: "0",
  });

  const { orgId, userId, userName } = useOrg();

  useEffect(() => {
    if (!orgId) return;
    async function loadData() {
      const supabase = createClient();

      const [propertiesRes, tenantsRes] = await Promise.all([
        supabase
          .from("properties")
          .select("id, title, type, address, city, rooms, area, rent_amount, charges, status, parent:parent_id(id, title)")
          .eq("org_id", orgId!)
          .neq("type", "BUILDING")
          .order("title"),
        supabase
          .from("tenants")
          .select("id, first_name, last_name, phone, email")
          .eq("org_id", orgId!)
          .order("last_name"),
      ]);

      setProperties((propertiesRes.data ?? []) as unknown as PropertyOption[]);
      setTenants(tenantsRes.data ?? []);
    }
    loadData();
  }, [orgId]);

  function selectProperty(propertyId: string) {
    const property = properties.find((p) => p.id === propertyId);
    setSelectedProperty(property ?? null);
    setFormData((prev) => ({
      ...prev,
      property_id: propertyId,
      rent_amount: property?.rent_amount.toString() ?? "",
      deposit: property?.rent_amount.toString() ?? "0",
    }));
  }

  function selectTenant(tenantId: string) {
    const tenant = tenants.find((t) => t.id === tenantId);
    setSelectedTenant(tenant ?? null);
    setFormData((prev) => ({ ...prev, tenant_id: tenantId }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.property_id || !formData.tenant_id) {
      toast.error("Veuillez selectionner un bien et un locataire.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Verifier qu'il n'y a pas deja un bail actif sur ce bien
    const { count: activeLeasesCount } = await supabase
      .from("leases")
      .select("*", { count: "exact", head: true })
      .eq("property_id", formData.property_id)
      .eq("status", "ACTIVE");

    if (activeLeasesCount && activeLeasesCount > 0) {
      toast.error("Ce bien a deja un bail actif. Resiliez ou expirez l'ancien bail d'abord.");
      setLoading(false);
      return;
    }

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

    await supabase
      .from("properties")
      .update({ status: "OCCUPIED" })
      .eq("id", formData.property_id);

    await logActivity({
      orgId: orgId!,
      userId: userId!,
      userName: userName ?? "Utilisateur",
      action: "CREATE",
      entityType: "LEASE",
      entityName: `${selectedProperty?.title ?? ""} - ${selectedTenant?.first_name ?? ""} ${selectedTenant?.last_name ?? ""}`,
      details: `Loyer: ${formData.rent_amount} FCFA`,
    });

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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulaire */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Creer un bail</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bien */}
              <div className="space-y-2">
                <Label>Bien immobilier</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.property_id}
                  onChange={(e) => selectProperty(e.target.value)}
                  required
                >
                  <option value="">-- Selectionnez un bien --</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.parent ? `${property.parent.title} · ` : ""}{property.title} — {property.city} ({property.rent_amount.toLocaleString("fr-FR")} FCFA)
                    </option>
                  ))}
                </select>
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
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.tenant_id}
                  onChange={(e) => selectTenant(e.target.value)}
                  required
                >
                  <option value="">-- Selectionnez un locataire --</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name} — {tenant.phone}
                    </option>
                  ))}
                </select>
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Date de fin (optionnel)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, rent_amount: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, deposit: e.target.value }))}
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

        {/* Panneau lateral : details */}
        <div className="space-y-6">
          {/* Details du bien selectionne */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5" />
                Bien selectionne
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedProperty ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selectionnez un bien pour voir ses details
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{selectedProperty.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {typeLabels[selectedProperty.type] ?? selectedProperty.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedProperty.address}, {selectedProperty.city}</span>
                  </div>
                  {selectedProperty.rooms && (
                    <div className="flex items-center gap-2 text-sm">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedProperty.rooms} pieces</span>
                    </div>
                  )}
                  {selectedProperty.area && (
                    <div className="flex items-center gap-2 text-sm">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedProperty.area} m2</span>
                    </div>
                  )}
                  <div className="pt-3 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Loyer</span>
                      <span className="font-semibold">{selectedProperty.rent_amount.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Charges</span>
                      <span>{selectedProperty.charges.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1 border-t">
                      <span>Total</span>
                      <span>{(selectedProperty.rent_amount + selectedProperty.charges).toLocaleString("fr-FR")} FCFA</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedProperty.status === "AVAILABLE"
                        ? "bg-green-100 text-green-700"
                        : selectedProperty.status === "OCCUPIED"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {selectedProperty.status === "AVAILABLE" ? "Disponible" :
                       selectedProperty.status === "OCCUPIED" ? "Occupe" : "En travaux"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details du locataire selectionne */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5" />
                Locataire selectionne
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedTenant ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selectionnez un locataire pour voir ses details
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-lg">
                    {selectedTenant.first_name} {selectedTenant.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tel : {selectedTenant.phone}
                  </p>
                  {selectedTenant.email && (
                    <p className="text-sm text-muted-foreground">
                      Email : {selectedTenant.email}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
