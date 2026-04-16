import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { Building2 } from "lucide-react";
import { BiensGrid } from "./biens-grid";
import type { PublicProperty } from "./biens-grid";

interface Props {
  params: Promise<{ slug: string }>;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
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

  const biens = (properties ?? []) as PublicProperty[];

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
            <p className="mt-4 text-muted-foreground">
              Aucun bien disponible pour le moment. Revenez bientôt.
            </p>
          </div>
        ) : (
          <BiensGrid biens={biens} orgName={typedOrg.name} />
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
