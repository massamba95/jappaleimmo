"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBar } from "@/components/dashboard/search-bar";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { Plus, UserSquare2, Pencil, Phone, Mail } from "lucide-react";

interface Owner {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export default function OwnersPage() {
  const { orgId, role } = useOrg();
  const canCreate = hasPermission(role, "owners:create");
  const canEdit = hasPermission(role, "owners:edit");
  const canDelete = hasPermission(role, "owners:delete");
  const [owners, setOwners] = useState<Owner[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("owners")
      .select("*")
      .eq("org_id", orgId!)
      .order("created_at", { ascending: false });
    setOwners(data ?? []);
    setLoading(false);
  }

  const filtered = owners.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.first_name.toLowerCase().includes(q) ||
      o.last_name.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.email?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Propriétaires</h1>
          <p className="text-muted-foreground mt-1">Gérez les propriétaires dont vous gérez les biens.</p>
        </div>
        {canCreate && (
          <Link href="/dashboard/owners/new">
            <Button><Plus className="h-4 w-4 mr-2" />Ajouter un propriétaire</Button>
          </Link>
        )}
      </div>

      {owners.length > 0 && (
        <div className="mt-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un propriétaire..." />
        </div>
      )}

      {owners.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserSquare2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Aucun propriétaire</h3>
            <p className="text-muted-foreground mt-1 text-center">Ajoutez les propriétaires dont vous gérez les biens.</p>
            {canCreate && (
              <Link href="/dashboard/owners/new" className="mt-4">
                <Button><Plus className="h-4 w-4 mr-2" />Ajouter un propriétaire</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Aucun résultat pour &quot;{search}&quot;</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {filtered.map((owner) => (
            <Card key={owner.id}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {owner.first_name[0]}{owner.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{owner.first_name} {owner.last_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canEdit && (
                      <Link href={`/dashboard/owners/${owner.id}/edit`}>
                        <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                      </Link>
                    )}
                    {canDelete && (
                      <DeleteButton table="owners" id={owner.id} label="Propriétaire" onDeleted={load} />
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {owner.phone}
                  </div>
                  {owner.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {owner.email}
                    </div>
                  )}
                  {owner.notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{owner.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
