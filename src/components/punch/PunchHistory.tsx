import { usePunchRecords, PunchRecord } from "@/hooks/usePunchRecords";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, MapPin, LogIn, LogOut } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

type Period = "day" | "week" | "month" | "quarter" | "year";

const periodLabels: Record<Period, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  quarter: "Ce trimestre",
  year: "Cette année",
};

interface PunchHistoryProps {
  userId?: string;
  showUserColumn?: boolean;
}

const PunchHistory = ({ userId, showUserColumn }: PunchHistoryProps) => {
  const [period, setPeriod] = useState<Period>("week");
  const { data: records = [], isLoading } = usePunchRecords({
    period,
    userId,
  });

  const exportCsv = () => {
    const headers = ["Date", "Heure", "Type", "Adresse", "Latitude", "Longitude", "Notes"];
    const rows = records.map((r) => [
      format(new Date(r.punched_at), "yyyy-MM-dd"),
      format(new Date(r.punched_at), "HH:mm:ss"),
      r.punch_type === "in" ? "Arrivée" : "Départ",
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
    a.download = `pointages_${period}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate total hours from pairs
  const calculateTotalHours = () => {
    const sorted = [...records].sort(
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

    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    return `${hours}h${minutes.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">Historique des pointages</CardTitle>
          <div className="flex items-center gap-2">
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
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={records.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex gap-4 mb-4">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {records.length} pointages
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Total : {calculateTotalHours()}
          </Badge>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Chargement...</p>
        ) : records.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun pointage pour cette période
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(record.punched_at), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-mono whitespace-nowrap">
                      {format(new Date(record.punched_at), "HH:mm:ss")}
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
                        {record.punch_type === "in" ? "Arrivée" : "Départ"}
                      </Badge>
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
                          <span className="line-clamp-2">{record.address}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
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
  );
};

export default PunchHistory;
