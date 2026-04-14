import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { Building2, MapPin, Home, Ruler, DoorOpen, Phone, MessageCircle } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

const typeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  COMMERCIAL: "Local commercial",
  LAND: "Terrain",
};

const listingLabels: Record<string, string> = {
  RENT: "Location",
  SALE: "Vente",
  BOTH: "Location / Vente",
};

interface Organization {
  id: string;
  name: string;
  slug: string;
}

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
  photos: string[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("slug", slug)
    .single();

  if (!org) return { title: "Agence introuvable — Jappalé Immo" };

  return {
    title: `${org.name} — Biens disponibles | Jappalé Immo`,
    description: `Découvrez les biens disponibles de ${org.name} sur Jappalé Immo.`,
  };
}

export default async function AgencePublicPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .in("status", ["ACTIVE", "TRIAL"])
    .single();

  if (!org) notFound();

  const typedOrg = org as Organization;

  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, type, listing_type, address, city, rooms, area, rent_amount, charges, sale_price, photos")
    .eq("org_id", typedOrg.id)
    .eq("status", "AVAILABLE")
    .order("created_at", { ascending: false });

  const biens = (properties ?? []) as Property[];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">{typedOrg.name}</span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Propulsé par <span className="font-semibold text-primary">Jappalé Immo</span>
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold sm:text-3xl">{typedOrg.name}</h1>
          <p className="mt-2 text-primary-foreground/80">
            {biens.length > 0
              ? `${biens.length} bien${biens.length > 1 ? "s" : ""} disponible${biens.length > 1 ? "s" : ""}`
              : "Aucun bien disponible pour le moment"}
          </p>
        </div>
      </section>

      {/* Biens */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {biens.length === 0 ? (
          <div className="text-center py-20">
            <Home className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="mt-4 text-muted-foreground">
              Aucun bien disponible pour le moment. Revenez bientôt.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {biens.map((bien) => (
              <BienCard key={bien.id} bien={bien} orgName={typedOrg.name} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        <p>
          Vitrine gérée via{" "}
          <a
            href="https://jappaleimmo.vercel.app"
            className="text-primary font-semibold hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Jappalé Immo
          </a>{" "}
          — Gestion immobilière au Sénégal
        </p>
      </footer>
    </div>
  );
}

function BienCard({ bien, orgName }: { bien: Property; orgName: string }) {
  const photo = bien.photos?.[0];
  const lt = bien.listing_type;

  const whatsappText = encodeURIComponent(
    `Bonjour, je suis intéressé(e) par ce bien :\n\n` +
    `📍 ${bien.title}\n` +
    `${typeLabels[bien.type] ?? bien.type} — ${bien.city}\n` +
    `${bien.address}\n` +
    (lt !== "SALE" && bien.rent_amount
      ? `💰 Loyer : ${bien.rent_amount.toLocaleString("fr-FR")} FCFA/mois\n`
      : "") +
    (lt !== "RENT" && bien.sale_price
      ? `💰 Prix : ${bien.sale_price.toLocaleString("fr-FR")} FCFA\n`
      : "") +
    `\nMerci de me recontacter. — Via vitrine ${orgName}`
  );

  return (
    <div className="bg-card rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo */}
      {photo ? (
        <img
          src={photo}
          alt={bien.title}
          className="w-full h-44 object-cover"
        />
      ) : (
        <div className="w-full h-44 bg-muted flex items-center justify-center">
          <Home className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Badge type annonce */}
        <span className="inline-block text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {listingLabels[lt] ?? lt}
        </span>

        <h2 className="font-semibold text-base leading-tight">{bien.title}</h2>

        {/* Localisation */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{bien.address}, {bien.city}</span>
        </div>

        {/* Caractéristiques */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {typeLabels[bien.type] ?? bien.type}
          </span>
          {bien.rooms && (
            <span className="flex items-center gap-1">
              <DoorOpen className="h-3.5 w-3.5" />{bien.rooms}p
            </span>
          )}
          {bien.area && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" />{bien.area}m²
            </span>
          )}
        </div>

        {/* Prix */}
        <div className="space-y-0.5">
          {(lt === "RENT" || lt === "BOTH") && bien.rent_amount > 0 && (
            <p className="font-bold text-primary">
              {bien.rent_amount.toLocaleString("fr-FR")} FCFA
              <span className="text-sm font-normal text-muted-foreground">/mois</span>
              {bien.charges > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  + {bien.charges.toLocaleString("fr-FR")} charges
                </span>
              )}
            </p>
          )}
          {(lt === "SALE" || lt === "BOTH") && bien.sale_price && (
            <p className="font-bold text-primary">
              {bien.sale_price.toLocaleString("fr-FR")} FCFA
              <span className="text-sm font-normal text-muted-foreground ml-1">(vente)</span>
            </p>
          )}
        </div>

        {/* Bouton WhatsApp */}
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Contacter sur WhatsApp
        </a>
      </div>
    </div>
  );
}
