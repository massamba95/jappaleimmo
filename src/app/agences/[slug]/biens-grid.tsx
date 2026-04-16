"use client";

import { useState } from "react";
import { Home, MapPin, DoorOpen, Ruler, MessageCircle } from "lucide-react";

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

export interface PublicProperty {
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

type FilterTab = "all" | "RENT" | "SALE";

export function BiensGrid({ biens, orgName }: { biens: PublicProperty[]; orgName: string }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const rentCount = biens.filter((b) => b.listing_type === "RENT" || b.listing_type === "BOTH").length;
  const saleCount = biens.filter((b) => b.listing_type === "SALE" || b.listing_type === "BOTH").length;
  const showTabs = rentCount > 0 && saleCount > 0;

  const filtered = biens.filter((b) => {
    if (activeTab === "RENT") return b.listing_type === "RENT" || b.listing_type === "BOTH";
    if (activeTab === "SALE") return b.listing_type === "SALE" || b.listing_type === "BOTH";
    return true;
  });

  return (
    <div>
      {showTabs && (
        <div className="flex gap-1 border-b mb-6">
          {([
            { key: "all",  label: `Tous (${biens.length})` },
            { key: "RENT", label: `Location (${rentCount})` },
            { key: "SALE", label: `Vente (${saleCount})` },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Home className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="mt-4 text-muted-foreground">Aucun bien dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((bien) => (
            <BienCard key={bien.id} bien={bien} orgName={orgName} />
          ))}
        </div>
      )}
    </div>
  );
}

function BienCard({ bien, orgName }: { bien: PublicProperty; orgName: string }) {
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
      {photo ? (
        <img src={photo} alt={bien.title} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 bg-muted flex items-center justify-center">
          <Home className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}

      <div className="p-4 space-y-3">
        <span className="inline-block text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {listingLabels[lt] ?? lt}
        </span>

        <h2 className="font-semibold text-base leading-tight">{bien.title}</h2>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{bien.address}, {bien.city}</span>
        </div>

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
