import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, CreditCard } from "lucide-react";

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

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "*, leases(tenants(first_name, last_name), properties!inner(title, user_id))"
    )
    .eq("leases.properties.user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paiements</h1>
          <p className="text-muted-foreground mt-1">
            Historique de tous les paiements de loyer.
          </p>
        </div>
        <Link href="/dashboard/payments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Enregistrer un paiement
          </Button>
        </Link>
      </div>

      {!payments || payments.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun paiement</h3>
            <p className="text-muted-foreground mt-1">
              Les paiements apparaitront ici une fois enregistres.
            </p>
            <Link href="/dashboard/payments/new" className="mt-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Enregistrer un paiement
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8">
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
                {payments.map((payment) => {
                  const lease = payment.leases as Record<string, unknown> | null;
                  const tenant = lease?.tenants as Record<string, string> | null;
                  const property = lease?.properties as Record<string, string> | null;
                  const status = statusConfig[payment.status];
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {tenant?.first_name} {tenant?.last_name}
                      </TableCell>
                      <TableCell>{property?.title}</TableCell>
                      <TableCell>
                        {payment.amount.toLocaleString("fr-FR")} FCFA
                      </TableCell>
                      <TableCell>
                        {new Date(payment.due_date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {methodLabels[payment.method] ?? payment.method}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status?.variant}>
                          {status?.label}
                        </Badge>
                      </TableCell>
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
