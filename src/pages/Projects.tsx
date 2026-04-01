import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCanModify } from "@/hooks/useCanModify";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Briefcase, Plus, Loader2, Pencil, Trash2, DollarSign, Calendar, MapPin, TrendingUp, ImageIcon, Users, Clock, MessageSquare, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import ProjectPhotoGallery from "@/components/projects/ProjectPhotoGallery";
import ProjectTimeTracker from "@/components/projects/ProjectTimeTracker";
import ProjectNotes from "@/components/projects/ProjectNotes";
import { useLeads } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { projectSchema } from "@/lib/validations";

interface Project {
  id: string;
  name: string;
  client_name: string;
  description: string | null;
  status: string;
  budget: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  lead_id: string | null;
  deal_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  planning: { label: "Planification", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "En cours", color: "bg-primary/20 text-primary" },
  on_hold: { label: "En pause", color: "bg-warning/20 text-warning" },
  completed: { label: "Terminé", color: "bg-success/20 text-success" },
  cancelled: { label: "Annulé", color: "bg-destructive/20 text-destructive" },
};

const Projects = () => {
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canModify } = useCanModify();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form state
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planning");
  const [budget, setBudget] = useState("");
  const [spent, setSpent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [galleryProject, setGalleryProject] = useState<Project | null>(null);
  const [timeProject, setTimeProject] = useState<Project | null>(null);
  const [notesProject, setNotesProject] = useState<Project | null>(null);

  const { data: leads = [] } = useLeads();

  // Pre-fill from client detail page
  useEffect(() => {
    const state = location.state as { prefillClient?: string } | null;
    if (state?.prefillClient) {
      setClientName(state.prefillClient);
      setFormOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validation = projectSchema.safeParse({
        name, client_name: clientName, description, status,
        budget: parseFloat(budget) || 0, spent: parseFloat(spent) || 0,
        start_date: startDate, end_date: endDate, address,
      });
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of validation.error.issues) {
          const key = issue.path[0] as string;
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setFormErrors(fieldErrors);
        throw new Error("Veuillez corriger les erreurs du formulaire");
      }
      setFormErrors({});
      const payload = {
        name,
        client_name: clientName,
        description: description || null,
        status,
        budget: parseFloat(budget) || 0,
        spent: parseFloat(spent) || 0,
        start_date: startDate || null,
        end_date: endDate || null,
        address: address || null,
        latitude,
        longitude,
        lead_id: leadId || null,
      };
      if (editing) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert([{ ...payload, created_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: editing ? "Projet modifié" : "Projet créé" });
      closeForm();
    },
    onError: (err) => {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projet supprimé" });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    },
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setName(""); setClientName(""); setDescription(""); setStatus("planning");
    setBudget(""); setSpent(""); setStartDate(""); setEndDate(""); setAddress("");
    setLeadId(null); setLatitude(null); setLongitude(null);
    setFormErrors({});
  };

  const geocodeAddress = async () => {
    if (!address.trim()) {
      toast({ title: "Adresse requise", description: "Entrez une adresse avant de géolocaliser.", variant: "destructive" });
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { "Accept-Language": "fr" } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        setLatitude(lat);
        setLongitude(lng);
        toast({ title: "Position trouvée ✅", description: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      } else {
        toast({ title: "Adresse introuvable", description: "Essayez une adresse plus précise.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur de géocodage", variant: "destructive" });
    } finally {
      setGeocoding(false);
    }
  };

  const handleLeadSelect = (selectedLeadId: string) => {
    if (selectedLeadId === "none") {
      setLeadId(null);
      return;
    }
    const lead = leads.find((l) => l.id === selectedLeadId);
    if (lead) {
      setLeadId(lead.id);
      setClientName(lead.name);
      if (lead.address) setAddress(lead.address);
      if (lead.budget) setBudget(String(lead.budget));
      if (!name) setName(`${lead.project_type === "interior" ? "Intérieur" : lead.project_type === "exterior" ? "Extérieur" : lead.project_type} — ${lead.name}`);
    }
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setName(p.name);
    setClientName(p.client_name);
    setDescription(p.description || "");
    setStatus(p.status);
    setBudget(String(p.budget));
    setSpent(String(p.spent));
    setStartDate(p.start_date || "");
    setEndDate(p.end_date || "");
    setAddress(p.address || "");
    setLatitude(p.latitude || null);
    setLongitude(p.longitude || null);
    setLeadId(p.lead_id || null);
    setFormOpen(true);
  };

  const filtered = filterStatus === "all" ? projects : projects.filter((p) => p.status === filterStatus);

  // KPIs
  const activeProjects = projects.filter((p) => p.status === "in_progress").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);

  const getProgress = (p: Project) => {
    if (!p.start_date || !p.end_date) return null;
    const total = differenceInDays(parseISO(p.end_date), parseISO(p.start_date));
    if (total <= 0) return 100;
    const elapsed = differenceInDays(new Date(), parseISO(p.start_date));
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  const getBudgetPercent = (p: Project) => {
    if (p.budget <= 0) return 0;
    return Math.min(100, Math.round((p.spent / p.budget) * 100));
  };

  const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" /> Projets
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Suivi des projets actifs</p>
          </div>
          <button onClick={() => { closeForm(); setFormOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm touch-target">
            <Plus className="h-4 w-4" /> Nouveau projet
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Total projets</p>
            <p className="text-2xl font-bold mt-1">{projects.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">En cours</p>
            <p className="text-2xl font-bold text-primary mt-1">{activeProjects}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Budget total</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalBudget)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Dépensé</p>
            <p className={cn("text-2xl font-bold mt-1", totalSpent > totalBudget ? "text-destructive" : "")}>{fmt(totalSpent)}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {[{ key: "all", label: "Tous" }, ...Object.entries(statusConfig).map(([k, v]) => ({ key: k, label: v.label }))].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target",
                filterStatus === f.key ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Project Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Aucun projet trouvé</p>
              <Button variant="gold" size="sm" className="mt-4" onClick={() => { closeForm(); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Créer un projet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const timeProgress = getProgress(p);
              const budgetPct = getBudgetPercent(p);
              const sc = statusConfig[p.status] || statusConfig.planning;
              return (
                <Card key={p.id} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-5 space-y-4">
                    {/* Top */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{p.client_name}</p>
                      </div>
                      <Badge className={cn("shrink-0 text-xs", sc.color)}>{sc.label}</Badge>
                    </div>

                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                    )}

                    {/* Budget */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-3 w-3" /> Budget
                        </span>
                        <span className={cn("font-medium", budgetPct > 90 ? "text-destructive" : "text-foreground")}>
                          {fmt(p.spent)} / {fmt(p.budget)}
                        </span>
                      </div>
                      <Progress value={budgetPct} className="h-2" />
                    </div>

                    {/* Timeline */}
                    {p.start_date && p.end_date && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" /> Échéancier
                          </span>
                          <span className="font-medium text-foreground">
                            {format(parseISO(p.start_date), "d MMM", { locale: fr })} → {format(parseISO(p.end_date), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        {timeProgress !== null && <Progress value={timeProgress} className="h-2" />}
                      </div>
                    )}

                    {/* Address */}
                    {p.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" /> {p.address}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button variant="ghost" size="sm" onClick={() => setNotesProject(p)}>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> Notes
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setTimeProject(p)}>
                        <Clock className="h-3.5 w-3.5 mr-1" /> Heures
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setGalleryProject(p)}>
                        <ImageIcon className="h-3.5 w-3.5 mr-1" /> Photos
                      </Button>
                      {/* Permettre au comptable et à l'admin/gestionnaire d'éditer */}
                      
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                        </Button>
                      {canModify(p.created_by) && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
            <DialogDescription>{editing ? "Modifiez les détails du projet" : "Créez un nouveau projet de peinture"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 mt-2">
            {/* Lead selector */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Lier à un prospect</Label>
              <Select value={leadId || "none"} onValueChange={handleLeadSelect}>
                <SelectTrigger><SelectValue placeholder="Aucun prospect" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun prospect —</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} — {l.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nom du projet *</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Peinture cuisine - Dupont" className={formErrors.name ? "border-destructive" : ""} />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-client">Client *</Label>
              <Input id="p-client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Jean Dupont" className={formErrors.client_name ? "border-destructive" : ""} />
              {formErrors.client_name && <p className="text-xs text-destructive">{formErrors.client_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails du projet..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-address">Adresse du chantier</Label>
                <div className="flex gap-2">
                  <Input id="p-address" value={address} onChange={(e) => { setAddress(e.target.value); setLatitude(null); setLongitude(null); }} placeholder="123 rue Principale, Ville" className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={geocodeAddress} disabled={geocoding} className="shrink-0">
                    {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                  </Button>
                </div>
                {latitude != null && longitude != null && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <Navigation className="h-3 w-3" /> GPS : {latitude.toFixed(5)}, {longitude.toFixed(5)} — Géofencing actif (500m)
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-budget">Budget initial ($)</Label>
                <Input id="p-budget" type="number" min="0" step="100" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="5000" className={formErrors.budget ? "border-destructive" : ""} />
                {formErrors.budget && <p className="text-xs text-destructive">{formErrors.budget}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-spent">Main d'œuvre sous-traitance / Matériel ($)</Label>
                <Input id="p-spent" type="number" min="0" step="100" value={spent} onChange={(e) => setSpent(e.target.value)} placeholder="0" className={formErrors.spent ? "border-destructive" : ""} />
                {formErrors.spent && <p className="text-xs text-destructive">{formErrors.spent}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-start">Date début</Label>
                <Input id="p-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-end">Date fin</Label>
                <Input id="p-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>Annuler</Button>
              <Button type="submit" variant="gold" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editing ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce projet?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Gallery Dialog */}
      <Dialog open={!!galleryProject} onOpenChange={(o) => { if (!o) setGalleryProject(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" /> Photos — {galleryProject?.name}
            </DialogTitle>
            <DialogDescription>{galleryProject?.client_name}</DialogDescription>
          </DialogHeader>
          {galleryProject && (
            <ProjectPhotoGallery projectId={galleryProject.id} projectName={galleryProject.name} />
          )}
        </DialogContent>
      </Dialog>

      {/* Time Tracking Dialog */}
      <Dialog open={!!timeProject} onOpenChange={(o) => { if (!o) setTimeProject(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Heures — {timeProject?.name}
            </DialogTitle>
            <DialogDescription>{timeProject?.client_name}</DialogDescription>
          </DialogHeader>
          {timeProject && (
            <ProjectTimeTracker projectId={timeProject.id} projectName={timeProject.name} />
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesProject} onOpenChange={(o) => { if (!o) setNotesProject(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Notes — {notesProject?.name}
            </DialogTitle>
            <DialogDescription>{notesProject?.client_name}</DialogDescription>
          </DialogHeader>
          {notesProject && (
            <ProjectNotes projectId={notesProject.id} projectName={notesProject.name} />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Projects;
