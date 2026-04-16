import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits } from "@/lib/plans";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sa } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();
  if (!sa) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { action } = await req.json() as { action: "validate" | "reject" };
  const admin = createAdminClient();

  // Récupérer la demande
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, org_id, plan, amount")
    .eq("id", id)
    .eq("status", "PENDING_VALIDATION")
    .single();

  if (!sub) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });

  if (action === "validate") {
    const today = new Date();
    const periodEnd = new Date(today);
    periodEnd.setDate(periodEnd.getDate() + 30);
    const limits = getPlanLimits(sub.plan);

    // Annuler les autres abonnements ACTIVE de cette org
    await admin
      .from("subscriptions")
      .update({ status: "CANCELLED" })
      .eq("org_id", sub.org_id)
      .eq("status", "ACTIVE");

    // Activer cette subscription
    await admin
      .from("subscriptions")
      .update({
        status: "ACTIVE",
        current_period_start: today.toISOString().split("T")[0],
        current_period_end: periodEnd.toISOString().split("T")[0],
      })
      .eq("id", id);

    // Mettre à jour l'organisation
    await admin
      .from("organizations")
      .update({
        plan: sub.plan,
        status: "ACTIVE",
        blocked_at: null,
        max_properties: limits.maxProperties,
        max_members: limits.maxMembers,
      })
      .eq("id", sub.org_id);

  } else if (action === "reject") {
    await admin
      .from("subscriptions")
      .update({ status: "CANCELLED" })
      .eq("id", id);
  } else {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
