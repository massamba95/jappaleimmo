import jsPDF from "jspdf";

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

export interface QuittanceData {
  // Agence
  orgName: string;
  // Paiement
  paymentId: string;
  amount: number;
  dueDate: string;       // ISO date — mois de la quittance
  paidDate: string | null;
  method: string;
  // Bail
  leaseNumber: string;
  rentAmount: number;
  charges: number;
  // Locataire
  tenantFirstName: string;
  tenantLastName: string;
  tenantPhone: string;
  // Bien
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
}

export function generateQuittancePDF(data: QuittanceData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;

  // Couleurs
  const primary = [37, 99, 235] as [number, number, number];   // blue-600
  const dark = [17, 24, 39] as [number, number, number];        // gray-900
  const muted = [107, 114, 128] as [number, number, number];    // gray-500
  const light = [243, 244, 246] as [number, number, number];    // gray-100

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
  doc.text(data.orgName, margin, 27);

  // ── Titre quittance ─────────────────────────────────────
  const dueD = new Date(data.dueDate);
  const moisLabel = `${monthsFR[dueD.getMonth()]} ${dueD.getFullYear()}`;

  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("QUITTANCE DE LOYER", pageW / 2, 46, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...muted);
  doc.text(`Période : ${moisLabel}`, pageW / 2, 54, { align: "center" });

  // Ligne séparatrice
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.8);
  doc.line(margin, 59, pageW - margin, 59);

  // ── Infos en deux colonnes ──────────────────────────────
  let y = 68;
  const colL = margin;
  const colR = pageW / 2 + 5;

  function blockTitle(text: string, x: number, startY: number): number {
    doc.setFillColor(...light);
    doc.roundedRect(x, startY, contentW / 2 - 5, 7, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...primary);
    doc.text(text.toUpperCase(), x + 3, startY + 4.8);
    return startY + 10;
  }

  function row(label: string, value: string, x: number, rowY: number): number {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(label, x, rowY);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 38, rowY);
    return rowY + 6;
  }

  // Colonne gauche — Locataire
  y = blockTitle("Locataire", colL, y);
  y = row("Nom :", `${data.tenantFirstName} ${data.tenantLastName}`, colL, y);
  y = row("Téléphone :", data.tenantPhone, colL, y);

  // Colonne droite — Bien
  let yR = 68;
  yR = blockTitle("Bien loué", colR, yR);
  yR = row("Bien :", data.propertyTitle, colR, yR);
  yR = row("Adresse :", data.propertyAddress, colR, yR);
  yR = row("Ville :", data.propertyCity, colR, yR);

  // ── Détail du paiement ──────────────────────────────────
  y = Math.max(y, yR) + 8;

  doc.setFillColor(...light);
  doc.roundedRect(margin, y, contentW, 7, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...primary);
  doc.text("DÉTAIL DU PAIEMENT", margin + 3, y + 4.8);
  y += 10;

  // Tableau simple
  const col1 = margin;
  const col2 = margin + 90;
  const col3 = margin + 140;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Description", col1, y);
  doc.text("Montant", col2, y);
  doc.text("Détail", col3, y);
  y += 2;
  doc.setDrawColor(...light);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  doc.text("Loyer mensuel", col1, y);
  doc.text(`${data.rentAmount.toLocaleString("fr-FR")} FCFA`, col2, y);
  y += 6;

  if (data.charges > 0) {
    doc.text("Charges", col1, y);
    doc.text(`${data.charges.toLocaleString("fr-FR")} FCFA`, col2, y);
    y += 6;
  }

  if (data.amount !== data.rentAmount + data.charges && data.amount !== data.rentAmount) {
    doc.text("Montant versé", col1, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.amount.toLocaleString("fr-FR")} FCFA`, col2, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  }

  // Ligne total
  y += 2;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text("TOTAL PAYÉ", col1, y);
  doc.text(`${data.amount.toLocaleString("fr-FR")} FCFA`, col2, y);
  y += 12;

  // ── Infos paiement ──────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);

  const paidD = data.paidDate ? new Date(data.paidDate) : new Date();
  const paidLabel = paidD.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  doc.text(`Mode de paiement : `, margin, y);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(methodLabels[data.method] ?? data.method, margin + 38, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`Date de paiement : `, margin, y);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(paidLabel, margin + 38, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`Référence : `, margin, y);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(`QUI-${data.paymentId.slice(0, 8).toUpperCase()}`, margin + 38, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`N° Contrat : `, margin, y);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(data.leaseNumber, margin + 38, y);
  y += 14;

  // ── Attestation ─────────────────────────────────────────
  doc.setFillColor(240, 253, 244); // green-50
  doc.roundedRect(margin, y, contentW, 16, 2, 2, "F");
  doc.setDrawColor(134, 239, 172); // green-300
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 16, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(22, 163, 74); // green-600
  doc.text("✓  Paiement confirmé", margin + 5, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61); // green-700
  doc.text(
    `Je soussigné(e), gérant de ${data.orgName}, atteste avoir reçu de M./Mme ${data.tenantFirstName} ${data.tenantLastName}`,
    margin + 5, y + 11.5
  );
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(
    `la somme de ${data.amount.toLocaleString("fr-FR")} FCFA en règlement du loyer du mois de ${moisLabel} pour le bien situé à ${data.propertyAddress}, ${data.propertyCity}.`,
    margin, y
  );
  y += 16;

  // ── Signature ───────────────────────────────────────────
  const sigX = pageW - margin - 70;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);

  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Dakar, le ${today}`, sigX, y);
  y += 5;
  doc.text("Signature & Cachet", sigX, y);
  y += 12;
  doc.setDrawColor(...muted);
  doc.setLineWidth(0.3);
  doc.line(sigX, y, sigX + 65, y);

  // ── Pied de page ────────────────────────────────────────
  const footerY = 285;
  doc.setDrawColor(...light);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageW - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  doc.text("Ce document est généré automatiquement par Jappalé Immo · jappaleimmo.vercel.app", pageW / 2, footerY + 5, { align: "center" });
  doc.text("Document non modifiable — valable comme quittance de loyer", pageW / 2, footerY + 9, { align: "center" });

  // ── Téléchargement ──────────────────────────────────────
  const filename = `quittance_${data.tenantLastName.toLowerCase()}_${moisLabel.replace(" ", "_")}.pdf`;
  doc.save(filename);
}
