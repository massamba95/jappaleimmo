import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users } from "lucide-react";

export default async function TenantsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Locataires</h1>
          <p className="text-muted-foreground mt-1">
            Gerez les informations de vos locataires.
          </p>
        </div>
        <Link href="/dashboard/tenants/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un locataire
          </Button>
        </Link>
      </div>

      {!tenants || tenants.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun locataire</h3>
            <p className="text-muted-foreground mt-1">
              Ajoutez votre premier locataire.
            </p>
            <Link href="/dashboard/tenants/new" className="mt-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un locataire
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
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CNI / Passeport</TableHead>
                  <TableHead>Date d&apos;ajout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      {tenant.first_name} {tenant.last_name}
                    </TableCell>
                    <TableCell>{tenant.phone}</TableCell>
                    <TableCell>{tenant.email || "—"}</TableCell>
                    <TableCell>{tenant.cni || "—"}</TableCell>
                    <TableCell>
                      {new Date(tenant.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
