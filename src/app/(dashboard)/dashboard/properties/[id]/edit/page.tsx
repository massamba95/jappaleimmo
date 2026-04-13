"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { logActivity } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function EditPropertyPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { orgId, userId, userName } = useOrg();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [owners, setOwners] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    type: "APARTMENT",
    listing_type: "RENT",
    address: "",
    city: "",
    rooms: "",
    area: "",
    rent_amount: "",
    charges: "0",
    sale_price: "",
    owner_id: "",
    status: "AVAILABLE",
    photos: [] as string[],
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data }, { data: ownersData }] = await Promise.all([
        supabase.from("properties").select("*, owners(id)").eq("id", id).single(),
        supabase.from("owners").select("id, first_name, last_name").order("first_name"),
      ]);
      if (data) {
        setFormData({
          title: data.title,
          type: data.type,
          listing_type: data.listing_type ?? "RENT",
          address: data.address,
          city: data.city,
          rooms: data.rooms?.toString() ?? "",
          area: data.area?.toString() ?? "",
          rent_amount: data.rent_amount.toString(),
          charges: data.charges.toString(),
          sale_price: data.sale_price?.toString() ?? "",
          owner_id: data.owner_id ?? "",
          status: data.status,
          photos: data.photos ?? [],
        });
      }
      setOwners(ownersData ?? []);
    }
    load();
  }, [id]);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const fileName = `${id}/${Date.now()}-${file.name}`;
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

      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, urlData.publicUrl],
      }));
    }

    setUploading(false);
    toast.success("Photo(s) ajoutee(s) !");
  }

  function removePhoto(index: number) {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("properties")
      .update({
        title: formData.title,
        type: formData.type,
        listing_type: formData.listing_type,
        address: formData.address,
        city: formData.city,
        rooms: formData.rooms ? parseInt(formData.rooms) : null,
        area: formData.area ? parseFloat(formData.area) : null,
        rent_amount: formData.rent_amount ? parseInt(formData.rent_amount) : 0,
        charges: parseInt(formData.charges) || 0,
        sale_price: formData.sale_price ? parseInt(formData.sale_price) : null,
        owner_id: formData.owner_id || null,
        status: formData.status,
        photos: formData.photos,
      })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la modification.");
      setLoading(false);
      return;
    }

    if (orgId && userId) {
      await logActivity({
        orgId, userId,
        userName: userName ?? "Utilisateur",
        action: "UPDATE",
        entityType: "PROPERTY",
        entityId: id,
        entityName: formData.title,
      });
    }

    toast.success("Bien modifie avec succes !");
    router.push(`/dashboard/properties/${id}`);
    router.refresh();
  }

  return (
    <div>
      <Link href={`/dashboard/properties/${id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />Retour au bien
      </Link>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Modifier le bien</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Nom du bien</Label>
              <Input id="title" value={formData.title} onChange={(e) => updateField("title", e.target.value)} required />
            </div>

            {/* Type annonce */}
            <div className="space-y-2">
              <Label>Type d&apos;annonce</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "RENT", label: "Location" },
                  { value: "SALE", label: "Vente" },
                  { value: "BOTH", label: "Les deux" },
                ].map((opt) => (
                  <button key={opt.value} type="button"
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${formData.listing_type === opt.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    onClick={() => updateField("listing_type", opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de bien</Label>
                <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formData.type} onChange={(e) => updateField("type", e.target.value)}>
                  <option value="APARTMENT">Appartement</option>
                  <option value="HOUSE">Maison</option>
                  <option value="COMMERCIAL">Local commercial</option>
                  <option value="LAND">Terrain</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formData.status} onChange={(e) => updateField("status", e.target.value)}>
                  <option value="AVAILABLE">Disponible</option>
                  <option value="OCCUPIED">Occupé</option>
                  <option value="MAINTENANCE">En travaux</option>
                  <option value="SOLD">Vendu</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={formData.address} onChange={(e) => updateField("address", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={formData.city} onChange={(e) => updateField("city", e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rooms">Nombre de pièces</Label>
                <Input id="rooms" type="number" value={formData.rooms} onChange={(e) => updateField("rooms", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Superficie (m²)</Label>
                <Input id="area" type="number" value={formData.area} onChange={(e) => updateField("area", e.target.value)} />
              </div>
            </div>

            {(formData.listing_type === "RENT" || formData.listing_type === "BOTH") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent_amount">Loyer mensuel (FCFA)</Label>
                  <Input id="rent_amount" type="number" value={formData.rent_amount} onChange={(e) => updateField("rent_amount", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="charges">Charges (FCFA)</Label>
                  <Input id="charges" type="number" value={formData.charges} onChange={(e) => updateField("charges", e.target.value)} />
                </div>
              </div>
            )}

            {(formData.listing_type === "SALE" || formData.listing_type === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="sale_price">Prix de vente (FCFA)</Label>
                <Input id="sale_price" type="number" value={formData.sale_price} onChange={(e) => updateField("sale_price", e.target.value)} />
              </div>
            )}

            {/* Propriétaire */}
            <div className="space-y-2">
              <Label>Propriétaire du bien</Label>
              <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={formData.owner_id} onChange={(e) => updateField("owner_id", e.target.value)}>
                <option value="">— Nous-mêmes / Non renseigné</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>
                ))}
              </select>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label>Photos</Label>
              {formData.photos.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {formData.photos.map((url, i) => (
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

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? "Modification..." : "Enregistrer"}</Button>
              <Link href={`/dashboard/properties/${id}`}>
                <Button type="button" variant="outline">Annuler</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
