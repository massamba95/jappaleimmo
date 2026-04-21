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

export default function LocataireBienvenuePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  // true = utilisateur existant (magic link) → pas besoin de mot de passe
  const [isMagicLink, setIsMagicLink] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const searchParams = new URLSearchParams(window.location.search);
    const type = searchParams.get("type");
    const isMagic = type === "magiclink";
    setIsMagicLink(isMagic);

    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError("Lien expiré ou invalide.");
        } else if (isMagic) {
          // Utilisateur existant : redirection directe
          router.replace("/locataire");
        } else {
          setReady(true);
        }
      });
      return;
    }

    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token") ?? "";
      if (access_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (error) {
            setError("Lien expiré ou invalide.");
          } else {
            window.history.replaceState(null, "", window.location.pathname);
            if (isMagic) {
              router.replace("/locataire");
            } else {
              setReady(true);
            }
          }
        });
        return;
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (isMagic) {
          router.replace("/locataire");
        } else {
          setReady(true);
        }
      } else {
        setError("Lien invalide. Demandez une nouvelle invitation à votre agence.");
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
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
    setTimeout(() => router.push("/locataire"), 2000);
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
            {done ? "Compte activé" : "Bienvenue sur votre espace locataire"}
          </CardTitle>
          <CardDescription>
            {done
              ? "Redirection vers votre espace..."
              : isMagicLink
              ? "Connexion en cours..."
              : "Choisissez un mot de passe pour accéder à votre espace."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Votre espace est prêt. Vous pouvez à présent consulter votre bail, vos paiements et signaler un problème.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              {!error && !ready && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isMagicLink ? "Connexion en cours, redirection..." : "Vérification du lien..."}
                </p>
              )}
              {ready && !isMagicLink && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 8 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="Retapez le mot de passe"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Activation..." : "Activer mon espace"}
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
