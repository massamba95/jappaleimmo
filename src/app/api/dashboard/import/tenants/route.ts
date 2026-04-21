import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { rows } = await req.json();
  let imported = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.prenom?.trim()) { errors.push({ row: rowNum, message: "Le prénom est requis" }); continue; }
    if (!row.nom?.trim()) { errors.push({ row: rowNum, message: "Le nom est requis" }); continue; }
    if (!row.telephone?.trim()) { errors.push({ row: rowNum, message: "Le téléphone est requis" }); continue; }

    const { error } = await supabase.from("tenants").insert({
      user_id: user.id,
      org_id: membership.org_id,
      first_name: row.prenom.trim(),
      last_name: row.nom.trim(),
      phone: row.telephone.trim(),
      email: row.email?.trim() || null,
      cni: row.cni?.trim() || null,
    });

    if (error) {
      errors.push({ row: rowNum, message: "Erreur d'insertion" });
    } else {
      imported++;
    }
  }

  return NextResponse.json({ imported, errors });
}
