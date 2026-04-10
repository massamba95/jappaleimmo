"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "APARTMENT",
    address: "",
    city: "Dakar",
    rooms: "",
    area: "",
    rent_amount: "",
    charges: "0",
    description: "",
  });

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("properties").insert({
      user_id: user!.id,
      title: formData.title,
      type: formData.type,
      address: formData.address,
      city: formData.city,
      rooms: formData.rooms ? parseInt(formData.rooms) : null,
      area: formData.area ? parseFloat(formData.area) : null,
      rent_amount: parseInt(formData.rent_amount),
      charges: parseInt(formData.charges) || 0,
      status: "AVAILABLE",
      photos: [],
    });

    if (error) {
      toast.error("Erreur lors de l'ajout du bien.");
      setLoading(false);
      return;
    }

    toast.success("Bien ajoute avec succes !");
    router.push("/dashboard/properties");
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/dashboard/properties"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux biens
      </Link>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Ajouter un bien</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Nom du bien</Label>
              <Input
                id="title"
                placeholder="Ex: Appartement F3 Almadies"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de bien</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.type}
                  onChange={(e) => updateField("type", e.target.value)}
                >
                  <option value="APARTMENT">Appartement</option>
                  <option value="HOUSE">Maison</option>
                  <option value="COMMERCIAL">Local commercial</option>
                  <option value="LAND">Terrain</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder="Dakar"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                placeholder="Adresse complete"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rooms">Nombre de pieces</Label>
                <Input
                  id="rooms"
                  type="number"
                  placeholder="3"
                  value={formData.rooms}
                  onChange={(e) => updateField("rooms", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Superficie (m2)</Label>
                <Input
                  id="area"
                  type="number"
                  placeholder="75"
                  value={formData.area}
                  onChange={(e) => updateField("area", e.target.value)}
                />
              </div>
            </div>

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
                <Label htmlFor="charges">Charges (FCFA)</Label>
                <Input
                  id="charges"
                  type="number"
                  placeholder="0"
                  value={formData.charges}
                  onChange={(e) => updateField("charges", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Ajout en cours..." : "Ajouter le bien"}
              </Button>
              <Link href="/dashboard/properties">
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
