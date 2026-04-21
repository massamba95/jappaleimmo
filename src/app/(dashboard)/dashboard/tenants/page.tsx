"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBar } from "@/components/dashboard/search-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CsvImportDialog } from "@/components/dashboard/csv-import-dialog";
import { Plus, Users, Eye } from "lucide-react";

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  cni: string | null;
  created_at: string;
}

export default function TenantsPage() {
  const { orgId, role } = useOrg();
  const canCreate = hasPermission(role, "tenants:create");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchTenants() {
    if (!orgId) return;
    const supabase = createClient();
    const { data } = await supabase.from("tenants").select("*").eq("org_id", orgId!).order("created_at", { ascending: false });
    if (data) setTenants(data);
  }

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      const supabase = createClient();

      const { data } = await supabase
        .from("tenants")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false });

      setTenants(data ?? []);
      setLoading(false);
    }
    load();
  }, [orgId]);

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.first_name.toLowerCase().includes(q) ||
      t.last_name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      (t.email?.toLowerCase().includes(q) ?? false)
    );
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Locataires</h1>
          <p className="text-muted-foreground mt-1">Gerez les informations de vos locataires.</p>
        </div>
        {canCreate && (
          <>
            <CsvImportDialog type="tenants" onSuccess={fetchTenants} />
            <Link href="/dashboard/tenants/new">
              <Button><Plus className="h-4 w-4 mr-2" />Ajouter un locataire</Button>
            </Link>
          </>
        )}
      </div>

      {tenants.length > 0 && (
        <div className="mt-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un locataire..." />
        </div>
      )}

      {tenants.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun locataire</h3>
            <p className="text-muted-foreground mt-1">Ajoutez votre premier locataire.</p>
            <Link href="/dashboard/tenants/new" className="mt-4">
              <Button><Plus className="h-4 w-4 mr-2" />Ajouter un locataire</Button>
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
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CNI / Passeport</TableHead>
                  <TableHead>Date d&apos;ajout</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.first_name} {tenant.last_name}</TableCell>
                    <TableCell>{tenant.phone}</TableCell>
                    <TableCell>{tenant.email || "—"}</TableCell>
                    <TableCell>{tenant.cni || "—"}</TableCell>
                    <TableCell>{new Date(tenant.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
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
