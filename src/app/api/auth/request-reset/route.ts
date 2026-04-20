import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { email } = await req.json();

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: "https://jappaleimmo.com/reset-password",
    },
  });

  if (error) {
    console.error("[request-reset] generateLink error:", error.message, "email:", email);
  }

  if (!error && data?.properties?.action_link) {
    const link = data.properties.action_link;
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #1d4ed8; padding: 24px 32px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Jappalé Immo</h1>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #111827;">Bonjour,</p>
      <p style="margin: 0 0 24px; color: #374151;">
        Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
      </p>
      <a href="${link}" style="display: inline-block; background: #1d4ed8; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px;">
        Réinitialiser mon mot de passe
      </a>
      <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px;">
        Ce lien est valable 24 heures. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
      </p>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Jappalé Immo — Gestion immobilière simplifiée
      </p>
    </div>
  </div>
</body>
</html>`;

    console.log("[request-reset] Sending email to:", email);
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Jappalé Immo <noreply@jappaleimmo.com>",
        to: email,
        subject: "Réinitialisation de votre mot de passe — Jappalé Immo",
        html,
      }),
    });
    if (!resendRes.ok) {
      const resendErr = await resendRes.text();
      console.error("[request-reset] Resend error:", resendRes.status, resendErr);
    } else {
      console.log("[request-reset] Email sent successfully to:", email);
    }
  }

  // Toujours retourner success pour ne pas révéler si l'email existe
  return NextResponse.json({ ok: true });
}
