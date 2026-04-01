import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

const statusLabels: Record<string, string> = {
  planning: "Planifié",
  in_progress: "En cours",
  on_hold: "En pause",
  completed: "Terminé",
  cancelled: "Annulé",
};

const quoteStatusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  accepted: "Acceptée",
  rejected: "Refusée",
};

interface ClientData {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  satisfaction_rating: number | null;
  total_revenue: number;
  source: string | null;
}

interface ProjectData {
  name: string;
  status: string;
  budget: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
}

interface QuoteData {
  project_description: string | null;
  status: string;
  total: number;
  created_at: string;
}

interface InteractionData {
  type: string;
  summary: string;
  interaction_date: string;
}

const typeLabels: Record<string, string> = {
  call: "Appel",
  email: "Courriel",
  note: "Note",
  meeting: "Rencontre",
};

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateClientPdf(
  client: ClientData,
  projects: ProjectData[],
  quotes: QuoteData[],
  interactions: InteractionData[],
  companyName: string,
  logoUrl?: string | null
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Logo
  let logoXOffset = 14;
  if (logoUrl) {
    const base64 = await loadImageAsBase64(logoUrl);
    if (base64) {
      try {
        doc.addImage(base64, "PNG", 14, 10, 18, 18);
        logoXOffset = 36;
      } catch {
        // Logo loading failed, continue without it
      }
    }
  }

  // Header
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(companyName, logoXOffset, y);
  doc.text(new Date().toLocaleDateString("fr-CA"), pageWidth - 14, y, { align: "right" });
  y += 10;

  // Client name
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text(`Fiche client : ${client.name}`, 14, y);
  y += 10;

  // Contact info
  doc.setFontSize(10);
  doc.setTextColor(80);
  const contactLines: string[] = [];
  if (client.email) contactLines.push(`Courriel : ${client.email}`);
  if (client.phone) contactLines.push(`Téléphone : ${client.phone}`);
  if (client.address) contactLines.push(`Adresse : ${client.address}`);
  if (client.source) contactLines.push(`Source : ${client.source}`);
  contactLines.push(`Satisfaction : ${client.satisfaction_rating || 0}/5`);
  contactLines.push(`Revenu total : ${fmt(client.total_revenue || 0)}`);

  contactLines.forEach((line) => {
    doc.text(line, 14, y);
    y += 5;
  });

  if (client.notes) {
    y += 2;
    doc.setFontSize(9);
    doc.setTextColor(100);
    const noteLines = doc.splitTextToSize(`Notes : ${client.notes}`, pageWidth - 28);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 4.5;
  }

  y += 6;

  // Projects table
  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.text(`Projets (${projects.length})`, 14, y);
  y += 2;

  if (projects.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Nom", "Statut", "Budget", "Dépensé", "Début"]],
      body: projects.map((p) => [
        p.name,
        statusLabels[p.status] || p.status,
        fmt(p.budget),
        fmt(p.spent),
        p.start_date ? new Date(p.start_date).toLocaleDateString("fr-CA") : "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [60, 60, 60] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Aucun projet", 14, y);
    y += 8;
  }

  // Check page break
  if (y > 240) { doc.addPage(); y = 15; }

  // Quotes table
  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.text(`Soumissions (${quotes.length})`, 14, y);
  y += 2;

  if (quotes.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Description", "Statut", "Total", "Date"]],
      body: quotes.map((q) => [
        q.project_description || "Soumission",
        quoteStatusLabels[q.status] || q.status,
        fmt(q.total),
        new Date(q.created_at).toLocaleDateString("fr-CA"),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [60, 60, 60] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Aucune soumission", 14, y);
    y += 8;
  }

  // Check page break
  if (y > 240) { doc.addPage(); y = 15; }

  // Interactions table
  if (interactions.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(`Interactions (${interactions.length})`, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Type", "Résumé", "Date"]],
      body: interactions.map((i) => [
        typeLabels[i.type] || i.type,
        i.summary,
        new Date(i.interaction_date).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" }),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [60, 60, 60] },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }

  doc.save(`fiche-client-${client.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
