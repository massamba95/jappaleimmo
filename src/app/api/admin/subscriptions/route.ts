import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sa } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();
  if (!sa) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("id, plan, amount, payment_method, transaction_ref, created_at, org_id, organizations(name, slug)")
    .eq("status", "PENDING_VALIDATION")
    .order("created_at", { ascending: true });

  return NextResponse.json(data ?? []);
}
