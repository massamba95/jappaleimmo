import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = new Set(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Aucune organisation active" }, { status: 403 });
  }

  if (membership.role !== "ADMIN" && membership.role !== "MANAGER") {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : "";
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const update: { status: string; resolved_at?: string | null } = { status };
  if (status === "RESOLVED" || status === "CLOSED") {
    update.resolved_at = new Date().toISOString();
  } else {
    update.resolved_at = null;
  }

  const { error } = await supabase
    .from("issues")
    .update(update)
    .eq("id", id)
    .eq("org_id", membership.org_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
