"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";
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
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Lease {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  status: string;
  properties: { title: string; user_id: string } | null;
  tenants: { first_name: string; last_name: string } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ACTIVE: { label: "Actif", variant: "default" },
  EXPIRED: { label: "Expire", variant: "secondary" },
  TERMINATED: { label: "Resilie", variant: "destructive" },
};

export default function LeasesPage() {
  const { orgId, role, userId, userName } = useOrg();
  const canCreate = hasPermission(role, "leases:create");
  const canEdit = hasPermission(role, "leases:edit");
  const canDelete = hasPermission(role, "leases:delete");
  const [leases, setLeases] = useState<Lease[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (orgId) loadLeases();
  }, [orgId]);

  async function loadLeases() {
    const supabase = createClient();

    const { data } = await supabase
      .from("leases")
      .select("*, properties!inner(title, org_id), tenants(first_name, last_name)")
      .eq("properties.org_id", orgId!)
      .order("created_at", { ascending: false });

    setLeases((data as Lease[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(lease: Lease) {
    if (deleting !== lease.id) {
      setDeleting(lease.id);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("leases").delete().eq("id", lease.id);

    if (error) {
      toast.error("Erreur lors de la suppression.");
      setDeleting(null);
      return;
    }

    // Verifier s'il reste un bail actif sur ce bien
    if (lease.status === "ACTIVE") {
      const { count } = await supabase
        .from("leases")
        .select("*", { count: "exact", head: true })
        .eq("property_id", lease.property_id)
        .eq("status", "ACTIVE");

      if (count === 0) {
        await supabase
          .from("properties")
          .update({ status: "AVAILABLE" })
          .eq("id", lease.property_id);
      }
    }

    if (orgId && userId) {
      await logActivity({
        orgId,
        userId,
        userName: userName ?? "Utilisateur",
        action: "DELETE",
        entityType: "LEASE",
        entityName: `${lease.properties?.title ?? ""} - ${lease.tenants?.first_name ?? ""} ${lease.tenants?.last_name ?? ""}`,
      });
    }

    toast.success("Bail supprime.");
    setDeleting(null);
    loadLeases();
  }

  const filtered = leases.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.properties?.title.toLowerCase().includes(q) ||
      l.tenants?.first_name.toLowerCase().includes(q) ||
      l.tenants?.last_name.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Baux</h1>
          <p className="text-muted-foreground mt-1">Contrats de location en cours et passes.</p>
        </div>
        {canCreate && (
          <Link href="/dashboard/leases/new">
            <Button><Plus className="h-4 w-4 mr-2" />Creer un bail</Button>
          </Link>
        )}
      </div>

      {leases.length > 0 && (
        <div className="mt-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un bail..." />
        </div>
      )}

      {leases.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun bail</h3>
            <p className="text-muted-foreground mt-1">Les baux apparaitront ici une fois crees.</p>
            <Link href="/dashboard/leases/new" className="mt-4">
              <Button><Plus className="h-4 w-4 mr-2" />Creer un bail</Button>
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
                  <TableHead>Bien</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Debut</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Loyer</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lease) => {
                  const status = statusConfig[lease.status];
                  return (
                    <TableRow key={lease.id}>
                      <TableCell className="font-medium">{lease.properties?.title}</TableCell>
                      <TableCell>{lease.tenants?.first_name} {lease.tenants?.last_name}</TableCell>
                      <TableCell>{new Date(lease.start_date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{lease.end_date ? new Date(lease.end_date).toLocaleDateString("fr-FR") : "Indefini"}</TableCell>
                      <TableCell>{lease.rent_amount.toLocaleString("fr-FR")} FCFA</TableCell>
                      <TableCell><Badge variant={status?.variant}>{status?.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Link href={`/dashboard/leases/${lease.id}/edit`}>
                              <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                            </Link>
                          )}
                          {canDelete && (
                            deleting === lease.id ? (
                              <div className="flex gap-1">
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(lease)}>Confirmer</Button>
                                <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>Non</Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(lease)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )
                          )}
                        </div>
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
