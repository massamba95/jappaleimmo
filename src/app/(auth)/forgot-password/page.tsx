"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, ArrowLeft } from "lucide-react";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("error") === "expired") {
      setError("Votre lien a expiré. Entrez votre email pour en recevoir un nouveau.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://jappaleimmo.com/api/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError("Erreur lors de l'envoi. Vérifiez votre email.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Jappalé Immo</span>
          </Link>
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
          <CardDescription>
            {sent
              ? "Vérifiez votre boîte email."
              : "Entrez votre email, nous vous enverrons un lien de réinitialisation."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Un email a été envoyé à{" "}
                  <span className="font-semibold text-foreground">{email}</span>.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Cliquez sur le lien reçu pour créer un nouveau mot de passe. Pensez à vérifier vos spams.
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Envoi en cours..." : "Envoyer le lien"}
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full gap-2 mt-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
