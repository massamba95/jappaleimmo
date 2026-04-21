"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { getPlanLimits } from "@/lib/plans";
import { logActivity } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, Upload, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Owner {
  id: string;
  first_name: string;
  last_name: string;
}

interface Building {
  id: string;
  title: string;
  address: string;
  city: string;
}

export default function NewPropertyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgId, orgPlan, userId, userName } = useOrg();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const tempId = useRef(crypto.randomUUID());
  const [limitReached, setLimitReached] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    type: "APARTMENT",
    listing_type: "RENT",
    address: "",
    city: "Dakar",
    rooms: "",
    area: "",
    rent_amount: "",
    charges: "0",
    sale_price: "",
    owner_id: "",
    parent_id: searchParams.get("parent") ?? "",
    unit_label: "",
    floor: "",
  });

  useEffect(() => {
    if (!orgId) return;
    async function init() {
      const supabase = createClient();
      const [{ count }, { data: ownersData }, { data: buildingsData }] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true })
          .eq("org_id", orgId!).neq("type", "BUILDING"),
        supabase.from("owners").select("id, first_name, last_name").eq("org_id", orgId!).order("first_name"),
        supabase.from("properties").select("id, title, address, city")
          .eq("org_id", orgId!).eq("type", "BUILDING").order("title"),
      ]);
      const limits = getPlanLimits(orgPlan ?? "FREE");
      setLimitReached((count ?? 0) >= limits.maxProperties);
      setOwners(ownersData ?? []);
      setBuildings(buildingsData ?? []);
    }
    init();
  }, [orgId, orgPlan]);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  const isBuilding = formData.type === "BUILDING";

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const fileName = `${tempId.current}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("property-photos")
        .upload(fileName, file);

      if (error) {
        toast.error(`Erreur upload: ${file.name}`);
        console.error(error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("property-photos")
        .getPublicUrl(fileName);

      setPhotos((prev) => [...prev, urlData.publicUrl]);
    }

    setUploading(false);
    toast.success("Photo(s) ajoutée(s) !");
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || limitReached) return;

    if (!isBuilding) {
      const lt = formData.listing_type;
      if ((lt === "RENT" || lt === "BOTH") && !formData.rent_amount) {
        toast.error("Le loyer mensuel est requis pour une location.");
        return;
      }
      if ((lt === "SALE" || lt === "BOTH") && !formData.sale_price) {
        toast.error("Le prix de vente est requis pour une vente.");
        return;
      }
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("properties").insert({
      user_id: user!.id,
      org_id: orgId,
      title: formData.title,
      type: formData.type,
      listing_type: isBuilding ? "RENT" : formData.listing_type,
      address: formData.address,
      city: formData.city,
      rooms: formData.rooms ? parseInt(formData.rooms) : null,
      area: formData.area ? parseFloat(formData.area) : null,
      rent_amount: isBuilding ? 0 : (formData.rent_amount ? parseInt(formData.rent_amount) : 0),
      charges: isBuilding ? 0 : (parseInt(formData.charges) || 0),
      sale_price: isBuilding ? null : (formData.sale_price ? parseInt(formData.sale_price) : null),
      owner_id: formData.owner_id || null,
      parent_id: formData.parent_id || null,
      unit_label: formData.unit_label || null,
      floor: formData.floor ? parseInt(formData.floor) : null,
      status: "AVAILABLE",
      photos: photos,
    });

    if (error) {
      const msg = error.message?.includes("Limite de")
        ? error.message
        : "Erreur lors de l'ajout du bien.";
      toast.error(msg);
      setLoading(false);
      return;
    }

    const listingLabel = { RENT: "Location", SALE: "Vente", BOTH: "Location + Vente" }[formData.listing_type];
    await logActivity({
      orgId: orgId!,
      userId: userId!,
      userName: userName ?? "Utilisateur",
      action: "CREATE",
      entityType: "PROPERTY",
      entityName: formData.title,
      details: `${formData.type} - ${formData.city} - ${listingLabel}`,
    });

    toast.success("Bien ajouté avec succès !");
    router.push("/dashboard/properties");
    router.refresh();
  }

  const limits = getPlanLimits(orgPlan ?? "FREE");

  if (limitReached && !isBuilding) {
    return (
      <div>
        <Link href="/dashboard/properties" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />Retour aux biens
        </Link>
        <Card className="max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
            <h3 className="mt-4 text-lg font-semibold">Limite atteinte</h3>
            <p className="text-muted-foreground mt-2 text-center">
              Vous avez atteint la limite de <strong>{limits.maxProperties} bien(s)</strong> pour le plan <strong>{limits.label}</strong>.
            </p>
            <Link href="/dashboard/properties" className="mt-6">
              <Button variant="outline">Retour aux biens</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lt = formData.listing_type;

  return (
    <div>
      <Link href="/dashboard/properties" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />Retour aux biens
      </Link>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Ajouter un bien</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Type de bien */}
            <div className="space-y-2">
              <Label>Type de bien</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "APARTMENT", label: "Appartement" },
                  { value: "HOUSE", label: "Maison" },
                  { value: "BUILDING", label: "Immeuble / Résidence" },
                  { value: "COMMERCIAL", label: "Local commercial" },
                  { value: "LAND", label: "Terrain" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${formData.type === opt.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    onClick={() => updateField("type", opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {isBuilding && (
                <p className="text-xs text-muted-foreground mt-1">
                  L&apos;immeuble est un conteneur. Les appartements seront ajoutés à l&apos;intérieur et comptent chacun comme 1 bien.
                </p>
              )}
            </div>

            {/* Rattacher à un immeuble (seulement pour les unités) */}
            {!isBuilding && buildings.length > 0 && (
              <div className="space-y-2">
                <Label>Rattacher à un immeuble (optionnel)</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={formData.parent_id}
                  onChange={(e) => updateField("parent_id", e.target.value)}
                >
                  <option value="">— Bien indépendant</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.title} — {b.city}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Label unité + étage si rattaché */}
            {!isBuilding && formData.parent_id && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_label">Libellé de l&apos;unité</Label>
                  <Input id="unit_label" placeholder="Ex: Appt 3B, F3 Étage 2" value={formData.unit_label} onChange={(e) => updateField("unit_label", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Étage</Label>
                  <Input id="floor" type="number" placeholder="1" value={formData.floor} onChange={(e) => updateField("floor", e.target.value)} />
                </div>
              </div>
            )}

            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="title">{isBuilding ? "Nom de l'immeuble" : "Nom du bien"}</Label>
              <Input
                id="title"
                placeholder={isBuilding ? "Ex: Résidence Les Almadies" : "Ex: Appartement F3 Almadies"}
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                required
              />
            </div>

            {/* Type annonce — masqué pour BUILDING */}
            {!isBuilding && (
              <div className="space-y-2">
                <Label>Type d&apos;annonce</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "RENT", label: "Location", sub: "Loyer mensuel" },
                    { value: "SALE", label: "Vente", sub: "Prix de vente" },
                    { value: "BOTH", label: "Les deux", sub: "Location + Vente" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`p-3 rounded-lg border text-sm font-medium text-center transition-colors ${formData.listing_type === opt.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                      onClick={() => updateField("listing_type", opt.value)}
                    >
                      {opt.label}
                      <p className="text-xs mt-1 opacity-75">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ville + adresse */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" placeholder="Dakar" value={formData.city} onChange={(e) => updateField("city", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" placeholder="Adresse complète" value={formData.address} onChange={(e) => updateField("address", e.target.value)} required />
              </div>
            </div>

            {/* Pièces + superficie — masqué pour BUILDING */}
            {!isBuilding && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rooms">Nombre de pièces</Label>
                  <Input id="rooms" type="number" placeholder="3" value={formData.rooms} onChange={(e) => updateField("rooms", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Superficie (m²)</Label>
                  <Input id="area" type="number" placeholder="75" value={formData.area} onChange={(e) => updateField("area", e.target.value)} />
                </div>
              </div>
            )}

            {/* Prix — masqué pour BUILDING */}
            {!isBuilding && (lt === "RENT" || lt === "BOTH") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent_amount">Loyer mensuel (FCFA)</Label>
                  <Input id="rent_amount" type="number" placeholder="150000" value={formData.rent_amount} onChange={(e) => updateField("rent_amount", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="charges">Charges (FCFA)</Label>
                  <Input id="charges" type="number" placeholder="0" value={formData.charges} onChange={(e) => updateField("charges", e.target.value)} />
                </div>
              </div>
            )}

            {!isBuilding && (lt === "SALE" || lt === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="sale_price">Prix de vente (FCFA)</Label>
                <Input id="sale_price" type="number" placeholder="25000000" value={formData.sale_price} onChange={(e) => updateField("sale_price", e.target.value)} />
              </div>
            )}

            {/* Propriétaire */}
            <div className="space-y-2">
              <Label>Propriétaire du bien (optionnel)</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={formData.owner_id}
                onChange={(e) => updateField("owner_id", e.target.value)}
              >
                <option value="">— Nous-mêmes / Non renseigné</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>
                ))}
              </select>
              {owners.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  <Link href="/dashboard/owners/new" className="underline">Ajouter un propriétaire</Link> pour l&apos;associer à ce bien.
                </p>
              )}
            </div>

            {/* Photos — masqué pour BUILDING */}
            {!isBuilding && (
              <div className="space-y-2">
                <Label>Photos</Label>
                {photos.length > 0 && (
                  <div className="flex gap-3 flex-wrap">
                    {photos.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Photo ${i + 1}`} className="h-24 w-36 object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors">
                      <Upload className="h-4 w-4" />
                      {uploading ? "Upload en cours..." : "Ajouter des photos"}
                    </div>
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? "Ajout en cours..." : isBuilding ? "Créer l'immeuble" : "Ajouter le bien"}</Button>
              <Link href="/dashboard/properties"><Button type="button" variant="outline">Annuler</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
