"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { logActivity } from "@/lib/activity-log";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteButtonProps {
  table: string;
  id: string;
  label: string;
  entityName?: string;
  redirectTo?: string;
  onDeleted?: () => void;
  onPropertyDelete?: string;
}

export function DeleteButton({ table, id, label, entityName, redirectTo, onDeleted, onPropertyDelete }: DeleteButtonProps) {
  const router = useRouter();
  const { orgId, userId, userName } = useOrg();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const entityTypeMap: Record<string, string> = {
    properties: "PROPERTY",
    tenants: "TENANT",
    leases: "LEASE",
    payments: "PAYMENT",
    owners: "OWNER",
  };

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Verifier si un bien est lie a un bail
    if (table === "properties") {
      const { count } = await supabase
        .from("leases")
        .select("*", { count: "exact", head: true })
        .eq("property_id", id);

      if (count && count > 0) {
        toast.error("Impossible de supprimer ce bien. Il est lie a un ou plusieurs baux. Supprimez d'abord les baux.");
        setLoading(false);
        setConfirming(false);
        return;
      }
    }

    // Verifier si un locataire est lie a un bail
    if (table === "tenants") {
      const { count } = await supabase
        .from("leases")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", id);

      if (count && count > 0) {
        toast.error("Impossible de supprimer ce locataire. Il est lie a un ou plusieurs baux.");
        setLoading(false);
        setConfirming(false);
        return;
      }
    }

    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression.");
      console.error(error);
      setLoading(false);
      setConfirming(false);
      return;
    }

    if (onPropertyDelete) {
      await supabase
        .from("properties")
        .update({ status: "AVAILABLE" })
        .eq("id", onPropertyDelete);
    }

    if (orgId && userId) {
      await logActivity({
        orgId,
        userId,
        userName: userName ?? "Utilisateur",
        action: "DELETE",
        entityType: entityTypeMap[table] as "PROPERTY" | "TENANT" | "LEASE" | "PAYMENT",
        entityId: id,
        entityName: entityName ?? label,
      });
    }

    toast.success(`${label} supprimé avec succès.`);
    if (onDeleted) {
      onDeleted();
    } else if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      {confirming && (
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
          Annuler
        </Button>
      )}
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
        <Trash2 className="h-4 w-4 mr-1" />
        {loading ? "Suppression..." : confirming ? "Confirmer" : "Supprimer"}
      </Button>
    </div>
  );
}
