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
import { Plus, FileText } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ACTIVE: { label: "Actif", variant: "default" },
  EXPIRED: { label: "Expire", variant: "secondary" },
  TERMINATED: { label: "Resilie", variant: "destructive" },
};

export default async function LeasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: leases } = await supabase
    .from("leases")
    .select(
      "*, properties!inner(title, user_id), tenants(first_name, last_name)"
    )
    .eq("properties.user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Baux</h1>
          <p className="text-muted-foreground mt-1">
            Contrats de location en cours et passes.
          </p>
        </div>
        <Link href="/dashboard/leases/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Creer un bail
          </Button>
        </Link>
      </div>

      {!leases || leases.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun bail</h3>
            <p className="text-muted-foreground mt-1">
              Les baux apparaitront ici une fois crees.
            </p>
            <Link href="/dashboard/leases/new" className="mt-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Creer un bail
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
                  <TableHead>Bien</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Debut</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Loyer</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => {
                  const property = lease.properties as Record<string, string> | null;
                  const tenant = lease.tenants as Record<string, string> | null;
                  const status = statusConfig[lease.status];
                  return (
                    <TableRow key={lease.id}>
                      <TableCell className="font-medium">
                        {property?.title}
                      </TableCell>
                      <TableCell>
                        {tenant?.first_name} {tenant?.last_name}
                      </TableCell>
                      <TableCell>
                        {new Date(lease.start_date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {lease.end_date
                          ? new Date(lease.end_date).toLocaleDateString("fr-FR")
                          : "Indefini"}
                      </TableCell>
                      <TableCell>
                        {lease.rent_amount.toLocaleString("fr-FR")} FCFA
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
