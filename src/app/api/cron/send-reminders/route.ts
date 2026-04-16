import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

// J0, J+3, puis toutes les semaines (J+7, J+14, J+21...)
function shouldSendToday(dueDate: string, today: Date): boolean {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return false;
  if (diff === 0 || diff === 3) return true;
  if (diff >= 7 && diff % 7 === 0) return true;
  return false;
}

function getDaysOverdue(dueDate: string, today: Date): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function buildEmail(params: {
  tenantName: string;
  orgName: string;
  propertyTitle: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}): { subject: string; html: string } {
  const { tenantName, orgName, propertyTitle, amount, dueDate, daysOverdue } = params;
  const formattedDate = new Date(dueDate).toLocaleDateString("fr-FR");
  const formattedAmount = amount.toLocaleString("fr-FR");

  const subject = daysOverdue === 0
    ? `Rappel : votre loyer de ${formattedAmount} FCFA est dû aujourd'hui`
    : `Rappel : votre loyer de ${formattedAmount} FCFA est en retard (${daysOverdue}j)`;

  const intro = daysOverdue === 0
    ? `Votre loyer arrive à échéance <strong>aujourd'hui</strong>.`
    : `Votre loyer est en retard de <strong>${daysOverdue} jour${daysOverdue > 1 ? "s" : ""}</strong>.`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #1d4ed8; padding: 24px 32px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Jappalé Immo</h1>
      <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 13px;">${orgName}</p>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #111827;">Bonjour <strong>${tenantName}</strong>,</p>
      <p style="margin: 0 0 24px; color: #374151;">${intro}</p>
      <div style="background: #f3f4f6; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Bien</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${propertyTitle}</td></tr>
          <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Montant</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formattedAmount} FCFA</td></tr>
          <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Échéance</td><td style="color: ${daysOverdue > 0 ? "#dc2626" : "#111827"}; font-size: 14px; font-weight: 600; text-align: right;">${formattedDate}</td></tr>
        </table>
      </div>
      <p style="margin: 0; color: #374151; font-size: 14px;">
        Merci de régulariser votre situation au plus tôt. Pour toute question, contactez directement votre agence.
      </p>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Ce message est envoyé automatiquement par ${orgName} via Jappalé Immo.
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const { data: payments, error } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      due_date,
      status,
      leases (
        rent_amount,
        tenants ( first_name, last_name, email ),
        properties ( title,
          organizations ( name )
        )
      )
    `)
    .in("status", ["PENDING", "LATE"])
    .lte("due_date", todayStr);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let noEmail = 0;
  let lastError: string | null = null;

  for (const payment of payments ?? []) {
    if (!shouldSendToday(payment.due_date, today)) {
      skipped++;
      continue;
    }

    const lease = payment.leases as any;
    const tenant = lease?.tenants;
    const property = lease?.properties;
    const org = property?.organizations;

    if (!tenant?.email) {
      noEmail++;
      continue;
    }

    const overdue = getDaysOverdue(payment.due_date, today);
    const { subject, html } = buildEmail({
      tenantName: `${tenant.first_name} ${tenant.last_name}`,
      orgName: org?.name ?? "Jappalé Immo",
      propertyTitle: property?.title ?? "",
      amount: lease?.rent_amount ?? payment.amount,
      dueDate: payment.due_date,
      daysOverdue: overdue,
    });

    try {
      await transporter.sendMail({
        from: `"Jappalé Immo" <${process.env.GMAIL_USER}>`,
        to: tenant.email,
        subject,
        html,
      });
      sent++;
    } catch (err: any) {
      lastError = err.message ?? String(err);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    noEmail,
    date: todayStr,
    lastError,
  });
}
