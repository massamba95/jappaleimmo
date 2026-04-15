import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits, PLANS } from "@/lib/plans";

export async function PATCH(
  request: NextRequest,
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
  const body = await request.json() as { status?: string; plan?: string };
  const admin = createAdminClient();

  const update: Record<string, unknown> = {};

  if (body.status) {
    update.status = body.status;
    if (body.status === "BLOCKED") update.blocked_at = new Date().toISOString();
    if (body.status === "ACTIVE") update.blocked_at = null;
  }

  if (body.plan) {
    const limits = getPlanLimits(body.plan);
    update.plan = body.plan;
    update.max_properties = limits.maxProperties;
    update.max_members = limits.maxMembers;
  }

  const { error } = await admin
    .from("organizations")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Quand on active une org, créer/renouveler la subscription (30 jours)
  if (body.status === "ACTIVE") {
    const { data: org } = await admin
      .from("organizations")
      .select("plan")
      .eq("id", id)
      .single();

    const plan = (body.plan ?? org?.plan ?? "FREE") as keyof typeof PLANS;
    const amount = PLANS[plan]?.price ?? 0;
    const today = new Date();
    const periodEnd = new Date(today);
    periodEnd.setDate(periodEnd.getDate() + 30);

    // Annuler les subscriptions actives existantes
    await admin
      .from("subscriptions")
      .update({ status: "CANCELLED" })
      .eq("org_id", id)
      .eq("status", "ACTIVE");

    // Créer la nouvelle subscription
    await admin.from("subscriptions").insert({
      org_id: id,
      plan,
      amount,
      status: "ACTIVE",
      payment_method: "MANUAL",
      current_period_start: today.toISOString().split("T")[0],
      current_period_end: periodEnd.toISOString().split("T")[0],
    });
  }

  // Quand on bloque, annuler la subscription
  if (body.status === "BLOCKED") {
    await admin
      .from("subscriptions")
      .update({ status: "CANCELLED" })
      .eq("org_id", id)
      .eq("status", "ACTIVE");
  }

  return NextResponse.json({ ok: true });
}
