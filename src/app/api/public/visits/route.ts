import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json();
  const { property_id, org_id, property_title, visitor_name, visitor_phone, visitor_email, requested_date, requested_time, message } = body;

  if (!property_id || !org_id || !visitor_name || !visitor_phone || !requested_date) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { error } = await supabase.from("visits").insert({
    property_id, org_id, property_title, visitor_name, visitor_phone,
    visitor_email: visitor_email || null,
    requested_date, requested_time: requested_time || null,
    message: message || null,
    status: "PENDING",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notifier l'agence par email
  if (process.env.RESEND_API_KEY) {
    const admin = createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("name, memberships(profiles(email))")
      .eq("id", org_id)
      .single() as any;

    const adminEmail = org?.memberships?.[0]?.profiles?.email;
    if (adminEmail) {
      const formattedDate = new Date(requested_date).toLocaleDateString("fr-FR");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Jappalé Immo <noreply@jappaleimmo.com>",
          to: adminEmail,
          subject: `Nouvelle demande de visite — ${property_title}`,
          html: `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#1d4ed8;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:18px;">Nouvelle demande de visite</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">${org?.name ?? "Jappalé Immo"}</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#111827;">Vous avez reçu une nouvelle demande de visite.</p>
      <div style="background:#f3f4f6;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#6b7280;font-size:14px;padding:4px 0;">Bien</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right;">${property_title}</td></tr>
          <tr><td style="color:#6b7280;font-size:14px;padding:4px 0;">Visiteur</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right;">${visitor_name}</td></tr>
          <tr><td style="color:#6b7280;font-size:14px;padding:4px 0;">Téléphone</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right;">${visitor_phone}</td></tr>
          <tr><td style="color:#6b7280;font-size:14px;padding:4px 0;">Date souhaitée</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right;">${formattedDate}${requested_time ? " à " + requested_time : ""}</td></tr>
          ${message ? `<tr><td style="color:#6b7280;font-size:14px;padding:4px 0;">Message</td><td style="color:#111827;font-size:14px;text-align:right;">${message}</td></tr>` : ""}
        </table>
      </div>
      <a href="https://jappaleimmo.com/dashboard/visits" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;">
        Gérer la demande →
      </a>
    </div>
  </div>
</body></html>`,
        }),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
