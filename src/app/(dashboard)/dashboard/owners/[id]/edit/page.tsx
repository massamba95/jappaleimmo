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
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function EditOwnerPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { orgId, userId, userName } = useOrg();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("owners").select("*").eq("id", id).single();
      if (data) {
        setFormData({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          email: data.email ?? "",
          notes: data.notes ?? "",
        });
      }
    }
    load();
  }, [id]);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("owners").update({
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      email: formData.email || null,
      notes: formData.notes || null,
    }).eq("id", id);

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
        entityType: "OWNER",
        entityId: id,
        entityName: `${formData.first_name} ${formData.last_name}`,
      });
    }

    toast.success("Propriétaire modifié !");
    router.push("/dashboard/owners");
    router.refresh();
  }

  return (
    <div>
      <Link href="/dashboard/owners" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />Retour aux propriétaires
      </Link>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Modifier le propriétaire</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input id="first_name" value={formData.first_name} onChange={(e) => updateField("first_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input id="last_name" value={formData.last_name} onChange={(e) => updateField("last_name", e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optionnel)</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>{loading ? "Modification..." : "Enregistrer"}</Button>
              <Link href="/dashboard/owners"><Button type="button" variant="outline">Annuler</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
