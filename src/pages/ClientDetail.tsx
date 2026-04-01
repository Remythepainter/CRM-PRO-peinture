import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserCheck, Mail, Phone, MapPin, Star, DollarSign, Briefcase, FileText, Loader2, CalendarDays, TrendingUp, Plus, Pencil, Trash2, Download } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ClientRevenueChart from "@/components/clients/ClientRevenueChart";
import ClientEditDialog from "@/components/clients/ClientEditDialog";
import ClientInteractionHistory from "@/components/clients/ClientInteractionHistory";
import { generateClientPdf } from "@/components/reports/ClientDetailPdf";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

const statusLabels: Record<string, { label: string; color: string }> = {
  planning: { label: "Planifié", color: "bg-blue-500/10 text-blue-500" },
  in_progress: { label: "En cours", color: "bg-primary/10 text-primary" },
  on_hold: { label: "En pause", color: "bg-yellow-500/10 text-yellow-500" },
  completed: { label: "Terminé", color: "bg-green-500/10 text-green-500" },
  cancelled: { label: "Annulé", color: "bg-destructive/10 text-destructive" },
};

const quoteStatusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  sent: { label: "Envoyée", color: "bg-blue-500/10 text-blue-500" },
  accepted: { label: "Acceptée", color: "bg-green-500/10 text-green-500" },
  rejected: { label: "Refusée", color: "bg-destructive/10 text-destructive" },
};

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: companySettings } = useCompanySettings();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client supprimé" });
      navigate("/clients");
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["client-projects", client?.name],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("client_name", client!.name).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client?.name,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["client-quotes", client?.name, client?.email],
    queryFn: async () => {
      let query = supabase.from("quotes").select("*").order("created_at", { ascending: false });
      if (client!.email) {
        query = query.or(`client_name.eq.${client!.name},client_email.eq.${client!.email}`);
      } else {
        query = query.eq("client_name", client!.name);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!client?.name,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["client-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["client-interactions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_interactions").select("*").eq("client_id", id!).order("interaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleExportPdf = () => {
    generateClientPdf(client!, projects, quotes, interactions, companySettings?.company_name || "", companySettings?.logo_url);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="text-center py-24 text-muted-foreground">Client introuvable</div>
      </AppLayout>
    );
  }

  const totalQuoted = quotes.reduce((s: number, q: any) => s + (q.total || 0), 0);
  const acceptedQuotes = quotes.filter((q: any) => q.status === "accepted").length;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4">
          <button onClick={() => navigate("/clients")} className="mt-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={cn("h-3.5 w-3.5", star <= (client.satisfaction_rating || 0) ? "text-primary fill-primary" : "text-muted-foreground/30")} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Modifier
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/projects", { state: { prefillClient: client.name } })}
            >
              <Plus className="h-4 w-4 mr-1" /> Projet
            </Button>
            <Button size="sm" variant="ghost" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/quotes", { state: { prefillClient: { name: client.name, email: client.email, phone: client.phone, address: client.address } } })}
            >
              <Plus className="h-4 w-4 mr-1" /> Soumission
            </Button>
          </div>
        </div>

        {/* Contact & Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-foreground">{fmt(client.total_revenue || 0)}</p>
              <p className="text-xs text-muted-foreground">Revenu total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Briefcase className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-foreground">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Projet{projects.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-foreground">{quotes.length}</p>
              <p className="text-xs text-muted-foreground">Soumission{quotes.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold text-foreground">{acceptedQuotes}/{quotes.length}</p>
              <p className="text-xs text-muted-foreground">Acceptées</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact info */}
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            {client.email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 text-primary" /> {client.email}</p>}
            {client.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 text-primary" /> {client.phone}</p>}
            {client.address && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> {client.address}</p>}
            {client.notes && <p className="text-muted-foreground pt-2 border-t border-border">{client.notes}</p>}
            {!client.email && !client.phone && !client.address && <p className="text-muted-foreground">Aucune coordonnée enregistrée</p>}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <ClientRevenueChart quotes={quotes} projects={projects} />

        {/* Interaction History */}
        <ClientInteractionHistory clientId={id!} />

        {/* Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Projets ({projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 pb-4">Aucun projet</p>
            ) : (
              <div className="divide-y divide-border">
                {projects.map((p: any) => {
                  const st = statusLabels[p.status] || { label: p.status, color: "bg-muted text-muted-foreground" };
                  return (
                    <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {p.start_date && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(p.start_date).toLocaleDateString("fr-CA")}</span>}
                          <span>{fmt(p.budget)}</span>
                        </div>
                      </div>
                      <Badge className={cn("shrink-0 text-xs", st.color)}>{st.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Soumissions ({quotes.length})
              {totalQuoted > 0 && <span className="text-xs font-normal text-muted-foreground ml-auto">Total : {fmt(totalQuoted)}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 pb-4">Aucune soumission</p>
            ) : (
              <div className="divide-y divide-border">
                {quotes.map((q: any) => {
                  const st = quoteStatusLabels[q.status] || { label: q.status, color: "bg-muted text-muted-foreground" };
                  return (
                    <div key={q.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{q.project_description || "Soumission"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(q.created_at).toLocaleDateString("fr-CA")}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium text-foreground">{fmt(q.total)}</span>
                        <Badge className={cn("text-xs", st.color)}>{st.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        {documents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Documents ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {documents.map((d: any) => (
                  <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("fr-CA")}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{d.category}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <ClientEditDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les interactions liées seront également supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default ClientDetail;
