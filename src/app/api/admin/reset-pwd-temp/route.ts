import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ENDPOINT TEMPORAIRE — à supprimer après usage
export async function GET() {
  const supabase = createAdminClient();

  // Test: lister les users pour vérifier que l'admin client fonctionne
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    return NextResponse.json({ step: "listUsers", error: listErr.message, status: listErr.status }, { status: 500 });
  }

  const user = list.users.find(u => u.email === "diopmassamba78@gmail.com");
  if (!user) {
    return NextResponse.json({ step: "findUser", error: "User not found", emails: list.users.map(u => u.email) });
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: "Education2019." });
  if (error) {
    return NextResponse.json({ step: "updateUser", error: error.message, userId: user.id }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Mot de passe mis à jour", userId: user.id });
}
