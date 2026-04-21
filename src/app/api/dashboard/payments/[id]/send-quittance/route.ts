import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const methodLabels: Record<string, string> = {
  CASH: "Espèces",
  TRANSFER: "Virement bancaire",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
};

const monthsFR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Vérifier user connecté
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Charger le paiement avec toutes les infos (admin pour bypass RLS)
  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("*, leases(id, created_at, rent_amount, tenants(first_name, last_name, phone, email), properties(title, address, city, charges, org_id))")
    .eq("id", id)
    .single() as any;

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  const tenant = payment.leases?.tenants;
  const property = payment.leases?.properties;
  const lease = payment.leases;

  if (!tenant?.email) {
    return NextResponse.json({ error: "Pas d'email" }, { status: 400 });
  }

  // Récupérer le nom de l'organisation
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", property?.org_id)
    .single() as any;

  const orgName = org?.name ?? "Jappalé Immo";

  // Construire les données de la quittance
  const dueDate = new Date(payment.due_date);
  const moisLabel = `${monthsFR[dueDate.getMonth()]} ${dueDate.getFullYear()}`;
  const paidDate = payment.paid_date ? new Date(payment.paid_date) : new Date();
  const paidLabel = paidDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const leaseYear = new Date(lease.created_at).getFullYear();
  const leaseNumber = `BAI-${leaseYear}-${lease.id.slice(0, 6).toUpperCase()}`;
  const reference = `QUI-${payment.id.slice(0, 8).toUpperCase()}`;
  const methodLabel = methodLabels[payment.method] ?? payment.method;
  const tenantName = `${tenant.first_name} ${tenant.last_name}`;
  const rentAmount = (lease.rent_amount as number).toLocaleString("fr-FR");
  const charges = (property?.charges ?? 0) as number;
  const amountFormatted = (payment.amount as number).toLocaleString("fr-FR");

  const chargesRow = charges > 0
    ? `<tr><td style="color:#6b7280;font-size:14px;padding:6px 0;border-bottom:1px solid #f3f4f6;">Charges</td><td style="color:#111827;font-size:14px;font-weight:600;text-align:right;padding:6px 0;border-bottom:1px solid #f3f4f6;">${charges.toLocaleString("fr-FR")} FCFA</td></tr>`
    : "";

  const htmlBody = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">

    <!-- En-tête -->
    <div style="background:#2563eb;padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">JAPPALÉ IMMO</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">Gestion immobilière professionnelle</p>
      <p style="color:#93c5fd;margin:6px 0 0;font-size:13px;">${orgName}</p>
    </div>

    <!-- Titre -->
    <div style="padding:28px 32px 0;text-align:center;">
      <h2 style="margin:0;font-size:22px;color:#111827;">QUITTANCE DE LOYER</h2>
      <p style="margin:6px 0 0;font-size:15px;color:#6b7280;">Période : <strong>${moisLabel}</strong></p>
      <div style="margin:16px auto 0;width:60px;height:3px;background:#2563eb;border-radius:2px;"></div>
    </div>

    <div style="padding:24px 32px;">

      <!-- Infos locataire + bien -->
      <div style="display:table;width:100%;margin-bottom:20px;">
        <div style="display:table-cell;width:50%;vertical-align:top;padding-right:12px;">
          <div style="background:#f3f4f6;border-radius:6px;padding:14px 16px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.05em;">Locataire</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${tenantName}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${tenant.phone ?? ""}</p>
          </div>
        </div>
        <div style="display:table-cell;width:50%;vertical-align:top;padding-left:12px;">
          <div style="background:#f3f4f6;border-radius:6px;padding:14px 16px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.05em;">Bien loué</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${property?.title ?? ""}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${property?.address ?? ""}, ${property?.city ?? ""}</p>
          </div>
        </div>
      </div>

      <!-- Détail paiement -->
      <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#f3f4f6;padding:10px 16px;">
          <p style="margin:0;font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.05em;">Détail du paiement</p>
        </div>
        <div style="padding:4px 16px 12px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="color:#6b7280;font-size:14px;padding:6px 0;border-bottom:1px solid #f3f4f6;">Loyer mensuel</td>
              <td style="color:#111827;font-size:14px;font-weight:600;text-align:right;padding:6px 0;border-bottom:1px solid #f3f4f6;">${rentAmount} FCFA</td>
            </tr>
            ${chargesRow}
            <tr>
              <td style="color:#111827;font-size:15px;font-weight:700;padding:10px 0 4px;">TOTAL PAYÉ</td>
              <td style="color:#2563eb;font-size:15px;font-weight:700;text-align:right;padding:10px 0 4px;">${amountFormatted} FCFA</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Infos complémentaires -->
      <div style="background:#f3f4f6;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Mode de paiement</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;">${methodLabel}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Date de paiement</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;">${paidLabel}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">Référence</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;">${reference}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">N° Contrat</td>
            <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;">${leaseNumber}</td>
          </tr>
        </table>
      </div>

      <!-- Attestation -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#16a34a;">✓ Paiement confirmé</p>
        <p style="margin:0;font-size:13px;color:#15803d;line-height:1.5;">
          Je soussigné(e), gérant de <strong>${orgName}</strong>, atteste avoir reçu de M./Mme <strong>${tenantName}</strong>
          la somme de <strong>${amountFormatted} FCFA</strong> en règlement du loyer du mois de <strong>${moisLabel}</strong>
          pour le bien situé à ${property?.address ?? ""}, ${property?.city ?? ""}.
        </p>
      </div>

    </div>

    <!-- Pied de page -->
    <div style="border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Ce document est généré automatiquement par Jappalé Immo · jappaleimmo.com</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Document valable comme quittance de loyer</p>
    </div>
  </div>
</body>
</html>`;

  // Envoyer via Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Jappalé Immo <noreply@jappaleimmo.com>",
      to: tenant.email,
      subject: `Votre quittance de loyer — ${moisLabel}`,
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error:", body);
    return NextResponse.json({ error: "Erreur envoi email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
