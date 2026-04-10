import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Home, Ruler, DoorOpen } from "lucide-react";
import type { Property } from "@/types/database";

const typeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  COMMERCIAL: "Local commercial",
  LAND: "Terrain",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  AVAILABLE: { label: "Disponible", variant: "secondary" },
  OCCUPIED: { label: "Occupe", variant: "default" },
  MAINTENANCE: { label: "En travaux", variant: "destructive" },
};

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (!property) {
    notFound();
  }

  const p = property as Property;
  const status = statusConfig[p.status];

  const { data: leases } = await supabase
    .from("leases")
    .select("*, tenants(first_name, last_name, phone)")
    .eq("property_id", id)
    .eq("status", "ACTIVE");

  return (
    <div>
      <Link
        href="/dashboard/properties"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux biens
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{p.title}</h1>
          <p className="text-muted-foreground mt-1">
            {typeLabels[p.type]}
          </p>
        </div>
        <Badge variant={status?.variant} className="text-sm px-3 py-1">
          {status?.label}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="font-medium">{p.address}, {p.city}</p>
              </div>
            </div>
            {p.rooms && (
              <div className="flex items-center gap-3">
                <DoorOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Pieces</p>
                  <p className="font-medium">{p.rooms} pieces</p>
                </div>
              </div>
            )}
            {p.area && (
              <div className="flex items-center gap-3">
                <Ruler className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Superficie</p>
                  <p className="font-medium">{p.area} m2</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Loyer + charges</p>
                <p className="font-medium">
                  {p.rent_amount.toLocaleString("fr-FR")} + {p.charges.toLocaleString("fr-FR")} ={" "}
                  {(p.rent_amount + p.charges).toLocaleString("fr-FR")} FCFA/mois
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current tenant */}
        <Card>
          <CardHeader>
            <CardTitle>Locataire actuel</CardTitle>
          </CardHeader>
          <CardContent>
            {!leases || leases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun locataire actif</p>
                <Link href="/dashboard/leases" className="mt-4 inline-block">
                  <Button variant="outline" size="sm">
                    Creer un bail
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {leases.map((lease) => {
                  const tenant = lease.tenants as Record<string, string> | null;
                  return (
                    <div key={lease.id} className="p-4 border rounded-lg">
                      <p className="font-semibold">
                        {tenant?.first_name} {tenant?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Tel: {tenant?.phone}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Bail: {new Date(lease.start_date).toLocaleDateString("fr-FR")}
                        {lease.end_date && ` — ${new Date(lease.end_date).toLocaleDateString("fr-FR")}`}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {lease.rent_amount.toLocaleString("fr-FR")} FCFA/mois
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
