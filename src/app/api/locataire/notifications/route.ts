import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!tenant) return NextResponse.json({ latePayments: 0, issueUpdates: 0 });

  const { data: lease } = await supabase
    .from("leases")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  const [paymentsRes, issuesRes] = await Promise.all([
    lease
      ? supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("lease_id", lease.id)
          .in("status", ["LATE", "PARTIAL"])
      : Promise.resolve({ count: 0 }),
    supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .in("status", ["IN_PROGRESS", "RESOLVED"]),
  ]);

  return NextResponse.json({
    latePayments: (paymentsRes as { count: number | null }).count ?? 0,
    issueUpdates: issuesRes.count ?? 0,
  });
}
