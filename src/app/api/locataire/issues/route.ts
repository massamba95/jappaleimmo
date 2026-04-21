import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_CATEGORIES = new Set([
  "PLUMBING",
  "ELECTRICITY",
  "APPLIANCE",
  "HEATING",
  "STRUCTURE",
  "OTHER",
]);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("issues")
    .select("id, title, description, category, status, created_at, resolved_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 100) : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category : "OTHER";

  if (!title) {
    return NextResponse.json({ error: "Le titre est requis." }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: "La description est requise." }, { status: 400 });
  }
  const finalCategory = ALLOWED_CATEGORIES.has(category) ? category : "OTHER";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, org_id, first_name, last_name")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json(
      { error: "Votre compte n'est pas associé à un locataire." },
      { status: 403 }
    );
  }

  const { data: leases } = await supabase
    .from("leases")
    .select("id, property_id, status, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  const activeLease =
    (leases ?? []).find((l) => l.status === "ACTIVE") ?? (leases ?? [])[0] ?? null;

  const { data: inserted, error } = await supabase
    .from("issues")
    .insert({
      org_id: tenant.org_id,
      tenant_id: tenant.id,
      property_id: activeLease?.property_id ?? null,
      lease_id: activeLease?.id ?? null,
      title,
      description,
      category: finalCategory,
      status: "OPEN",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY) {
    const admin = createAdminClient();
    const { data: org } = (await admin
      .from("organizations")
      .select("name, memberships(role, status, profiles(email))")
      .eq("id", tenant.org_id)
      .single()) as {
      data: {
        name: string;
        memberships: Array<{
          role: string;
          status: string;
          profiles: { email: string | null } | null;
        }>;
      } | null;
    };

    const adminMembership =
      org?.memberships?.find((m) => m.role === "ADMIN" && m.status === "ACTIVE") ??
      org?.memberships?.find((m) => m.status === "ACTIVE");
    const adminEmail = adminMembership?.profiles?.email ?? null;

    if (adminEmail) {
      const html = `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#1d4ed8;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:18px;">Nouveau signalement locataire</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">${org?.name ?? "Jappalé Immo"}</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 12px;color:#111827;">
        <strong>${tenant.first_name} ${tenant.last_name}</strong> vient de signaler un problème.
      </p>
      <div style="background:#f3f4f6;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;">Titre</p>
        <p style="margin:0 0 12px;color:#111827;font-weight:600;">${title}</p>
        <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;">Catégorie</p>
        <p style="margin:0 0 12px;color:#111827;">${finalCategory}</p>
        <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;">Description</p>
        <p style="margin:0;color:#111827;white-space:pre-wrap;">${description}</p>
      </div>
      <a href="https://jappaleimmo.com/dashboard/signalements"
         style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;">
        Voir le signalement →
      </a>
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
          to: adminEmail,
          subject: `Nouveau signalement — ${title}`,
          html,
        }),
      });
    }
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
