import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayStr = new Date().toISOString().split("T")[0];

  const { error, count } = await supabase
    .from("payments")
    .update({ status: "LATE" }, { count: "exact" })
    .eq("status", "PENDING")
    .lt("due_date", todayStr);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, updated: count ?? 0, date: todayStr });
}
