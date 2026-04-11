"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";

type Mode = "choose" | "create" | "join";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [formData, setFormData] = useState({
    orgName: "",
    inviteCode: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Si mode "join", verifier le code d'invitation d'abord
    let orgToJoin: { id: string; name: string } | null = null;
    if (mode === "join") {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("invite_code", formData.inviteCode.toUpperCase().trim())
        .single();

      if (!org) {
        setError("Code d'invitation invalide. Verifiez aupres de votre employeur.");
        setLoading(false);
        return;
      }
      orgToJoin = org;
    }

    // 1. Creer le compte utilisateur
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        },
      },
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Erreur lors de l'inscription.");
      setLoading(false);
      return;
    }

    if (mode === "create") {
      // 2a. Creer l'organisation
      const slug = generateSlug(formData.orgName) + "-" + Date.now().toString(36);
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: formData.orgName,
          slug: slug,
          plan: "FREE",
          status: "TRIAL",
          max_properties: 20,
          max_members: 3,
          trial_ends_at: trialEnds.toISOString(),
          invite_code: inviteCode,
        })
        .select("id")
        .single();

      if (orgError || !org) {
        console.error("Org creation error:", orgError);
        setError(`Erreur organisation: ${orgError?.message ?? "inconnue"}`);
        setLoading(false);
        return;
      }

      // 3a. Creer le membership (ADMIN)
      const { error: memberError } = await supabase.from("memberships").insert({
        org_id: org.id,
        user_id: authData.user.id,
        role: "ADMIN",
      });

      if (memberError) {
        console.error("Membership error:", memberError);
        setError(`Erreur membership: ${memberError?.message ?? "inconnue"}`);
        setLoading(false);
        return;
      }
    } else if (mode === "join" && orgToJoin) {
      // 2b. Rejoindre l'organisation existante
      const { error: memberError } = await supabase.from("memberships").insert({
        org_id: orgToJoin.id,
        user_id: authData.user.id,
        role: "AGENT",
      });

      if (memberError) {
        console.error("Membership error:", memberError);
        setError(`Erreur: ${memberError?.message ?? "inconnue"}`);
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  // Ecran de choix
  if (mode === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Jappalé Immo</span>
            </Link>
            <h1 className="text-2xl font-bold mt-4">Comment souhaitez-vous commencer ?</h1>
          </div>

          <div className="grid gap-4">
            <Card
              className="cursor-pointer hover:shadow-md hover:border-primary transition-all"
              onClick={() => setMode("create")}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Creer mon organisation</h3>
                  <p className="text-sm text-muted-foreground">
                    Je suis proprietaire ou directeur d&apos;agence. Je veux gerer mes biens.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md hover:border-primary transition-all"
              onClick={() => setMode("join")}
            >
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Rejoindre une equipe</h3>
                  <p className="text-sm text-muted-foreground">
                    Mon employeur m&apos;a donne un code d&apos;invitation pour rejoindre son equipe.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Deja un compte ?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulaire d'inscription
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Jappalé Immo</span>
          </Link>
          <CardTitle className="text-2xl">
            {mode === "create" ? "Creer mon organisation" : "Rejoindre une equipe"}
          </CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Creez votre espace pour gerer vos biens immobiliers."
              : "Entrez le code d'invitation fourni par votre employeur."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {mode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="orgName">Nom de votre agence / entreprise</Label>
                <Input
                  id="orgName"
                  placeholder="Ex: Agence Diallo Immobilier"
                  value={formData.orgName}
                  onChange={(e) => updateField("orgName", e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Proprietaire individuel ? Mettez votre nom.
                </p>
              </div>
            )}

            {mode === "join" && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Code d&apos;invitation</Label>
                <Input
                  id="inviteCode"
                  placeholder="Ex: A1B2C3D4"
                  value={formData.inviteCode}
                  onChange={(e) => updateField("inviteCode", e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-widest"
                  maxLength={10}
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prenom</Label>
                <Input id="firstName" placeholder="Moussa" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" placeholder="Diop" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input id="phone" type="tel" placeholder="+221 77 123 45 67" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="votre@email.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" placeholder="Minimum 6 caracteres" value={formData.password} onChange={(e) => updateField("password", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input id="confirmPassword" type="password" placeholder="Confirmez le mot de passe" value={formData.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Inscription en cours..." : mode === "create" ? "Creer mon organisation" : "Rejoindre l'equipe"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => { setMode("choose"); setError(""); }} className="text-sm text-primary hover:underline">
              Retour au choix
            </button>
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Deja un compte ?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
