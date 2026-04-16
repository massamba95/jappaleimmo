"use client";

import { useState, useEffect } from "react";
import { useOrg } from "@/lib/hooks/use-org";
import { PLANS } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Clock, Home, Users, CreditCard } from "lucide-react";
import { toast } from "sonner";

type PlanKey = "FREE" | "PRO" | "AGENCY" | "ENTERPRISE";
const PLAN_ORDER: PlanKey[] = ["FREE", "PRO", "AGENCY", "ENTERPRISE"];

const PLAN_STYLES: Record<PlanKey, { badge: string; border: string }> = {
  FREE:       { badge: "bg-gray-100 text-gray-700",     border: "border-gray-200" },
  PRO:        { badge: "bg-blue-100 text-blue-700",     border: "border-blue-300" },
  AGENCY:     { badge: "bg-purple-100 text-purple-700", border: "border-purple-300" },
  ENTERPRISE: { badge: "bg-orange-100 text-orange-700", border: "border-orange-300" },
};

export default function UpgradePage() {
  const { orgId, orgPlan, role } = useOrg();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [method, setMethod] = useState<"WAVE" | "ORANGE_MONEY">("WAVE");
  const [transactionRef, setTransactionRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);

  const wavePhone  = process.env.NEXT_PUBLIC_WAVE_PHONE ?? "";
  const omPhone    = process.env.NEXT_PUBLIC_OM_PHONE  ?? "";
  const isAdmin    = role === "ADMIN";
  const currentPlan = (orgPlan ?? "FREE") as PlanKey;
  const currentIdx  = PLAN_ORDER.indexOf(currentPlan);

  useEffect(() => {
    if (!orgId) return;
    async function checkPending() {
      const supabase = createClient();
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("org_id", orgId!)
        .eq("status", "PENDING_VALIDATION")
        .limit(1);
      if (data && data.length > 0) setPendingRequest(true);
    }
    checkPending();
  }, [orgId]);

  async function handleSubmit() {
    if (!transactionRef.trim()) {
      toast.error("Entrez votre référence de transaction.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/subscriptions/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan, method, transactionRef: transactionRef.trim() }),
    });
    if (res.ok) {
      setPendingRequest(true);
      setSelectedPlan(null);
      setTransactionRef("");
      toast.success("Demande envoyée ! Validation sous 24h.");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Erreur lors de l'envoi.");
    }
    setSubmitting(false);
  }

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">Mon abonnement</h1>
        <p className="text-muted-foreground mt-1">Choisissez le plan adapté à votre activité.</p>
      </div>

      {/* Bandeau demande en cours */}
      {pendingRequest && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Demande en cours de validation</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              Votre paiement a bien été soumis. La validation est effectuée sous 24h ouvrées.
            </p>
          </div>
        </div>
      )}

      {/* Plan actuel */}
      <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm">
          Plan actuel :{" "}
          <span className="font-bold text-primary">
            {PLANS[currentPlan]?.label}
          </span>
        </p>
      </div>

      {/* Cartes plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {PLAN_ORDER.map((planKey, idx) => {
          const plan = PLANS[planKey];
          const isCurrent  = currentPlan === planKey;
          const isUpgrade  = idx > currentIdx;
          const isSelected = selectedPlan === planKey;
          const styles = PLAN_STYLES[planKey];

          return (
            <Card
              key={planKey}
              className={`relative transition-all border-2 ${styles.border} ${
                isSelected ? "ring-2 ring-primary shadow-lg" : ""
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-primary text-white text-xs px-3 shadow">Plan actuel</Badge>
                </div>
              )}
              <CardHeader className="pb-3 pt-6">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${styles.badge}`}>
                  {plan.label}
                </span>
                <div className="mt-3">
                  {plan.price === 0 ? (
                    <span className="text-2xl font-bold">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold">{plan.price.toLocaleString("fr-FR")}</span>
                      <span className="text-sm text-muted-foreground"> FCFA/mois</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 shrink-0" />
                    {plan.maxProperties >= 999999
                      ? "Biens illimités"
                      : `${plan.maxProperties} bien${plan.maxProperties > 1 ? "s" : ""}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0" />
                    {plan.maxMembers >= 999999
                      ? "Membres illimités"
                      : `${plan.maxMembers} membre${plan.maxMembers > 1 ? "s" : ""}`}
                  </div>
                </div>

                {isCurrent && (
                  <div className="flex items-center gap-1.5 text-sm text-primary font-medium pt-1">
                    <CheckCircle className="h-4 w-4" />
                    Actif
                  </div>
                )}

                {isAdmin && isUpgrade && !isCurrent && plan.price > 0 && (
                  <Button
                    className="w-full mt-2"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => setSelectedPlan(isSelected ? null : planKey)}
                    disabled={pendingRequest}
                  >
                    {isSelected ? "Annuler" : "Choisir"}
                  </Button>
                )}

                {!isAdmin && isUpgrade && plan.price > 0 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Seul l'administrateur peut changer le plan.
                  </p>
                )}

                {idx < currentIdx && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Contactez le support pour rétrograder.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Formulaire paiement */}
      {selectedPlan && isAdmin && (
        <Card className="mt-8 border-primary/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payer le plan {PLANS[selectedPlan].label} —{" "}
              {PLANS[selectedPlan].price.toLocaleString("fr-FR")} FCFA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Étape 1 : méthode */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">1. Choisissez votre moyen de paiement</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMethod("WAVE")}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    method === "WAVE"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  Wave
                </button>
                <button
                  onClick={() => setMethod("ORANGE_MONEY")}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                    method === "ORANGE_MONEY"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  Orange Money
                </button>
              </div>
            </div>

            {/* Étape 2 : instructions */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">2. Envoyez le montant exact</p>
              <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Numéro à créditer</p>
                  <p className="text-lg font-bold font-mono mt-0.5">
                    {method === "WAVE"
                      ? (wavePhone || <span className="text-destructive">Non configuré</span>)
                      : (omPhone   || <span className="text-destructive">Non configuré</span>)
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Montant exact</p>
                  <p className="text-lg font-bold text-primary mt-0.5">
                    {PLANS[selectedPlan].price.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <p className="text-xs text-muted-foreground border-t pt-3">
                  Ajoutez votre email en message/référence pour faciliter la validation.
                </p>
              </div>
            </div>

            {/* Étape 3 : référence */}
            <div className="space-y-2">
              <Label htmlFor="txref">3. Entrez votre référence de transaction</Label>
              <Input
                id="txref"
                placeholder={method === "WAVE" ? "Ex : W-2024-XXXXXX" : "Ex : OM-XXXXXXXX"}
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Référence reçue par SMS de confirmation {method === "WAVE" ? "Wave" : "Orange Money"}.
              </p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || !transactionRef.trim()}
            >
              {submitting ? "Envoi en cours..." : "J'ai payé — Soumettre ma demande"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
