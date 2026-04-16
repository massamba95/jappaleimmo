"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const planLabels: Record<string, string> = {
  FREE: "Gratuit",
  PRO: "Pro",
  AGENCY: "Agence",
  ENTERPRISE: "Entreprise",
};

const methodLabels: Record<string, string> = {
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
};

interface SubscriptionRequest {
  id: string;
  plan: string;
  amount: number;
  payment_method: string;
  transaction_ref: string | null;
  created_at: string;
  org_id: string;
  organizations: { name: string; slug: string } | null;
}

export default function AbonnementsPage() {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/subscriptions");
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, action: "validate" | "reject") {
    setActing(id);
    const res = await fetch(`/api/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast.success(action === "validate" ? "Abonnement validé !" : "Demande rejetée.");
      await load();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Erreur.");
    }
    setActing(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Demandes d'abonnement</h1>
          <p className="text-muted-foreground mt-1">
            Paiements manuels en attente de validation.
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {requests.length} en attente
        </Badge>
      </div>

      {requests.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-semibold">Aucune demande en attente</p>
            <p className="text-sm text-muted-foreground mt-1">
              Toutes les demandes ont été traitées.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {requests.map((req) => (
            <Card key={req.id} className="border-yellow-200 bg-yellow-50/30">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{req.organizations?.name ?? req.org_id}</p>
                      <Badge variant="outline" className="text-xs">/{req.organizations?.slug}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Plan demandé</span>
                        <p className="font-semibold">{planLabels[req.plan] ?? req.plan}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Montant</span>
                        <p className="font-semibold text-primary">
                          {req.amount.toLocaleString("fr-FR")} FCFA
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Moyen de paiement</span>
                        <p className="font-semibold">{methodLabels[req.payment_method] ?? req.payment_method}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Référence transaction</span>
                        <p className="font-mono font-semibold">
                          {req.transaction_ref ?? <span className="text-muted-foreground italic">—</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(req.created_at).toLocaleString("fr-FR", {
                        day: "2-digit", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 gap-1.5"
                      disabled={acting === req.id}
                      onClick={() => handleAction(req.id, "validate")}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                      disabled={acting === req.id}
                      onClick={() => handleAction(req.id, "reject")}
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Comment valider ?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1. Vérifiez la réception du paiement dans votre application Wave ou Orange Money.</p>
          <p>2. Comparez la référence de transaction affichée ci-dessus avec celle de votre historique.</p>
          <p>3. Cliquez <strong>Valider</strong> — l'organisation passe automatiquement au plan payant (30 jours).</p>
          <p>4. En cas de doute, cliquez <strong>Rejeter</strong> et contactez l'organisation directement.</p>
        </CardContent>
      </Card>
    </div>
  );
}
