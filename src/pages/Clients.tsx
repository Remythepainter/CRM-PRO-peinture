import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserCheck, Plus, Loader2, Trash2, Search, Phone, Mail, MapPin, Star, DollarSign, Briefcase, Pencil, FileUp, Download, Filter, X, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanModify } from "@/hooks/useCanModify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import CsvImportDialog from "@/components/clients/CsvImportDialog";

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

const Clients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canModify } = useCanModify();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSatisfaction, setFilterSatisfaction] = useState("all");
  const [filterRevenue, setFilterRevenue] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "revenue" | "satisfaction">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", notes: "", satisfaction_rating: 5,
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => setForm({ name: "", email: "", phone: "", address: "", notes: "", satisfaction_rating: 5 });

  const saveClient = useMutation({
    mutationFn: async () => {
      if (editClient) {
        const { error } = await supabase.from("clients").update({
          name: form.name, email: form.email || null, phone: form.phone || null,
          address: form.address || null, notes: form.notes || null, satisfaction_rating: form.satisfaction_rating,
        }).eq("id", editClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert({
          name: form.name, email: form.email || null, phone: form.phone || null,
          address: form.address || null, notes: form.notes || null,
          satisfaction_rating: form.satisfaction_rating, created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDialogOpen(false);
      setEditClient(null);
      resetForm();
      toast({ title: editClient ? "Client mis à jour ✓" : "Client ajouté ✓" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeleteId(null);
      toast({ title: "Client supprimé" });
    },
  });

  const openEdit = (client: any) => {
    setEditClient(client);
    setForm({
      name: client.name, email: client.email || "", phone: client.phone || "",
      address: client.address || "", notes: client.notes || "", satisfaction_rating: client.satisfaction_rating || 5,
    });
    setDialogOpen(true);
  };

  const sources = [...new Set(clients.map((c: any) => c.source).filter(Boolean))];

  const filtered = clients.filter((c: any) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase());
    const matchSat = filterSatisfaction === "all" || (filterSatisfaction === "high" && (c.satisfaction_rating || 0) >= 4) || (filterSatisfaction === "mid" && (c.satisfaction_rating || 0) >= 2 && (c.satisfaction_rating || 0) <= 3) || (filterSatisfaction === "low" && (c.satisfaction_rating || 0) <= 1);
    const matchRev = filterRevenue === "all" || (filterRevenue === "10k+" && (c.total_revenue || 0) >= 10000) || (filterRevenue === "5k-10k" && (c.total_revenue || 0) >= 5000 && (c.total_revenue || 0) < 10000) || (filterRevenue === "1k-5k" && (c.total_revenue || 0) >= 1000 && (c.total_revenue || 0) < 5000) || (filterRevenue === "<1k" && (c.total_revenue || 0) < 1000);
    const matchSource = filterSource === "all" || c.source === filterSource;
    return matchSearch && matchSat && matchRev && matchSource;
  });

  const activeFilterCount = [filterSatisfaction, filterRevenue, filterSource].filter((f) => f !== "all").length;
  const clearFilters = () => { setFilterSatisfaction("all"); setFilterRevenue("all"); setFilterSource("all"); };

  const sorted = [...filtered].sort((a: any, b: any) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.name.localeCompare(b.name, "fr");
    else if (sortBy === "revenue") cmp = (a.total_revenue || 0) - (b.total_revenue || 0);
    else if (sortBy === "satisfaction") cmp = (a.satisfaction_rating || 0) - (b.satisfaction_rating || 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir(field === "name" ? "asc" : "desc"); }
  };
  const totalRevenue = clients.reduce((sum: number, c: any) => sum + (c.total_revenue || 0), 0);

  const exportCsv = () => {
    const headers = ["Nom", "Courriel", "Téléphone", "Adresse", "Notes", "Satisfaction", "Revenu total", "Nb projets"];
    const csvRows = [headers.join(",")];
    const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    filtered.forEach((c: any) => {
      csvRows.push([esc(c.name), esc(c.email), esc(c.phone), esc(c.address), esc(c.notes), c.satisfaction_rating || "", c.total_revenue || 0, c.project_count || 0].join(","));
    });
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filtered.length} client(s) exporté(s) ✓` });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" /> Clients
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{clients.length} client{clients.length !== 1 ? "s" : ""}{isAdmin === true ? ` · Revenu total : ${fmt(totalRevenue)}` : ""}</p>
          </div>
          {isAdmin === true && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportCsv} disabled={clients.length === 0} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-muted-foreground font-medium text-sm hover:bg-secondary transition-colors touch-target disabled:opacity-40">
                <Download className="h-4 w-4" /> Exporter
              </button>
              <button onClick={() => setCsvOpen(true)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-primary/30 text-primary font-medium text-sm hover:bg-primary/5 transition-colors touch-target">
                <FileUp className="h-4 w-4" /> Importer
              </button>
              <button onClick={() => { resetForm(); setEditClient(null); setDialogOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm touch-target">
                <Plus className="h-4 w-4" /> Nouveau
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client..." className="pl-9 bg-secondary border-border" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors shrink-0", showFilters || activeFilterCount > 0 ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:bg-secondary")}>
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={filterSatisfaction} onValueChange={setFilterSatisfaction}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary"><SelectValue placeholder="Satisfaction" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Satisfaction</SelectItem>
                <SelectItem value="high">⭐ 4-5</SelectItem>
                <SelectItem value="mid">⭐ 2-3</SelectItem>
                <SelectItem value="low">⭐ 0-1</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRevenue} onValueChange={setFilterRevenue}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary"><SelectValue placeholder="Revenu" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Revenu</SelectItem>
                <SelectItem value="10k+">10 000 $+</SelectItem>
                <SelectItem value="5k-10k">5 000 - 10 000 $</SelectItem>
                <SelectItem value="1k-5k">1 000 - 5 000 $</SelectItem>
                <SelectItem value="<1k">{"< 1 000 $"}</SelectItem>
              </SelectContent>
            </Select>
            {sources.length > 0 && (
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Source</SelectItem>
                  {sources.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="h-3 w-3" /> Effacer
              </button>
            )}
          </div>
        )}

        <div className="flex gap-1.5 items-center text-xs">
          <span className="text-muted-foreground mr-1">Trier :</span>
          {([["name", "Nom"], ["revenue", "Revenu"], ["satisfaction", "Satisfaction"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => toggleSort(key)} className={cn("px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1", sortBy === key ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:bg-secondary")}>
              {label} {sortBy === key && <ArrowUpDown className="h-3 w-3" />}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : sorted.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun client trouvé</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((client: any) => (
              <div key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{client.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={cn("h-3 w-3", star <= (client.satisfaction_rating || 0) ? "text-primary fill-primary" : "text-muted-foreground/30")} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isAdmin === true && <button onClick={(e) => { e.stopPropagation(); openEdit(client); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>}
                      {isAdmin === true && canModify(client.created_by) && (
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(client.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    {client.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {client.email}</p>}
                    {client.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {client.phone}</p>}
                    {client.address && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {client.address}</p>}
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-xs">
                    {isAdmin === true && <span className="flex items-center gap-1 text-primary"><DollarSign className="h-3 w-3" /> {fmt(client.total_revenue || 0)}</span>}
                    <span className="flex items-center gap-1 text-muted-foreground"><Briefcase className="h-3 w-3" /> {client.project_count || 0} projet{(client.project_count || 0) !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditClient(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editClient ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            <DialogDescription>{editClient ? "Mettez à jour les informations" : "Ajoutez un nouveau client à votre base"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom complet" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Courriel</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div>
              <Label>Satisfaction ({form.satisfaction_rating}/5)</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setForm({ ...form, satisfaction_rating: star })}>
                    <Star className={cn("h-5 w-5 transition-colors", star <= form.satisfaction_rating ? "text-primary fill-primary" : "text-muted-foreground/30 hover:text-primary/50")} />
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <Button variant="gold" className="w-full" onClick={() => saveClient.mutate()} disabled={!form.name || saveClient.isPending}>
              {saveClient.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {editClient ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce client?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteClient.mutate(deleteId)}>Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </AppLayout>
  );
};

export default Clients;
