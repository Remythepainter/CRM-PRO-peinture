import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface TimeEntryRow {
  date: string;
  hours: number;
  hourly_rate: number;
  total_cost: number;
  description: string | null;
  team_members: { name: string; role: string } | null;
  projects: { name: string } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(n);

export async function generateWeeklyTimesheetPdf(weekOffset = 0) {
  const ref = new Date();
  ref.setDate(ref.getDate() + weekOffset * 7);
  const weekStart = startOfWeek(ref, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(ref, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data, error } = await supabase
    .from("time_entries")
    .select("date, hours, hourly_rate, total_cost, description, team_members(name, role), projects:project_id(name)")
    .gte("date", weekStart.toISOString().slice(0, 10))
    .lte("date", weekEnd.toISOString().slice(0, 10))
    .order("date");

  if (error) throw error;
  const entries = (data ?? []) as unknown as TimeEntryRow[];

  // Group by member
  const byMember: Record<string, { role: string; entries: TimeEntryRow[] }> = {};
  for (const e of entries) {
    const name = e.team_members?.name || "Non assigné";
    if (!byMember[name]) byMember[name] = { role: e.team_members?.role || "", entries: [] };
    byMember[name].entries.push(e);
  }

  const weekLabel = `${format(weekStart, "d MMMM", { locale: fr })} au ${format(weekEnd, "d MMMM yyyy", { locale: fr })}`;

  // Create PDF
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(212, 168, 83); // gold
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport hebdomadaire des heures", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text(`Semaine du ${weekLabel}`, 14, 22);
  doc.text(`Généré le ${format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr })}`, pageW - 14, 22, { align: "right" });

  let y = 36;

  // Grand totals
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const totalCost = entries.reduce((s, e) => s + (e.total_cost || 0), 0);
  const memberCount = Object.keys(byMember).length;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total : ${totalHours.toFixed(1)}h  ·  ${fmt(totalCost)}  ·  ${memberCount} membre${memberCount > 1 ? "s" : ""}`, 14, y);
  y += 8;

  // Per-member tables
  const sortedMembers = Object.entries(byMember).sort((a, b) => b[1].entries.reduce((s, e) => s + e.hours, 0) - a[1].entries.reduce((s, e) => s + e.hours, 0));

  for (const [name, { role, entries: memberEntries }] of sortedMembers) {
    const memberHours = memberEntries.reduce((s, e) => s + e.hours, 0);
    const memberCost = memberEntries.reduce((s, e) => s + (e.total_cost || 0), 0);

    // Check page space
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 20;
    }

    // Member header
    doc.setFillColor(245, 245, 240);
    doc.rect(14, y - 4, pageW - 28, 8, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${name}`, 16, y + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`${role}  ·  ${memberHours.toFixed(1)}h  ·  ${fmt(memberCost)}`, pageW - 16, y + 1, { align: "right" });
    y += 8;

    // Day-by-day breakdown with project detail
    const tableHead = [["Date", "Projet", "Description", "Heures", "Taux", "Coût"]];
    const tableBody = memberEntries.map((e) => [
      format(new Date(e.date + "T12:00:00"), "EEE d MMM", { locale: fr }),
      e.projects?.name || "—",
      e.description || "—",
      `${e.hours.toFixed(1)}h`,
      fmt(e.hourly_rate),
      fmt(e.total_cost || 0),
    ]);

    // Daily summary row
    const dailyTotals: Record<string, number> = {};
    for (const d of days) {
      const key = format(d, "yyyy-MM-dd");
      dailyTotals[key] = memberEntries.filter((e) => e.date === key).reduce((s, e) => s + e.hours, 0);
    }

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      foot: [["", "", "Total", `${memberHours.toFixed(1)}h`, "", fmt(memberCost)]],
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2, textColor: [50, 50, 50] },
      headStyles: { fillColor: [212, 168, 83], textColor: [30, 30, 30], fontStyle: "bold" },
      footStyles: { fillColor: [240, 240, 235], textColor: [30, 30, 30], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 248] },
      columnStyles: {
        0: { cellWidth: 30 },
        3: { halign: "right", cellWidth: 20 },
        4: { halign: "right", cellWidth: 25 },
        5: { halign: "right", cellWidth: 25 },
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (entries.length === 0) {
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(12);
    doc.text("Aucune heure enregistrée cette semaine.", pageW / 2, 60, { align: "center" });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 200);
    doc.line(14, ph - 12, pageW - 14, ph - 12);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${pageCount}`, pageW - 14, ph - 7, { align: "right" });
  }

  const fileName = `rapport-heures-${format(weekStart, "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
