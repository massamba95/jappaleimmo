import jsPDF from "jspdf";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const STATUS_LABELS: Record<string, string> = {
  PAID:       "Payé",
  PARTIAL:    "Partiel",
  PENDING:    "En attente",
  LATE:       "En retard",
  NON_GENERE: "Non généré",
};

export interface LeaseSuiviForPDF {
  tenant: { first_name: string; last_name: string } | null;
  property: { title: string } | null;
  rent_amount: number;
  amountReceived: number;
  status: "PAID" | "PARTIAL" | "PENDING" | "LATE" | "NON_GENERE";
}

export interface RapportData {
  orgName: string;
  month: number; // 0-based
  year: number;
  leases: LeaseSuiviForPDF[];
}

export function generateRapportPDF(data: RapportData): void {
  const { orgName, month, year, leases } = data;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2; // 170mm

  const primary: [number, number, number] = [37, 99, 235];
  const dark: [number, number, number] = [17, 24, 39];
  const muted: [number, number, number] = [107, 114, 128];
  const light: [number, number, number] = [243, 244, 246];

  const monthLabel = `${MONTHS_FR[month]} ${year}`;

  // ── En-tête ─────────────────────────────────────────────
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("JAPPALÉ IMMO", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Gestion immobilière professionnelle", margin, 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(orgName, margin, 27);

  // ── Titre ────────────────────────────────────────────────
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RAPPORT MENSUEL", pageW / 2, 46, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...muted);
  doc.text(`Période : ${monthLabel}`, pageW / 2, 54, { align: "center" });

  doc.setDrawColor(...primary);
  doc.setLineWidth(0.8);
  doc.line(margin, 59, pageW - margin, 59);

  // ── Stats ────────────────────────────────────────────────
  const totalAttendu  = leases.reduce((s, l) => s + l.rent_amount, 0);
  const totalRecu     = leases.reduce((s, l) => s + l.amountReceived, 0);
  const totalReste    = totalAttendu - totalRecu;
  const taux          = totalAttendu > 0 ? Math.round((totalRecu / totalAttendu) * 100) : 0;

  let y = 68;
  const boxW = (contentW - 9) / 4; // 4 boxes, 3-gap spacing

  const statItems: { label: string; value: string; color: [number, number, number] }[] = [
    { label: "Attendu",       value: `${totalAttendu.toLocaleString("fr-FR")} FCFA`, color: dark },
    { label: "Reçu",          value: `${totalRecu.toLocaleString("fr-FR")} FCFA`,     color: [22, 163, 74] },
    { label: "Reste",         value: `${totalReste.toLocaleString("fr-FR")} FCFA`,    color: totalReste > 0 ? [220, 38, 38] : muted },
    { label: "Recouvrement",  value: `${taux}%`,                                       color: taux >= 80 ? [22, 163, 74] : taux >= 50 ? [161, 110, 0] : [220, 38, 38] },
  ];

  statItems.forEach((stat, i) => {
    const x = margin + i * (boxW + 3);
    doc.setFillColor(...light);
    doc.roundedRect(x, y, boxW, 18, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(stat.label, x + boxW / 2, y + 5.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...stat.color);
    doc.text(stat.value, x + boxW / 2, y + 13, { align: "center" });
  });

  y += 26;

  // ── En-tête tableau ──────────────────────────────────────
  // Colonnes: Locataire(45) Bien(40) Loyer(28) Reçu(22) Reste(22) Statut(13) = 170
  const cols = [45, 40, 28, 22, 22, 13] as const;
  const headers = ["Locataire", "Bien", "Loyer", "Reçu", "Reste", "Statut"];

  doc.setFillColor(...primary);
  doc.rect(margin, y, contentW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let cx = margin + 3;
  headers.forEach((h, i) => {
    doc.text(h, cx, y + 5.5);
    cx += cols[i];
  });
  y += 10;

  // ── Lignes ──────────────────────────────────────────────
  const truncate = (text: string, maxLen: number) =>
    text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;

  const statusColor: Record<string, [number, number, number]> = {
    PAID:       [22, 163, 74],
    PARTIAL:    [161, 110, 0],
    PENDING:    [107, 114, 128],
    LATE:       [220, 38, 38],
    NON_GENERE: [107, 114, 128],
  };

  leases.forEach((lease, idx) => {
    if (y > 272) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 1, contentW, 8, "F");
    }

    const reste = lease.rent_amount - lease.amountReceived;
    const tenantName = `${lease.tenant?.first_name ?? ""} ${lease.tenant?.last_name ?? ""}`.trim();
    const propertyTitle = lease.property?.title ?? "";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    cx = margin + 3;

    doc.setTextColor(...dark);
    doc.text(truncate(tenantName, 22), cx, y + 4.5); cx += cols[0];
    doc.text(truncate(propertyTitle, 20), cx, y + 4.5); cx += cols[1];
    doc.text(`${lease.rent_amount.toLocaleString("fr-FR")}`, cx, y + 4.5); cx += cols[2];

    if (lease.amountReceived > 0) {
      doc.setTextColor(22, 163, 74);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(...muted);
    }
    doc.text(
      lease.amountReceived > 0 ? `${lease.amountReceived.toLocaleString("fr-FR")}` : "—",
      cx, y + 4.5
    );
    cx += cols[3];

    if (reste > 0 && lease.status !== "NON_GENERE") {
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.text(`${reste.toLocaleString("fr-FR")}`, cx, y + 4.5);
    } else {
      doc.setTextColor(...muted);
      doc.setFont("helvetica", "normal");
      doc.text("—", cx, y + 4.5);
    }
    cx += cols[4];

    doc.setTextColor(...(statusColor[lease.status] ?? dark));
    doc.setFont("helvetica", "bold");
    doc.text(STATUS_LABELS[lease.status] ?? lease.status, cx, y + 4.5);

    y += 8;
  });

  // ── Résumé comptages ─────────────────────────────────────
  y += 4;
  doc.setDrawColor(...light);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const counts = {
    PAID:       leases.filter((l) => l.status === "PAID").length,
    PARTIAL:    leases.filter((l) => l.status === "PARTIAL").length,
    PENDING:    leases.filter((l) => l.status === "PENDING").length,
    LATE:       leases.filter((l) => l.status === "LATE").length,
    NON_GENERE: leases.filter((l) => l.status === "NON_GENERE").length,
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(
    `${leases.length} baux · ${counts.PAID} payé(s) · ${counts.PARTIAL} partiel(s) · ${counts.PENDING} en attente · ${counts.LATE} en retard · ${counts.NON_GENERE} non générés`,
    pageW / 2, y, { align: "center" }
  );

  // ── Pied de page ────────────────────────────────────────
  const footerY = 285;
  doc.setDrawColor(...light);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  doc.text(
    "Ce document est généré automatiquement par Jappalé Immo · jappaleimmo.vercel.app",
    pageW / 2, footerY + 5, { align: "center" }
  );

  const filename = `rapport_${monthLabel.toLowerCase().replace(" ", "_")}_${orgName.toLowerCase().replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
