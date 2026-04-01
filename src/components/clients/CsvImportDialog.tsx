import { useState, useCallback } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DB_FIELDS = [
  { key: "name", label: "Nom", required: true },
  { key: "email", label: "Courriel", required: false },
  { key: "phone", label: "Téléphone", required: false },
  { key: "address", label: "Adresse", required: false },
  { key: "notes", label: "Notes", required: false },
  { key: "skip", label: "— Ignorer —", required: false },
] as const;

type DbField = (typeof DB_FIELDS)[number]["key"];

const QB_COLUMN_MAP: Record<string, DbField> = {
  "customer": "name", "nom": "name", "name": "name", "client": "name",
  "display name": "name", "company": "name", "full name": "name",
  "company name": "name", "nom du client": "name", "nom complet": "name",
  "email": "email", "courriel": "email", "e-mail": "email",
  "primary email": "email", "email address": "email",
  "phone": "phone", "téléphone": "phone", "telephone": "phone",
  "mobile": "phone", "primary phone": "phone", "phone number": "phone",
  "address": "address", "adresse": "address", "billing address": "address",
  "shipping address": "address", "street": "address",
  "billing street": "address", "billing city": "address",
  "notes": "notes", "memo": "notes", "note": "notes",
};

function autoMapColumn(header: string): DbField {
  const h = header.toLowerCase().trim();
  return QB_COLUMN_MAP[h] || "skip";
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function CsvImportDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, DbField>>({});
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState({ success: 0, skipped: 0, duplicated: 0, errors: 0 });

  const reset = () => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setDuplicates(new Set());
    setImportResult({ success: 0, skipped: 0, duplicated: 0, errors: 0 });
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (result) => {
        const data = result.data as string[][];
        if (data.length < 2) {
          toast({ title: "Le fichier doit contenir au moins un en-tête et une ligne de données", variant: "destructive" });
          return;
        }
        const h = data[0];
        const r = data.slice(1);
        setHeaders(h);
        setRows(r);
        const autoMap: Record<number, DbField> = {};
        h.forEach((col, i) => { autoMap[i] = autoMapColumn(col); });
        setMapping(autoMap);
        setStep("mapping");
      },
      error: () => toast({ title: "Erreur lors de la lecture du fichier", variant: "destructive" }),
    });
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const nameColMapped = Object.values(mapping).includes("name");

  const mappedRows = rows.map((row) => {
    const obj: Record<string, string> = {};
    Object.entries(mapping).forEach(([idx, field]) => {
      if (field !== "skip") {
        const val = row[Number(idx)]?.trim() || "";
        if (val) obj[field] = obj[field] ? `${obj[field]}, ${val}` : val;
      }
    });
    return obj;
  }).filter((r) => r.name);

  const checkDuplicates = async () => {
    const { data: existingClients } = await supabase.from("clients").select("name, email, phone");
    if (!existingClients) { setStep("preview"); return; }

    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
    const existingNames = new Set(existingClients.map((c) => normalize(c.name)));
    const existingEmails = new Set(existingClients.filter((c) => c.email).map((c) => normalize(c.email!)));
    const existingPhones = new Set(existingClients.filter((c) => c.phone).map((c) => c.phone!.replace(/\D/g, "")));

    const dupes = new Set<number>();
    mappedRows.forEach((r, i) => {
      if (existingNames.has(normalize(r.name))) { dupes.add(i); return; }
      if (r.email && existingEmails.has(normalize(r.email))) { dupes.add(i); return; }
      if (r.phone && existingPhones.has(r.phone.replace(/\D/g, "")) && r.phone.replace(/\D/g, "").length >= 7) { dupes.add(i); }
    });
    setDuplicates(dupes);
    setStep("preview");
  };

  const newRows = mappedRows.filter((_, i) => !duplicates.has(i));

  const handleImport = async () => {
    setStep("importing");
    let success = 0, errors = 0;
    const batchSize = 50;

    for (let i = 0; i < newRows.length; i += batchSize) {
      const batch = newRows.slice(i, i + batchSize).map((r) => ({
        name: r.name.slice(0, 100),
        email: r.email?.slice(0, 255) || null,
        phone: r.phone?.slice(0, 30) || null,
        address: r.address?.slice(0, 500) || null,
        notes: r.notes?.slice(0, 5000) || null,
        created_by: user?.id,
      }));

      const { data, error } = await supabase.from("clients").insert(batch).select("id");
      if (error) {
        errors += batch.length;
      } else {
        success += data.length;
      }
    }

    const skipped = rows.length - mappedRows.length;
    setImportResult({ success, skipped, duplicated: duplicates.size, errors });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    setStep("done");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importer des clients (CSV)
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Déposez un fichier CSV exporté de QuickBooks"}
            {step === "mapping" && "Associez les colonnes du fichier aux champs clients"}
            {step === "preview" && `Prévisualisation — ${mappedRows.length} client(s) valide(s)`}
            {step === "importing" && "Import en cours..."}
            {step === "done" && "Import terminé"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-primary/30 rounded-xl p-12 text-center hover:border-primary/60 transition-colors cursor-pointer"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv,.txt";
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleFile(f);
              };
              input.click();
            }}
          >
            <Upload className="h-10 w-10 mx-auto text-primary/50 mb-3" />
            <p className="font-medium text-foreground">Glissez un fichier CSV ici</p>
            <p className="text-sm text-muted-foreground mt-1">ou cliquez pour parcourir</p>
            <p className="text-xs text-muted-foreground mt-3">Formats : .csv, .txt (UTF-8)</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                const tpl = "Nom,Courriel,Téléphone,Adresse,Notes\nJean Tremblay,jean@example.com,514-555-1234,\"123 Rue Principale, Montréal\",Client fidèle\nMarie Dupont,marie@dupont.ca,418-555-5678,456 Boul. Laurier Québec,";
                const blob = new Blob(["\uFEFF" + tpl], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "modele_import_clients.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-3 w-3" /> Télécharger le modèle CSV
            </button>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm w-40 truncate font-mono text-muted-foreground" title={h}>{h}</span>
                    <span className="text-muted-foreground">→</span>
                    <Select value={mapping[i] || "skip"} onValueChange={(v) => setMapping({ ...mapping, [i]: v as DbField })}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DB_FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label} {f.required && "*"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping[i] && mapping[i] !== "skip" && (
                      <Badge variant="outline" className="text-xs">{rows[0]?.[i]?.slice(0, 30)}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            {!nameColMapped && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Vous devez associer au moins une colonne au champ « Nom »
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("upload")}>Retour</Button>
              <Button variant="gold" disabled={!nameColMapped} onClick={checkDuplicates}>
                Prévisualiser ({mappedRows.length})
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {duplicates.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {duplicates.size} doublon(s) détecté(s) — ils ne seront pas importés
              </div>
            )}
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Courriel</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 100).map((r, i) => {
                    const isDupe = duplicates.has(i);
                    return (
                      <TableRow key={i} className={cn(isDupe && "opacity-50 bg-destructive/5")}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className={cn("font-medium", isDupe && "line-through")}>{r.name}</TableCell>
                        <TableCell className="text-sm">{r.email || "—"}</TableCell>
                        <TableCell className="text-sm">{r.phone || "—"}</TableCell>
                        <TableCell>
                          {isDupe ? (
                            <Badge variant="destructive" className="text-xs">Doublon</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-primary border-primary/30">Nouveau</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {mappedRows.length > 100 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  … et {mappedRows.length - 100} autres clients
                </p>
              )}
            </ScrollArea>
            {rows.length - mappedRows.length > 0 && (
              <p className="text-sm text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                {rows.length - mappedRows.length} ligne(s) ignorée(s) (nom manquant)
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("mapping")}>Retour</Button>
              <Button variant="gold" onClick={handleImport} disabled={newRows.length === 0}>
                Importer {newRows.length} client(s)
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Import en cours…</p>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">{importResult.success} client(s) importé(s)</p>
              {importResult.duplicated > 0 && (
                <p className="text-sm text-muted-foreground">{importResult.duplicated} doublon(s) ignoré(s)</p>
              )}
              {importResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground">{importResult.skipped} ligne(s) ignorée(s)</p>
              )}
              {importResult.errors > 0 && (
                <p className="text-sm text-destructive">{importResult.errors} erreur(s)</p>
              )}
            </div>
            <Button variant="gold" onClick={() => handleClose(false)}>Fermer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
