"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/dashboard/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, CreditCard } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  method: string;
  status: string;
  leases: {
    tenants: { first_name: string; last_name: string } | null;
    properties: { title: string } | null;
  } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PAID: { label: "Paye", variant: "default" },
  PENDING: { label: "En attente", variant: "outline" },
  LATE: { label: "En retard", variant: "destructive" },
  PARTIAL: { label: "Partiel", variant: "secondary" },
};

const methodLabels: Record<string, string> = {
  CASH: "Especes",
  TRANSFER: "Virement",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
};

export default function PaymentsPage() {
  const { orgId } = useOrg();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      const supabase = createClient();

      const { data } = await supabase
        .from("payments")
        .select("*, leases(tenants(first_name, last_name), properties!inner(title, org_id))")
        .eq("leases.properties.org_id", orgId!)
        .order("created_at", { ascending: false });

      setPayments((data as Payment[]) ?? []);
      setLoading(false);
    }
    load();
  }, [orgId]);

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const tenant = p.leases?.tenants;
    const property = p.leases?.properties;
    return (
      tenant?.first_name.toLowerCase().includes(q) ||
      tenant?.last_name.toLowerCase().includes(q) ||
      property?.title.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paiements</h1>
          <p className="text-muted-foreground mt-1">Historique de tous les paiements de loyer.</p>
        </div>
        <Link href="/dashboard/payments/new">
          <Button><Plus className="h-4 w-4 mr-2" />Enregistrer un paiement</Button>
        </Link>
      </div>

      {payments.length > 0 && (
        <div className="mt-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un paiement..." />
        </div>
      )}

      {payments.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun paiement</h3>
            <p className="text-muted-foreground mt-1">Les paiements apparaitront ici une fois enregistres.</p>
            <Link href="/dashboard/payments/new" className="mt-4">
              <Button><Plus className="h-4 w-4 mr-2" />Enregistrer un paiement</Button>
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Aucun resultat pour &quot;{search}&quot;</p>
      ) : (
        <Card className="mt-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Bien</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Echeance</TableHead>
                  <TableHead>Methode</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((payment) => {
                  const tenant = payment.leases?.tenants;
                  const property = payment.leases?.properties;
                  const status = statusConfig[payment.status];
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{tenant?.first_name} {tenant?.last_name}</TableCell>
                      <TableCell>{property?.title}</TableCell>
                      <TableCell>{payment.amount.toLocaleString("fr-FR")} FCFA</TableCell>
                      <TableCell>{new Date(payment.due_date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{methodLabels[payment.method] ?? payment.method}</TableCell>
                      <TableCell><Badge variant={status?.variant}>{status?.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
