"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Users, Home, AlertTriangle, Clock } from "lucide-react";

function getDaysLeft(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  max_properties: number;
  max_members: number;
  trial_ends_at: string | null;
  blocked_at: string | null;
  created_at: string;
  member_count: number;
  property_count: number;
  subscription_end: string | null;
}

const planLabels: Record<string, string> = {
  FREE: "Gratuit",
  PRO: "Pro",
  AGENCY: "Agence",
  ENTERPRISE: "Entreprise",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Actif",
  TRIAL: "Essai",
  BLOCKED: "Bloqué",
  CANCELLED: "Annulé",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  BLOCKED: "destructive",
  CANCELLED: "outline",
};

const plans = ["FREE", "PRO", "AGENCY", "ENTERPRISE"];
const statuses = ["ACTIVE", "TRIAL", "BLOCKED", "CANCELLED"];

export default function OrganisationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/organisations");
    if (res.ok) {
      const data = await res.json();
      setOrgs(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateOrg(id: string, patch: { status?: string; plan?: string }) {
    setUpdating(id);
    const res = await fetch(`/api/admin/organisations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (res.ok) {
      toast.success("Organisation mise à jour.");
      await load();
    } else {
      toast.error("Erreur lors de la mise à jour.");
    }
    setUpdating(null);
  }

  const filtered = filterStatus === "ALL" ? orgs : orgs.filter((o) => o.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">Organisations</h1>
        <p className="text-muted-foreground mt-1">
          {orgs.length} organisation{orgs.length !== 1 ? "s" : ""} enregistrée{orgs.length !== 1 ? "s" : ""}.
        </p>
      </div>

      {/* Filtre */}
      <div className="mt-6 flex items-center gap-3">
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">Tous les statuts</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Liste des organisations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">Aucune organisation.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1"><Users className="h-4 w-4" />Membres</span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1"><Home className="h-4 w-4" />Biens</span>
                  </TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">/{org.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded border border-input bg-background px-2 text-sm disabled:opacity-50"
                        value={org.plan}
                        disabled={updating === org.id}
                        onChange={(e) => updateOrg(org.id, { plan: e.target.value })}
                      >
                        {plans.map((p) => (
                          <option key={p} value={p}>{planLabels[p]}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[org.status] ?? "outline"}>
                        {statusLabels[org.status] ?? org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={org.member_count >= org.max_members ? "text-red-600 font-semibold" : ""}>
                        {org.member_count}/{org.max_members}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={org.property_count >= org.max_properties ? "text-orange-600 font-semibold" : ""}>
                        {org.property_count}/{org.max_properties}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {org.subscription_end ? (() => {
                        const days = getDaysLeft(org.subscription_end);
                        if (days < 0) return (
                          <span className="text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Expiré
                          </span>
                        );
                        if (days <= 7) return (
                          <div>
                            <span className="text-orange-600 font-medium flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {days}j restant{days > 1 ? "s" : ""}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(org.subscription_end).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        );
                        return (
                          <div>
                            <span className="text-green-600 font-medium">{days}j restants</span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(org.subscription_end).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        );
                      })() : (
                        <span className="text-muted-foreground text-xs">
                          {org.status === "TRIAL"
                            ? org.trial_ends_at
                              ? `Essai → ${new Date(org.trial_ends_at).toLocaleDateString("fr-FR")}`
                              : "Essai"
                            : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {org.status !== "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updating === org.id}
                            onClick={() => updateOrg(org.id, { status: "ACTIVE" })}
                          >
                            Activer
                          </Button>
                        )}
                        {org.status !== "BLOCKED" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updating === org.id}
                            onClick={() => updateOrg(org.id, { status: "BLOCKED" })}
                          >
                            Bloquer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
