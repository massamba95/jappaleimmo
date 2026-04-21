import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Aucune organisation active" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("id, org_id, email, first_name, last_name, user_id")
    .eq("id", id)
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: "Locataire introuvable" }, { status: 404 });
  }

  if (tenant.org_id !== membership.org_id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (!tenant.email) {
    return NextResponse.json(
      { error: "Le locataire doit avoir un email." },
      { status: 400 }
    );
  }

  // Vérifier si un compte auth existe déjà via la table profiles (plus fiable que listUsers paginé)
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", tenant.email)
    .maybeSingle();

  const existingUserId = existingProfile?.id ?? null;

  // Le type dans l'URL permet à la page bienvenue de savoir quoi afficher
  const redirectTo = existingUserId
    ? "https://jappaleimmo.com/locataire/bienvenue?type=magiclink"
    : "https://jappaleimmo.com/locataire/bienvenue?type=invite";

  let actionLink: string;
  let resolvedUserId: string | undefined;

  if (existingUserId) {
    // Utilisateur déjà enregistré → envoyer un magic link de connexion
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: tenant.email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkError?.message ?? "Impossible de générer le lien de connexion." },
        { status: 500 }
      );
    }

    actionLink = linkData.properties.action_link;
    resolvedUserId = existingUserId;
  } else {
    // Nouvel utilisateur → invitation classique
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "invite",
      email: tenant.email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkError?.message ?? "Impossible de générer le lien d'invitation." },
        { status: 500 }
      );
    }

    actionLink = linkData.properties.action_link;
    resolvedUserId = linkData.user?.id;
  }

  // Lier le locataire au compte auth (toujours mettre à jour user_id si on l'a)
  if (resolvedUserId) {
    await admin
      .from("tenants")
      .update({ user_id: resolvedUserId, invited_at: new Date().toISOString() })
      .eq("id", tenant.id);
  } else {
    await admin
      .from("tenants")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", tenant.id);
  }

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", tenant.org_id)
    .single();

  const orgName = org?.name ?? "votre agence";
  const isExisting = !!existingUser;

  if (process.env.RESEND_API_KEY) {
    const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#1d4ed8;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Jappalé Immo</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">${orgName}</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#111827;">Bonjour ${tenant.first_name ?? ""},</p>
      <p style="margin:0 0 24px;color:#374151;">
        ${orgName} vous invite à accéder à votre espace locataire. Vous pourrez y consulter votre bail, vos paiements, télécharger vos quittances et signaler un problème.
      </p>
      <a href="${actionLink}"
         style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:15px;">
        Accéder à mon espace
      </a>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">
        ${isExisting
          ? "Ce lien de connexion est valable 1 heure."
          : "Ce lien vous permettra de définir votre mot de passe. Il est valable 24 heures."
        }
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Jappalé Immo — Gestion immobilière simplifiée</p>
    </div>
  </div>
</body></html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Jappalé Immo <noreply@jappaleimmo.com>",
        to: tenant.email,
        subject: `Votre espace locataire — ${orgName}`,
        html,
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
