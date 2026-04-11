"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const { orgId, orgName, role } = useOrg();
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });
  const [orgFormData, setOrgFormData] = useState({
    name: "",
  });

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setFormData({
          first_name: user.user_metadata?.first_name ?? "",
          last_name: user.user_metadata?.last_name ?? "",
          phone: user.user_metadata?.phone ?? "",
          email: user.email ?? "",
        });
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    if (orgName) setOrgFormData({ name: orgName });
  }, [orgName]);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      },
    });

    if (error) {
      toast.error("Erreur lors de la mise a jour du profil.");
    } else {
      toast.success("Profil mis a jour avec succes !");
    }
    setLoading(false);
  }

  async function handleOrgSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setOrgLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ name: orgFormData.name })
      .eq("id", orgId);

    if (error) {
      toast.error("Erreur lors de la mise a jour de l'organisation.");
    } else {
      toast.success("Organisation mise a jour !");
    }
    setOrgLoading(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Parametres</h1>
      <p className="text-muted-foreground mt-1">Gerez votre profil et votre organisation.</p>

      <Card className="mt-8 max-w-2xl">
        <CardHeader><CardTitle>Informations personnelles</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prenom</Label>
                <Input id="first_name" value={formData.first_name} onChange={(e) => updateField("first_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input id="last_name" value={formData.last_name} onChange={(e) => updateField("last_name", e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={formData.email} disabled />
              <p className="text-xs text-muted-foreground">L&apos;email ne peut pas etre modifie ici.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Mise a jour..." : "Enregistrer"}</Button>
          </form>
        </CardContent>
      </Card>

      {role === "ADMIN" && (
        <Card className="mt-6 max-w-2xl">
          <CardHeader><CardTitle>Organisation</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleOrgSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="org_name">Nom de l&apos;organisation</Label>
                <Input id="org_name" value={orgFormData.name} onChange={(e) => setOrgFormData({ name: e.target.value })} required />
              </div>
              <Button type="submit" disabled={orgLoading}>{orgLoading ? "Mise a jour..." : "Enregistrer"}</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
