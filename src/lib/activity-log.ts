import { createClient } from "@/lib/supabase/client";

type Action = "CREATE" | "UPDATE" | "DELETE";
type EntityType = "PROPERTY" | "TENANT" | "LEASE" | "PAYMENT" | "OWNER";

interface LogParams {
  orgId: string;
  userId: string;
  userName: string;
  action: Action;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  details?: string;
}

export async function logActivity(params: LogParams) {
  const supabase = createClient();
  await supabase.from("activity_logs").insert({
    org_id: params.orgId,
    user_id: params.userId,
    user_name: params.userName,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    entity_name: params.entityName ?? null,
    details: params.details ?? null,
  });
}

export const actionLabels: Record<string, string> = {
  CREATE: "Cree",
  UPDATE: "Modifie",
  DELETE: "Supprime",
};

export const entityLabels: Record<string, string> = {
  PROPERTY: "Bien",
  TENANT: "Locataire",
  LEASE: "Bail",
  PAYMENT: "Paiement",
  OWNER: "Propriétaire",
};
