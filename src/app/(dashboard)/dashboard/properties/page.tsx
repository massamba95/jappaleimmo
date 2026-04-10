import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Home, Building, Store, MapPin } from "lucide-react";
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

const typeIcons: Record<string, typeof Home> = {
  APARTMENT: Building,
  HOUSE: Home,
  COMMERCIAL: Store,
  LAND: MapPin,
};

export default async function PropertiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes biens</h1>
          <p className="text-muted-foreground mt-1">
            Gerez votre patrimoine immobilier.
          </p>
        </div>
        <Link href="/dashboard/properties/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un bien
          </Button>
        </Link>
      </div>

      {!properties || properties.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Home className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun bien</h3>
            <p className="text-muted-foreground mt-1">
              Commencez par ajouter votre premier bien immobilier.
            </p>
            <Link href="/dashboard/properties/new" className="mt-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un bien
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {(properties as Property[]).map((property) => {
            const Icon = typeIcons[property.type] ?? Home;
            const status = statusConfig[property.status];
            return (
              <Link
                key={property.id}
                href={`/dashboard/properties/${property.id}`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{property.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {typeLabels[property.type]}
                          </p>
                        </div>
                      </div>
                      <Badge variant={status?.variant}>
                        {status?.label}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {property.address}, {property.city}
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <span className="text-sm text-muted-foreground">
                          Loyer mensuel
                        </span>
                        <span className="font-bold text-lg">
                          {property.rent_amount.toLocaleString("fr-FR")} FCFA
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
