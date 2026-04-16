"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

type SuiviStatus = "PAID" | "PARTIAL" | "PENDING" | "LATE" | "NON_GENERE";

interface LeaseSuivi {
  id: string;
  rent_amount: number;
  tenant: { first_name: string; last_name: string } | null;
  property: { title: string } | null;
  amountReceived: number;
  status: SuiviStatus;
}

const statusConfig: Record<SuiviStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  PAID:        { label: "Payé",        variant: "outline",      className: "border-green-300 text-green-700 bg-green-50" },
  PARTIAL:     { label: "Partiel",     variant: "secondary" },
  PENDING:     { label: "En attente",  variant: "outline" },
  LATE:        { label: "En retard",   variant: "destructive" },
  NON_GENERE:  { label: "Non généré",  variant: "outline",      className: "text-muted-foreground" },
};

export default function SuiviPage() {
  const { orgId } = useOrg();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [data, setData]   = useState<LeaseSuivi[]>([]);
  const [loading, setLoading] = useState(true);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (isCurrentMonth) return;
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  useEffect(() => {
    if (!orgId) return;
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, year, month]);

  async function load() {
    setLoading(true);
    const supabase = createClient();

    const mm = String(month + 1).padStart(2, "0");
    const monthStart = `${year}-${mm}-01`;
    const monthEnd   = new Date(year, month + 1, 1).toISOString().split("T")[0];

    // 1. Baux actifs de l'org
    const { data: leases } = await supabase
      .from("leases")
      .select("id, rent_amount, tenants(first_name, last_name), properties!inner(title, org_id)")
      .eq("status", "ACTIVE")
      .eq("properties.org_id", orgId!);

    if (!leases || leases.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    // 2. Paiements du mois pour ces baux
    const { data: payments } = await supabase
      .from("payments")
      .select("lease_id, amount, status")
      .in("lease_id", leases.map((l) => l.id))
      .gte("due_date", monthStart)
      .lt("due_date", monthEnd);

    // 3. Agréger par bail — seuls PAID et PARTIAL comptent comme "reçu"
    const agg = new Map<string, { received: number; statuses: string[] }>();
    for (const p of payments ?? []) {
      const cur = agg.get(p.lease_id) ?? { received: 0, statuses: [] };
      if (p.status === "PAID" || p.status === "PARTIAL") {
        cur.received += p.amount;
      }
      cur.statuses.push(p.status);
      agg.set(p.lease_id, cur);
    }

    // 4. Construire le résultat
    const result: LeaseSuivi[] = leases.map((lease) => {
      const entry = agg.get(lease.id);
      let status: SuiviStatus;
      let amountReceived = 0;

      if (!entry) {
        status = "NON_GENERE";
      } else {
        amountReceived = entry.received;
        if (amountReceived >= lease.rent_amount) {
          status = "PAID";
        } else if (amountReceived > 0) {
          status = "PARTIAL";
        } else if (entry.statuses.includes("LATE")) {
          status = "LATE";
        } else {
          status = "PENDING";
        }
      }

      return {
        id: lease.id,
        rent_amount: lease.rent_amount,
        tenant: (lease.tenants as unknown as { first_name: string; last_name: string } | null),
        property: (lease.properties as unknown as { title: string } | null),
        amountReceived,
        status,
      };
    });

    // Trier : retards + non-générés en premier, puis payés
    const order: SuiviStatus[] = ["LATE", "NON_GENERE", "PENDING", "PARTIAL", "PAID"];
    result.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

    setData(result);
    setLoading(false);
  }

  const totalAttendu = data.reduce((s, l) => s + l.rent_amount, 0);
  const totalRecu    = data.reduce((s, l) => s + l.amountReceived, 0);
  const totalReste   = totalAttendu - totalRecu;
  const taux         = totalAttendu > 0 ? Math.round((totalRecu / totalAttendu) * 100) : 0;

  const counts = {
    PAID:       data.filter((l) => l.status === "PAID").length,
    PARTIAL:    data.filter((l) => l.status === "PARTIAL").length,
    PENDING:    data.filter((l) => l.status === "PENDING").length,
    LATE:       data.filter((l) => l.status === "LATE").length,
    NON_GENERE: data.filter((l) => l.status === "NON_GENERE").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Suivi mensuel</h1>
          <p className="text-muted-foreground mt-1">Baux actifs vs paiements du mois</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold w-36 text-center text-sm">
            {MONTHS_FR[month]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} disabled={isCurrentMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mt-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalAttendu.toLocaleString("fr-FR")}</div>
            <p className="text-xs text-muted-foreground mt-1">FCFA · {data.length} baux</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reçu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{totalRecu.toLocaleString("fr-FR")}</div>
            <p className="text-xs text-muted-foreground mt-1">FCFA · {counts.PAID} payé(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${totalReste > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {totalReste.toLocaleString("fr-FR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              FCFA · {counts.PENDING + counts.LATE + counts.PARTIAL + counts.NON_GENERE} impayé(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recouvrement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${taux >= 80 ? "text-green-600" : taux >= 50 ? "text-yellow-600" : "text-destructive"}`}>
              {taux}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{counts.PAID}/{data.length} baux réglés</p>
          </CardContent>
        </Card>
      </div>

      {/* Badges résumé */}
      {data.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {counts.PAID       > 0 && <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">{counts.PAID} Payé</Badge>}
          {counts.PARTIAL    > 0 && <Badge variant="secondary">{counts.PARTIAL} Partiel</Badge>}
          {counts.PENDING    > 0 && <Badge variant="outline">{counts.PENDING} En attente</Badge>}
          {counts.LATE       > 0 && <Badge variant="destructive">{counts.LATE} En retard</Badge>}
          {counts.NON_GENERE > 0 && <Badge variant="outline" className="text-muted-foreground">{counts.NON_GENERE} Non généré</Badge>}
        </div>
      )}

      {/* Liste */}
      {data.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">Aucun bail actif pour cette période.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile */}
          <div className="mt-6 space-y-3 md:hidden">
            {data.map((lease) => {
              const cfg   = statusConfig[lease.status];
              const reste = lease.rent_amount - lease.amountReceived;
              return (
                <Card key={lease.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{lease.tenant?.first_name} {lease.tenant?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{lease.property?.title}</p>
                      </div>
                      <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Loyer</span>
                      <span>{lease.rent_amount.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    {lease.amountReceived > 0 && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Reçu</span>
                        <span className="text-green-600 font-medium">{lease.amountReceived.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    )}
                    {reste > 0 && lease.status !== "NON_GENERE" && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Reste</span>
                        <span className="text-destructive font-medium">{reste.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop */}
          <Card className="mt-6 hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Locataire</TableHead>
                    <TableHead>Bien</TableHead>
                    <TableHead>Loyer attendu</TableHead>
                    <TableHead>Reçu</TableHead>
                    <TableHead>Reste</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((lease) => {
                    const cfg   = statusConfig[lease.status];
                    const reste = lease.rent_amount - lease.amountReceived;
                    return (
                      <TableRow key={lease.id}>
                        <TableCell className="font-medium">
                          {lease.tenant?.first_name} {lease.tenant?.last_name}
                        </TableCell>
                        <TableCell>{lease.property?.title}</TableCell>
                        <TableCell>{lease.rent_amount.toLocaleString("fr-FR")} FCFA</TableCell>
                        <TableCell>
                          {lease.amountReceived > 0
                            ? <span className="text-green-600 font-medium">{lease.amountReceived.toLocaleString("fr-FR")} FCFA</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          {reste > 0 && lease.status !== "NON_GENERE"
                            ? <span className="text-destructive font-medium">{reste.toLocaleString("fr-FR")} FCFA</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
