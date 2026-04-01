import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleEvent {
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  status: string;
  address: string | null;
  crew_members: string[];
}

interface Task {
  title: string;
  description: string | null;
  priority: string;
  status: string;
  project_name: string | null;
}

interface CompanyInfo {
  company_name: string;
  company_phone: string;
  company_address: string;
  logo_url: string | null;
}

const eventTypeLabels: Record<string, string> = {
  job: "Travail",
  estimate: "Estimation",
  meeting: "Réunion",
  followup: "Suivi",
};

const priorityLabels: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

/**
 * Generate a work order PDF for a specific employee on a specific date.
 */
export async function generateWorkOrderPdf(memberName: string, date: Date) {
  const dateStr = format(date, "yyyy-MM-dd");

  // Fetch company settings
  const { data: company } = await supabase
    .from("company_settings")
    .select("company_name, company_phone, company_address, logo_url")
    .limit(1)
    .single();

  // Fetch schedule events for this date that include this member
  const { data: allEvents, error: evErr } = await supabase
    .from("schedule_events")
    .select("title, description, event_date, start_time, end_time, event_type, status, address, crew_members")
    .eq("event_date", dateStr)
    .neq("status", "cancelled");

  if (evErr) throw evErr;

  // Filter events where this member is in crew_members
  const events = (allEvents ?? []).filter((e: any) =>
    (e.crew_members ?? []).some((c: string) =>
      c.toLowerCase().trim() === memberName.toLowerCase().trim()
    )
  ) as ScheduleEvent[];

  // Fetch tasks assigned to this member (via team_members name match)
  const { data: memberRow } = await (supabase as any)
    .from("team_members_public")
    .select("id, role")
    .eq("name", memberName)
    .limit(1)
    .single();

  let tasks: Task[] = [];
  if (memberRow) {
    const { data: taskData } = await supabase
      .from("tasks")
      .select("title, description, priority, status, projects:project_id(name)")
      .eq("assigned_to", memberRow.id)
      .in("status", ["todo", "in_progress"])
      .order("priority");
    tasks = (taskData ?? []).map((t: any) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      project_name: t.projects?.name || null,
    }));
  }

  const co = company as CompanyInfo | null;
  const dateLabel = format(date, "EEEE d MMMM yyyy", { locale: fr });

  // Create PDF (portrait letter)
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();

  // ─── Header bar ────────────────────────────────────────
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageW, 32, "F");

  doc.setTextColor(212, 168, 83);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("BON DE TRAVAIL", 14, 13);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(co?.company_name || "Entreprise", 14, 21);
  doc.text(co?.company_phone || "", 14, 26);

  // Right side: date
  doc.setTextColor(212, 168, 83);
  doc.setFontSize(11);
  doc.text(dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), pageW - 14, 13, { align: "right" });
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(10);
  doc.text(`Employé : ${memberName}`, pageW - 14, 21, { align: "right" });
  if (memberRow) {
    doc.text(`Poste : ${memberRow.role || "—"}`, pageW - 14, 26, { align: "right" });
  }

  let y = 40;

  // ─── Schedule Events ───────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Horaire du jour", 14, y);
  y += 6;

  if (events.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Aucun événement planifié pour cette journée.", 14, y);
    y += 8;
  } else {
    const tableHead = [["Heure", "Type", "Titre / Projet", "Adresse", "Notes"]];
    const tableBody = events.map((e) => {
      const time = e.start_time
        ? `${e.start_time.slice(0, 5)}${e.end_time ? " – " + e.end_time.slice(0, 5) : ""}`
        : "—";
      return [
        time,
        eventTypeLabels[e.event_type] || e.event_type,
        e.title,
        e.address || "—",
        e.description || "",
      ];
    });

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 2.5, textColor: [40, 40, 40] },
      headStyles: { fillColor: [212, 168, 83], textColor: [30, 30, 30], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 248] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 22 },
        3: { cellWidth: 40 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── Tasks ─────────────────────────────────────────────
  if (tasks.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Tâches assignées", 14, y);
    y += 6;

    const taskHead = [["Priorité", "Tâche", "Projet", "Description"]];
    const taskBody = tasks.map((t) => [
      priorityLabels[t.priority] || t.priority,
      t.title,
      t.project_name || "—",
      t.description || "",
    ]);

    autoTable(doc, {
      startY: y,
      head: taskHead,
      body: taskBody,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 2.5, textColor: [40, 40, 40] },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 248, 245] },
      columnStyles: {
        0: { cellWidth: 22 },
        2: { cellWidth: 35 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── Notes section (blank lines for handwritten notes) ─
  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Notes / Observations", 14, y);
  y += 6;

  doc.setDrawColor(200, 200, 200);
  for (let i = 0; i < 8; i++) {
    doc.line(14, y, pageW - 14, y);
    y += 8;
  }

  // ─── Signature section ─────────────────────────────────
  y += 4;
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  const sigW = (pageW - 42) / 2;
  doc.text("Signature employé :", 14, y);
  doc.line(14, y + 12, 14 + sigW, y + 12);

  doc.text("Signature superviseur :", 14 + sigW + 14, y);
  doc.line(14 + sigW + 14, y + 12, pageW - 14, y + 12);

  // ─── Footer ────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 200);
    doc.line(14, ph - 12, pageW - 14, ph - 12);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${co?.company_name || ""} — Bon de travail`, 14, ph - 7);
    doc.text(`Page ${i} / ${pageCount}`, pageW - 14, ph - 7, { align: "right" });
  }

  const fileName = `bon-travail-${memberName.replace(/\s+/g, "-").toLowerCase()}-${dateStr}.pdf`;
  doc.save(fileName);
}

/**
 * Generate work orders for ALL employees that have events on a given date.
 * Returns the list of employee names for which a PDF was generated.
 */
export async function generateAllWorkOrdersForDate(date: Date): Promise<string[]> {
  const dateStr = format(date, "yyyy-MM-dd");

  const { data: allEvents, error } = await supabase
    .from("schedule_events")
    .select("crew_members")
    .eq("event_date", dateStr)
    .neq("status", "cancelled");

  if (error) throw error;

  // Collect unique member names
  const namesSet = new Set<string>();
  for (const e of allEvents ?? []) {
    for (const name of (e.crew_members as string[]) ?? []) {
      if (name.trim()) namesSet.add(name.trim());
    }
  }

  const names = Array.from(namesSet).sort();
  for (const name of names) {
    await generateWorkOrderPdf(name, date);
  }

  return names;
}
