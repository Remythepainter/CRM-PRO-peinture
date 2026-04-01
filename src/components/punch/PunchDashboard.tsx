import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateWeeklyTimesheetPdf } from "@/components/reports/WeeklyTimesheetPdf";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePunchRecords, PunchRecord } from "@/hooks/usePunchRecords";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, MapPin, LogIn, LogOut, Map, List, AlertTriangle, ShieldCheck, Users, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PunchMap from "./PunchMap";

type Period = "day" | "week" | "month" | "quarter" | "year";
type ViewMode = "table" | "map";

const periodLabels: Record<Period, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  quarter: "Ce trimestre",
  year: "Cette année",
};

const PunchDashboard = () => {
  const [period, setPeriod] = useState<Period>("week");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [pdfLoading, setPdfLoading] = useState(false);
  const { toast } = useToast();
  const { data: records = [], isLoading } = usePunchRecords({ period });

  const handleDownloadPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      await generateWeeklyTimesheetPdf(0);
      toast({ title: "PDF généré ✅", description: "Le rapport hebdomadaire a été téléchargé." });
    } catch (err: any) {
      toast({ title: "Erreur PDF", description: err.message, variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  }, [toast]);

  // Fetch profiles (email → name mapping from auth metadata via user_roles + team_members)
  const { data: profiles = {} } = useQuery({
    queryKey: ["punch_profiles"],
    queryFn: async () => {
      // Get user_roles to know all users
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Get team_members for name mapping
      const { data: members } = await supabase
        .from("team_members")
        .select("id, name, email");

      const map: Record<string, string> = {};
      // Try to match user_id to team member by checking punch records
      if (members) {
        // We'll build a simple email → name map from team_members
        members.forEach((m) => {
          if (m.email) map[m.email] = m.name;
        });
      }
      return { roles: roles || [], members: members || [], nameByEmail: map };
    },
  });

  // Fetch projects for geofence display
  const { data: projectsWithCoords = [] } = useQuery({
    queryKey: ["projects_with_coords"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      return (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude!,
        longitude: p.longitude!,
      }));
    },
  });

  // Fetch project names for punch records
  const { data: projectNames = {} } = useQuery({
    queryKey: ["punch_project_names"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name");
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.id] = p.name; });
      return map;
    },
  });

  // Enrich records with names
  const enrichedRecords = records.map((r) => ({
    ...r,
    project_name: r.project_id ? projectNames[r.project_id] || undefined : undefined,
    employee_name: undefined as string | undefined, // Will use user_id display for now
  }));

  // Group by user
  const grouped = records.reduce<Record<string, PunchRecord[]>>((acc, r) => {
    const key = r.user_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  // Calculate hours per user
  const userSummaries = Object.entries(grouped).map(([userId, userRecords]) => {
    const sorted = [...userRecords].sort(
      (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
    );
    let totalMs = 0;
    let lastIn: Date | null = null;

    for (const r of sorted) {
      if (r.punch_type === "in") {
        lastIn = new Date(r.punched_at);
      } else if (r.punch_type === "out" && lastIn) {
        totalMs += new Date(r.punched_at).getTime() - lastIn.getTime();
        lastIn = null;
      }
    }

    const hours = totalMs / 3600000;
    const lastRecord = userRecords[0];
    const isActive = lastRecord?.punch_type === "in";
    const outOfZoneCount = userRecords.filter((r) => r.out_of_zone).length;

    return {
      userId,
      totalHours: hours,
      totalFormatted: `${Math.floor(hours)}h${Math.floor((hours % 1) * 60).toString().padStart(2, "0")}`,
      punchCount: userRecords.length,
      isActive,
      lastAddress: lastRecord?.address,
      outOfZoneCount,
      records: userRecords,
    };
  });

  const totalHoursAll = userSummaries.reduce((sum, s) => sum + s.totalHours, 0);
  const totalOutOfZone = records.filter((r) => r.out_of_zone).length;

  const exportCsv = () => {
    const headers = ["Employé", "Date", "Heure", "Type", "Projet", "Hors zone", "Adresse", "Latitude", "Longitude", "Notes"];
    const rows = records.map((r) => [
      r.user_id.substring(0, 8),
      format(new Date(r.punched_at), "yyyy-MM-dd"),
      format(new Date(r.punched_at), "HH:mm:ss"),
      r.punch_type === "in" ? "Arrivée" : "Départ",
      r.project_id ? (projectNames[r.project_id] || "") : "",
      r.out_of_zone ? "Oui" : "Non",
      `"${(r.address || "").replace(/"/g, '""')}"`,
      r.latitude?.toString() || "",
      r.longitude?.toString() || "",
      `"${(r.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pointages_equipe_${period}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Employés actifs</p>
            <p className="text-2xl font-bold text-green-500">
              {userSummaries.filter((s) => s.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total pointages</p>
            <p className="text-2xl font-bold">{records.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Heures totales</p>
            <p className="text-2xl font-bold text-primary">
              {Math.floor(totalHoursAll)}h{Math.floor((totalHoursAll % 1) * 60).toString().padStart(2, "0")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Employés</p>
            <p className="text-2xl font-bold">{userSummaries.length}</p>
          </CardContent>
        </Card>
        <Card className={totalOutOfZone > 0 ? "border-destructive/50" : ""}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Hors zone
            </p>
            <p className={`text-2xl font-bold ${totalOutOfZone > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {totalOutOfZone}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-employee summary */}
      {userSummaries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Résumé par employé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {userSummaries.map((summary) => (
                <div
                  key={summary.userId}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      summary.isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {summary.userId.substring(0, 8)}…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {summary.totalFormatted} • {summary.punchCount} pts
                      {summary.outOfZoneCount > 0 && (
                        <span className="text-destructive ml-1">
                          • {summary.outOfZoneCount} hors zone
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant={summary.isActive ? "default" : "secondary"} className="text-xs shrink-0">
                    {summary.isActive ? "En service" : "Hors service"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls & Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Tableau de pointage — Équipe</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(periodLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                >
                  <Map className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={records.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
                {pdfLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Chargement...</p>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun pointage pour cette période
            </p>
          ) : viewMode === "map" ? (
            <PunchMap records={enrichedRecords} projects={projectsWithCoords} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Heure</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Projet</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} className={record.out_of_zone ? "bg-destructive/5" : ""}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {record.user_id.substring(0, 8)}…
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(record.punched_at), "d MMM", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-mono whitespace-nowrap">
                        {format(new Date(record.punched_at), "HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={record.punch_type === "in" ? "default" : "destructive"}
                          className="gap-1"
                        >
                          {record.punch_type === "in" ? (
                            <LogIn className="h-3 w-3" />
                          ) : (
                            <LogOut className="h-3 w-3" />
                          )}
                          {record.punch_type === "in" ? "In" : "Out"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">
                        {record.project_id ? projectNames[record.project_id] || "—" : "—"}
                      </TableCell>
                      <TableCell>
                        {record.out_of_zone ? (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            Hors zone
                          </Badge>
                        ) : record.project_id ? (
                          <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200">
                            <ShieldCheck className="h-3 w-3" />
                            OK
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {record.address ? (
                          <a
                            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-1 text-xs text-primary hover:underline"
                          >
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{record.address}</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                        {record.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PunchDashboard;
