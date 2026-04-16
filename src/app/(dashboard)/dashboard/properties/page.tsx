"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/dashboard/search-bar";
import { Plus, Home, Building, Store, MapPin } from "lucide-react";

interface Property {
  id: string;
  title: string;
  type: string;
  listing_type: string;
  address: string;
  city: string;
  rooms: number | null;
  area: number | null;
  rent_amount: number;
  charges: number;
  sale_price: number | null;
  status: string;
  photos: string[];
  created_at: string;
}

const typeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  COMMERCIAL: "Local commercial",
  LAND: "Terrain",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  AVAILABLE: { label: "Disponible", variant: "secondary" },
  OCCUPIED: { label: "Occupé", variant: "default" },
  MAINTENANCE: { label: "En travaux", variant: "destructive" },
  SOLD: { label: "Vendu", variant: "outline" },
};

const listingConfig: Record<string, { label: string; color: string }> = {
  RENT: { label: "Location", color: "text-blue-600 bg-blue-50" },
  SALE: { label: "Vente", color: "text-orange-600 bg-orange-50" },
  BOTH: { label: "Location + Vente", color: "text-purple-600 bg-purple-50" },
};

const typeIcons: Record<string, typeof Home> = {
  APARTMENT: Building,
  HOUSE: Home,
  COMMERCIAL: Store,
  LAND: MapPin,
};

export default function PropertiesPage() {
  const { orgId, role } = useOrg();
  const canCreate = hasPermission(role, "properties:create");
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "RENT" | "SALE" | "SOLD">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      const supabase = createClient();

      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });

      setProperties(data ?? []);
      setLoading(false);
    }
    load();
  }, [orgId]);

  const tabFiltered = properties.filter((p) => {
    if (activeTab === "SOLD") return p.status === "SOLD";
    if (activeTab === "RENT") return p.listing_type === "RENT" && p.status !== "SOLD";
    if (activeTab === "SALE") return (p.listing_type === "SALE" || p.listing_type === "BOTH") && p.status !== "SOLD";
    return true;
  });

  const filtered = tabFiltered.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      typeLabels[p.type]?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes biens</h1>
          <p className="text-muted-foreground mt-1">Gerez votre patrimoine immobilier.</p>
        </div>
        {canCreate && (
          <Link href="/dashboard/properties/new">
            <Button><Plus className="h-4 w-4 mr-2" />Ajouter un bien</Button>
          </Link>
        )}
      </div>

      {properties.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex gap-1 border-b">
            {(["all", "RENT", "SALE", "SOLD"] as const).map((tab) => {
              const labels = { all: "Tous", RENT: "Location", SALE: "Vente", SOLD: "Vendus" };
              const count = tab === "all" ? properties.length
                : tab === "SOLD" ? properties.filter((p) => p.status === "SOLD").length
                : tab === "RENT" ? properties.filter((p) => p.listing_type === "RENT" && p.status !== "SOLD").length
                : properties.filter((p) => (p.listing_type === "SALE" || p.listing_type === "BOTH") && p.status !== "SOLD").length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {labels[tab]} <span className="ml-1 text-xs opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un bien..." />
        </div>
      )}

      {properties.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Home className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun bien</h3>
            <p className="text-muted-foreground mt-1">Commencez par ajouter votre premier bien immobilier.</p>
            <Link href="/dashboard/properties/new" className="mt-4">
              <Button><Plus className="h-4 w-4 mr-2" />Ajouter un bien</Button>
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Aucun resultat pour &quot;{search}&quot;</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filtered.map((property) => {
            const Icon = typeIcons[property.type] ?? Home;
            const status = statusConfig[property.status];
            return (
              <Link key={property.id} href={`/dashboard/properties/${property.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{property.title}</h3>
                          <p className="text-sm text-muted-foreground">{typeLabels[property.type]}</p>
                        </div>
                      </div>
                      <Badge variant={status?.variant}>{status?.label}</Badge>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {property.address}, {property.city}
                      </div>
                      <div className="mt-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${listingConfig[property.listing_type ?? "RENT"]?.color ?? "text-blue-600 bg-blue-50"}`}>
                          {listingConfig[property.listing_type ?? "RENT"]?.label ?? "Location"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        {(property.listing_type === "RENT" || property.listing_type === "BOTH" || !property.listing_type) && (
                          <span className="text-sm font-bold">{property.rent_amount.toLocaleString("fr-FR")} <span className="text-muted-foreground font-normal">FCFA/mois</span></span>
                        )}
                        {property.listing_type === "SALE" && property.sale_price && (
                          <span className="text-sm font-bold">{property.sale_price.toLocaleString("fr-FR")} <span className="text-muted-foreground font-normal">FCFA</span></span>
                        )}
                        {property.listing_type === "BOTH" && property.sale_price && (
                          <span className="text-xs text-muted-foreground">Vente: {property.sale_price.toLocaleString("fr-FR")} FCFA</span>
                        )}
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
