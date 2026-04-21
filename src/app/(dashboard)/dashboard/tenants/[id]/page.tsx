"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { ArrowLeft, Pencil, Phone, Mail, CreditCard, UserPlus, Send } from "lucide-react";
import { toast } from "sonner";

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  cni: string | null;
  created_at: string;
  user_id: string | null;
  invited_at: string | null;
}

interface LeaseWithProperty {
  id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  status: string;
  properties: { title: string; city: string } | null;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  ACTIVE: { label: "Actif", variant: "default" },
  EXPIRED: { label: "Expire", variant: "secondary" },
  TERMINATED: { label: "Resilie", variant: "destructive" },
};

export default function TenantDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { role } = useOrg();
  const canEdit = hasPermission(role, "tenants:edit");
  const canDelete = hasPermission(role, "tenants:delete");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [leases, setLeases] = useState<LeaseWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, first_name, last_name, phone, email, cni, created_at, user_id, invited_at")
        .eq("id", id)
        .single();

      const { data: leaseData } = await supabase
        .from("leases")
        .select("*, properties(title, city)")
        .eq("tenant_id", id)
        .order("created_at", { ascending: false });

      setTenant(tenantData);
      setLeases((leaseData as LeaseWithProperty[]) ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleInvite() {
    if (!tenant) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/dashboard/tenants/${tenant.id}/invite`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'envoi de l'invitation.");
        return;
      }
      toast.success(
        tenant.user_id ? "Invitation renvoyée !" : "Invitation envoyée !"
      );
      const supabase = createClient();
      const { data: refreshed } = await supabase
        .from("tenants")
        .select("id, first_name, last_name, phone, email, cni, created_at, user_id, invited_at")
        .eq("id", tenant.id)
        .single();
      if (refreshed) setTenant(refreshed as Tenant);
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  if (!tenant) {
    return <div className="text-center py-20"><p>Locataire introuvable.</p></div>;
  }

  const hasEmail = Boolean(tenant.email);
  const alreadyInvited = Boolean(tenant.user_id);

  return (
    <div>
      <Link href="/dashboard/tenants" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />Retour aux locataires
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tenant.first_name} {tenant.last_name}</h1>
          <p className="text-muted-foreground mt-1">Locataire depuis le {new Date(tenant.created_at).toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {canEdit && (
            !hasEmail ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Ajoutez un email au locataire"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Inviter à l&apos;espace locataire
              </Button>
            ) : alreadyInvited ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Invité le {tenant.invited_at ? new Date(tenant.invited_at).toLocaleDateString("fr-FR") : "—"}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleInvite} disabled={inviting}>
                  <Send className="h-4 w-4 mr-1" />
                  {inviting ? "Envoi..." : "Renvoyer l'invitation"}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleInvite} disabled={inviting}>
                <UserPlus className="h-4 w-4 mr-1" />
                {inviting ? "Envoi..." : "Inviter à l'espace locataire"}
              </Button>
            )
          )}
          {canEdit && (
            <Link href={`/dashboard/tenants/${id}/edit`}>
              <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" />Modifier</Button>
            </Link>
          )}
          {canDelete && (
            <DeleteButton table="tenants" id={id} label="Locataire" redirectTo="/dashboard/tenants" />
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Telephone</p>
                <p className="font-medium">{tenant.phone}</p>
              </div>
            </div>
            {tenant.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{tenant.email}</p>
                </div>
              </div>
            )}
            {tenant.cni && (
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">CNI / Passeport</p>
                  <p className="font-medium">{tenant.cni}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Baux</CardTitle></CardHeader>
          <CardContent>
            {leases.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucun bail pour ce locataire.</p>
            ) : (
              <div className="space-y-3">
                {leases.map((lease) => {
                  const status = statusLabels[lease.status];
                  return (
                    <div key={lease.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{lease.properties?.title}</p>
                        <Badge variant={status?.variant}>{status?.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{lease.properties?.city}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(lease.start_date).toLocaleDateString("fr-FR")}
                        {lease.end_date && ` — ${new Date(lease.end_date).toLocaleDateString("fr-FR")}`}
                      </p>
                      <p className="text-sm font-medium mt-1">{lease.rent_amount.toLocaleString("fr-FR")} FCFA/mois</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
