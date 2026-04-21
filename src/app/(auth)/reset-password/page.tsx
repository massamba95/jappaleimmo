"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // PKCE flow: ?code= dans l'URL
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError("Lien expiré ou invalide.");
        else setReady(true);
      });
      return;
    }

    // Implicit flow: #access_token= dans le hash (lien admin)
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token") ?? "";
      if (access_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (error) setError("Lien expiré ou invalide.");
          else {
            window.history.replaceState(null, "", window.location.pathname);
            setReady(true);
          }
        });
        return;
      }
    }

    setError("Lien invalide. Demandez un nouveau lien.");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("Erreur lors de la mise à jour. Réessayez.");
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    // Redirige vers l'espace locataire si le compte est un locataire
    const { data: tenant } = await supabase.from("tenants").select("id").limit(1).maybeSingle();
    setTimeout(() => router.push(tenant ? "/locataire" : "/dashboard"), 2500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Jappalé Immo</span>
          </Link>
          <CardTitle className="text-2xl">
            {done ? "Mot de passe modifié" : "Nouveau mot de passe"}
          </CardTitle>
          <CardDescription>
            {done ? "Redirection en cours..." : "Choisissez un nouveau mot de passe."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">Votre mot de passe a été mis à jour avec succès.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                  {error.includes("invalide") && (
                    <div className="mt-2">
                      <Link href="/forgot-password" className="underline font-medium">
                        Demander un nouveau lien →
                      </Link>
                    </div>
                  )}
                </div>
              )}
              {!error && !ready && (
                <p className="text-sm text-muted-foreground text-center py-4">Vérification du lien...</p>
              )}
              {ready && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Nouveau mot de passe</Label>
                    <Input id="password" type="password" placeholder="Minimum 6 caractères"
                      value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                    <Input id="confirm" type="password" placeholder="Retapez le mot de passe"
                      value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Mise à jour..." : "Enregistrer"}
                  </Button>
                </>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
