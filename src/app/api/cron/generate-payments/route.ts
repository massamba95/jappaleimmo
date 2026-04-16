import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthStart = `${year}-${month}-01`;
  const nextMonth = new Date(year, now.getMonth() + 1, 1);
  const monthEnd = nextMonth.toISOString().split("T")[0];

  // 1. Tous les baux actifs
  const { data: leases, error: leasesError } = await supabase
    .from("leases")
    .select("id, rent_amount")
    .eq("status", "ACTIVE");

  if (leasesError) {
    return NextResponse.json({ error: leasesError.message }, { status: 500 });
  }

  if (!leases || leases.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skipped: 0, month: `${year}-${month}` });
  }

  // 2. Paiements déjà existants pour ce mois (toutes orgs confondues)
  const { data: existing } = await supabase
    .from("payments")
    .select("lease_id")
    .gte("due_date", monthStart)
    .lt("due_date", monthEnd);

  const covered = new Set(existing?.map((p) => p.lease_id) ?? []);

  // 3. Insertion en batch uniquement pour les baux sans échéance ce mois
  const toInsert = leases
    .filter((l) => !covered.has(l.id))
    .map((l) => ({
      lease_id: l.id,
      amount: l.rent_amount,
      due_date: monthStart,
      paid_date: null,
      method: "CASH",
      status: "PENDING",
    }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("payments").insert(toInsert);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    created: toInsert.length,
    skipped: covered.size,
    month: `${year}-${month}`,
  });
}
