import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { plan: string; method: string; transactionRef: string };
  const { plan, method, transactionRef } = body;

  if (!PLANS[plan as keyof typeof PLANS] || plan === "FREE") {
    return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
  }
  if (!transactionRef?.trim()) {
    return NextResponse.json({ error: "Référence de transaction requise." }, { status: 400 });
  }
  if (!["WAVE", "ORANGE_MONEY"].includes(method)) {
    return NextResponse.json({ error: "Moyen de paiement invalide." }, { status: 400 });
  }

  // Vérifier que l'utilisateur est ADMIN de son org
  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("role", "ADMIN")
    .eq("status", "ACTIVE")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Seul un administrateur peut gérer l'abonnement." }, { status: 403 });
  }

  const admin = createAdminClient();
  const orgId = membership.org_id;
  const planInfo = PLANS[plan as keyof typeof PLANS];
  const today = new Date().toISOString().split("T")[0];

  // Annuler toute demande PENDING_VALIDATION existante pour cette org
  await admin
    .from("subscriptions")
    .update({ status: "CANCELLED" })
    .eq("org_id", orgId)
    .eq("status", "PENDING_VALIDATION");

  // Créer la nouvelle demande
  const { error } = await admin.from("subscriptions").insert({
    org_id: orgId,
    plan,
    amount: planInfo.price,
    status: "PENDING_VALIDATION",
    payment_method: method,
    transaction_ref: transactionRef.trim(),
    current_period_start: today,
    current_period_end: today,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
