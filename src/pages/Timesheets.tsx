import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Clock, ChevronLeft, ChevronRight, Loader2, Plus, Save, Users, User, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, parseISO, isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(n);

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface TimeEntry {
  id: string;
  project_id: string;
  team_member_id: string | null;
  date: string;
  hours: number;
  hourly_rate: number;
  total_cost: number | null;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  avatar_url: string | null;
  status: string;
}

interface Project {
  id: string;
  name: string;
  client_name: string;
}

// ──────────────────────────────────────────────────────
// Employee weekly timesheet entry
// ──────────────────────────────────────────────────────
const EmployeeWeekView = ({
  weekStart,
  projects,
  teamMembers,
  entries,
  userId,
  isLoading,
}: {
  weekStart: Date;
  projects: Project[];
  teamMembers: TeamMember[];
  entries: TimeEntry[];
  userId: string | undefined;
  isLoading: boolean;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const { isAdmin } = useUserRole();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group entries by project+member
  const rows = useMemo(() => {
    const map = new Map<string, { projectId: string; memberId: string; entries: Map<string, TimeEntry> }>();
    entries.forEach((e) => {
      const key = `${e.project_id}|${e.team_member_id || ""}`;
      if (!map.has(key)) {
        map.set(key, { projectId: e.project_id, memberId: e.team_member_id || "", entries: new Map() });
      }
      map.get(key)!.entries.set(e.date, e);
    });
    return Array.from(map.values());
  }, [entries]);

  // Local edit state: key = "projectId|memberId|date"
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const setHours = (projectId: string, memberId: string, date: string, val: string) => {
    setEdits((prev) => ({ ...prev, [`${projectId}|${memberId}|${date}`]: val }));
  };

  const getHours = (projectId: string, memberId: string, date: string, existing?: TimeEntry) => {
    const key = `${projectId}|${memberId}|${date}`;
    if (key in edits) return edits[key];
    return existing ? String(existing.hours) : "";
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const upserts: { project_id: string; team_member_id: string; date: string; hours: number; hourly_rate: number; created_by: string }[] = [];
      const deletes: string[] = [];

      for (const [key, val] of Object.entries(edits)) {
        const [projectId, memberId, date] = key.split("|");
        const hours = parseFloat(val);
        const member = teamMembers.find((m) => m.id === memberId);
        const rate = member?.hourly_rate || 0;

        // Find existing entry
        const existing = entries.find(
          (e) => e.project_id === projectId && e.team_member_id === memberId && e.date === date
        );

        if (!val || hours === 0) {
          if (existing) deletes.push(existing.id);
        } else if (hours > 0) {
          if (existing) {
            await supabase
              .from("time_entries")
              .update({ hours, hourly_rate: rate, total_cost: hours * rate })
              .eq("id", existing.id);
          } else {
            upserts.push({
              project_id: projectId,
              team_member_id: memberId,
              date,
              hours,
              hourly_rate: rate,
              created_by: userId || "",
            });
          }
        }
      }

      if (deletes.length) {
        await supabase.from("time_entries").delete().in("id", deletes);
      }
      if (upserts.length) {
        await supabase.from("time_entries").insert(
          upserts.map((u) => ({ ...u, total_cost: u.hours * u.hourly_rate }))
        );
      }

      setEdits({});
      queryClient.invalidateQueries({ queryKey: ["timesheet_entries"] });
      toast({ title: "Heures sauvegardées ✓" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
    setSaving(false);
  };

  const addRow = () => {
    if (!selectedProjectId || !selectedMemberId) return;
    // Just add a virtual row by setting 0 hours for Monday
    const mondayDate = format(weekStart, "yyyy-MM-dd");
    setHours(selectedProjectId, selectedMemberId, mondayDate, "");
    // Force a re-render with the new key
    setEdits((prev) => ({ ...prev, [`${selectedProjectId}|${selectedMemberId}|${mondayDate}`]: prev[`${selectedProjectId}|${selectedMemberId}|${mondayDate}`] || "" }));
    setAddDialogOpen(false);
    setSelectedProjectId("");
    setSelectedMemberId("");
  };

  // Merge actual rows + virtual rows from edits
  const allRows = useMemo(() => {
    const existing = new Set(rows.map((r) => `${r.projectId}|${r.memberId}`));
    const virtual: typeof rows = [];
    Object.keys(edits).forEach((key) => {
      const [projectId, memberId] = key.split("|");
      const rowKey = `${projectId}|${memberId}`;
      if (!existing.has(rowKey)) {
        existing.add(rowKey);
        virtual.push({ projectId, memberId, entries: new Map() });
      }
    });
    return [...rows, ...virtual];
  }, [rows, edits]);

  const hasEdits = Object.keys(edits).length > 0;

  const weekTotal = useMemo(() => {
    let total = 0;
    allRows.forEach((row) => {
      days.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const val = getHours(row.projectId, row.memberId, dateStr, row.entries.get(dateStr));
        total += parseFloat(val) || 0;
      });
    });
    return total;
  }, [allRows, days, edits, entries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-base px-3 py-1">
            <Clock className="h-4 w-4 mr-1" />
            {weekTotal.toFixed(1)}h cette semaine
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
          </Button>
          {hasEdits && (
            <Button size="sm" onClick={saveAll} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Sauvegarder
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 min-w-[200px]">Projet</th>
              <th className="text-left p-2 min-w-[140px]">Employé</th>
              {days.map((day, i) => (
                <th key={i} className={cn("text-center p-2 min-w-[80px]", isSameDay(day, new Date()) && "bg-primary/10 rounded")}>
                  <div className="font-medium">{DAY_NAMES[i]}</div>
                  <div className="text-xs text-muted-foreground">{format(day, "d MMM", { locale: fr })}</div>
                </th>
              ))}
              <th className="text-center p-2 min-w-[70px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {allRows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-12 text-muted-foreground">
                  Aucune entrée cette semaine. Clique « Ajouter une ligne » pour commencer.
                </td>
              </tr>
            )}
            {allRows.map((row, idx) => {
              const project = projects.find((p) => p.id === row.projectId);
              const member = teamMembers.find((m) => m.id === row.memberId);
              let rowTotal = 0;

              return (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-2">
                    <div className="font-medium text-foreground">{project?.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{project?.client_name || ""}</div>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {member?.avatar_url ? (
                        <img src={member.avatar_url} className="h-6 w-6 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs">
                          {member?.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <span className="text-sm">{member?.name || "—"}</span>
                    </div>
                  </td>
                  {days.map((day, di) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const existing = row.entries.get(dateStr);
                    const val = getHours(row.projectId, row.memberId, dateStr, existing);
                    const hours = parseFloat(val) || 0;
                    rowTotal += hours;

                    return (
                      <td key={di} className={cn("p-1 text-center", isSameDay(day, new Date()) && "bg-primary/5")}>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={val}
                          onChange={(e) => setHours(row.projectId, row.memberId, dateStr, e.target.value)}
                          className="h-8 w-16 text-center mx-auto text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="—"
                        />
                      </td>
                    );
                  })}
                  <td className="p-2 text-center font-semibold text-foreground">
                    {rowTotal > 0 ? `${rowTotal.toFixed(1)}h` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {allRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border">
                <td colSpan={2} className="p-2 font-semibold text-right">Total par jour</td>
                {days.map((day, di) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  let dayTotal = 0;
                  allRows.forEach((row) => {
                    const val = getHours(row.projectId, row.memberId, dateStr, row.entries.get(dateStr));
                    dayTotal += parseFloat(val) || 0;
                  });
                  return (
                    <td key={di} className="p-2 text-center font-semibold">
                      {dayTotal > 0 ? `${dayTotal.toFixed(1)}` : "—"}
                    </td>
                  );
                })}
                <td className="p-2 text-center font-bold text-primary">
                  {weekTotal.toFixed(1)}h
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une ligne de temps</DialogTitle>
            <DialogDescription>Sélectionne le projet et l'employé</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Projet</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger><SelectValue placeholder="Choisir un projet" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.client_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employé</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger><SelectValue placeholder="Choisir un employé" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.filter((m) => m.status === "active").map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={addRow}
              disabled={!selectedProjectId || !selectedMemberId}
            >
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ──────────────────────────────────────────────────────
// Admin summary table
// ──────────────────────────────────────────────────────
const AdminSummaryView = ({
  weekStart,
  projects,
  teamMembers,
  entries,
}: {
  weekStart: Date;
  projects: Project[];
  teamMembers: TeamMember[];
  entries: TimeEntry[];
}) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Estimation approximative des déductions (RRQ, RQAP, AE, Impôts) pour un peintre de la construction
  const DEDUCTION_RATE = 0.285; // ~28.5%

  // Group by employee
  const byMember = useMemo(() => {
    const map = new Map<string, { member: TeamMember; byProject: Map<string, Map<string, number>>; dailyTotals: number[]; weekTotal: number; weekCost: number; netPay: number }>();

    teamMembers.filter((m) => m.status === "active").forEach((m) => {
      map.set(m.id, {
        member: m,
        byProject: new Map(),
        dailyTotals: new Array(7).fill(0),
        weekTotal: 0,
        weekCost: 0,
        netPay: 0,
      });
    });

    entries.forEach((e) => {
      if (!e.team_member_id) return;
      const data = map.get(e.team_member_id);
      if (!data) return;

      if (!data.byProject.has(e.project_id)) {
        data.byProject.set(e.project_id, new Map());
      }
      data.byProject.get(e.project_id)!.set(e.date, e.hours);

      const dayIdx = days.findIndex((d) => format(d, "yyyy-MM-dd") === e.date);
      if (dayIdx >= 0) {
        data.dailyTotals[dayIdx] += e.hours;
      }
      data.weekTotal += e.hours;
      data.weekCost += e.hours * e.hourly_rate;
    });
    
    // Calcul de la paie nette
    for (const data of map.values()) {
      data.netPay = data.weekCost * (1 - DEDUCTION_RATE);
    }

    return Array.from(map.values()).filter((d) => d.weekTotal > 0 || true);
  }, [entries, teamMembers, days]);

  const grandTotal = byMember.reduce((s, m) => s + m.weekTotal, 0);
  const grandCost = byMember.reduce((s, m) => s + m.weekCost, 0);
  const grandNet = byMember.reduce((s, m) => s + m.netPay, 0);
  const dailyGrandTotals = days.map((_, i) => byMember.reduce((s, m) => s + m.dailyTotals[i], 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="text-base px-3 py-1">
          <Users className="h-4 w-4 mr-1" />
          {byMember.filter((m) => m.weekTotal > 0).length} employés actifs
        </Badge>
        <Badge variant="outline" className="text-base px-3 py-1">
          <Clock className="h-4 w-4 mr-1" />
          {grandTotal.toFixed(1)}h totales
        </Badge>
        <Badge variant="outline" className="text-base px-3 py-1">
          💰 Coût brut: {fmt(grandCost)}
        </Badge>
        <Badge variant="default" className="bg-green-600 text-base px-3 py-1">
          💵 Total Net Estimé: {fmt(grandNet)}
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left p-2 min-w-[180px]">Employé</th>
              {days.map((day, i) => (
                <th key={i} className={cn("text-center p-2 min-w-[80px]", isSameDay(day, new Date()) && "bg-primary/10 rounded")}>
                  <div className="font-medium">{DAY_NAMES[i]}</div>
                  <div className="text-xs text-muted-foreground">{format(day, "d MMM", { locale: fr })}</div>
                </th>
              ))}
              <th className="text-center p-2 min-w-[70px]">Total H</th>
              <th className="text-right p-2 min-w-[100px]">Salaire Brut</th>
              <th className="text-right p-2 min-w-[100px]">Est. Net (-28.5%)</th>
            </tr>
          </thead>
          <tbody>
            {byMember.map(({ member, dailyTotals, weekTotal, weekCost, netPay, byProject }) => (
              <tr key={member.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{fmt(member.hourly_rate)}/h</div>
                    </div>
                  </div>
                </td>
                {dailyTotals.map((h, i) => (
                  <td key={i} className={cn(
                    "p-2 text-center",
                    isSameDay(days[i], new Date()) && "bg-primary/5",
                    h > 8 && "text-warning font-semibold",
                    h === 0 && "text-muted-foreground/50"
                  )}>
                    {h > 0 ? `${h.toFixed(1)}` : "—"}
                  </td>
                ))}
                <td className={cn("p-2 text-center font-semibold", weekTotal >= 40 && "text-success")}>
                  {weekTotal > 0 ? `${weekTotal.toFixed(1)}h` : "—"}
                </td>
                <td className="p-2 text-right font-medium text-muted-foreground">
                  {weekCost > 0 ? fmt(weekCost) : "—"}
                </td>
                <td className="p-2 text-right font-bold text-green-600 dark:text-green-500">
                  {netPay > 0 ? fmt(netPay) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td className="p-2 font-bold">Total équipe</td>
              {dailyGrandTotals.map((h, i) => (
                <td key={i} className="p-2 text-center font-bold">
                  {h > 0 ? `${h.toFixed(1)}` : "—"}
                </td>
              ))}
              <td className="p-2 text-center font-bold text-primary">
                {grandTotal.toFixed(1)}h
              </td>
              <td className="p-2 text-right font-bold text-muted-foreground">
                {fmt(grandCost)}
              </td>
              <td className="p-2 text-right font-bold text-green-600 dark:text-green-500">
                {fmt(grandNet)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Per-employee project breakdown */}
      <div className="grid gap-3 mt-6">
        {byMember.filter((m) => m.weekTotal > 0).map(({ member, byProject }) => (
          <Card key={member.id} className="border-border/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                {member.avatar_url ? (
                  <img src={member.avatar_url} className="h-5 w-5 rounded-full object-cover" alt="" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[10px]">
                    {member.name.charAt(0)}
                  </div>
                )}
                {member.name} — Détails par projet
              </h4>
              <div className="space-y-1">
                {Array.from(byProject.entries()).map(([projId, dayMap]) => {
                  const proj = projects.find((p) => p.id === projId);
                  const total = Array.from(dayMap.values()).reduce((s, h) => s + h, 0);
                  return (
                    <div key={projId} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">{proj?.name || "—"} ({proj?.client_name})</span>
                      <span className="font-medium">{total.toFixed(1)}h</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────
const Timesheets = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset === 0 ? base : addWeeks(base, weekOffset);
  }, [weekOffset]);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["timesheet_entries", format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .order("date");
      if (error) throw error;
      return data as TimeEntry[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_for_timesheet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_name")
        .in("status", ["active", "in_progress", "planning"])
        .order("name");
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team_for_timesheet"],
    queryFn: async () => {
      if (isAdmin) {
        const { data, error } = await supabase
          .from("team_members")
          .select("id, name, role, hourly_rate, avatar_url, status")
          .order("name");
        if (error) throw error;
        return data as TeamMember[];
      } else {
        // Employees only get public view — no hourly_rate
        const { data, error } = await (supabase as any)
          .from("team_members_public")
          .select("id, name, role, avatar_url, status")
          .order("name");
        if (error) throw error;
        return (data ?? []).map((m: any) => ({
          ...m,
          hourly_rate: 0,
          status: m.status || "active",
        })) as TeamMember[];
      }
    },
    enabled: isAdmin !== undefined,
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              Feuilles de temps (Horaires)
            </h1>
            <p className="text-muted-foreground text-sm">Saisie et suivi des heures travaillées</p>
          </div>

          {/* Week nav */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekOffset((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={weekOffset === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setWeekOffset(0)}
            >
              Cette semaine
            </Button>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium ml-2">
              {format(weekStart, "d MMM", { locale: fr })} — {format(weekEnd, "d MMM yyyy", { locale: fr })}
            </span>
          </div>
        </div>

            {/* Tabs */}
        <Tabs defaultValue="entry">
          <TabsList>
            <TabsTrigger value="entry" className="gap-1">
              <User className="h-4 w-4" /> Saisie des heures
            </TabsTrigger>
            {(isAdmin === true || isAccountant === true || isManager === true) && (
              <TabsTrigger value="admin" className="gap-1">
                <Users className="h-4 w-4" /> Résumé et Paies
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="entry">
            <Card>
              <CardContent className="p-4">
                <EmployeeWeekView
                  weekStart={weekStart}
                  projects={projects}
                  teamMembers={teamMembers}
                  entries={entries}
                  userId={user?.id}
                  isLoading={loadingEntries}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin === true && (
            <TabsContent value="admin">
              <Card>
                <CardContent className="p-4">
                  {loadingEntries ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <AdminSummaryView
                      weekStart={weekStart}
                      projects={projects}
                      teamMembers={teamMembers}
                      entries={entries}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Timesheets;
