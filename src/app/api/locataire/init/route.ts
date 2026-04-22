import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Retourne le locataire lié au compte connecté.
// Si pas encore lié (user_id null), cherche par email dans la bonne org et lie automatiquement.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // 1. Chercher par user_id (cas normal — déjà lié)
  const { data: tenantByUid } = await supabase
    .from("tenants")
    .select("id, first_name, last_name")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (tenantByUid) {
    return NextResponse.json(tenantByUid);
  }

  // 2. Fallback : chercher par email dans la bonne org uniquement
  if (!user.email) {
    return NextResponse.json(null);
  }

  const admin = createAdminClient();

  // Trouver l'org du membership de cet utilisateur (si invité via une org)
  const { data: membership } = await admin
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // Construire la requête : email + user_id non encore lié
  let query = admin
    .from("tenants")
    .select("id, first_name, last_name, user_id, org_id")
    .ilike("email", user.email)
    .is("user_id", null);   // Uniquement les locataires pas encore liés

  // Si on connaît l'org, restreindre à cette org pour éviter tout croisement
  if (membership?.org_id) {
    query = query.eq("org_id", membership.org_id);
  }

  const { data: tenantByEmail } = await query.limit(1).maybeSingle();

  if (!tenantByEmail) {
    return NextResponse.json(null);
  }

  // Lier le compte auth au locataire
  await admin
    .from("tenants")
    .update({ user_id: user.id, invited_at: new Date().toISOString() })
    .eq("id", tenantByEmail.id);

  return NextResponse.json({
    id: tenantByEmail.id,
    first_name: tenantByEmail.first_name,
    last_name: tenantByEmail.last_name,
  });
}
