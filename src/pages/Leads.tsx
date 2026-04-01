import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useCanModify } from "@/hooks/useCanModify";
import { useUserRole } from "@/hooks/useUserRole";
import { useLeads } from "@/hooks/useSupabaseData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Phone, Mail, MapPin, Filter, Loader2, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import LeadFormDialog from "@/components/leads/LeadFormDialog";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

const statusLabels: Record<string, string> = {
  new: "Nouveau", contacted: "Contacté", qualified: "Qualifié",
  proposal: "Soumission", negotiation: "Négociation", won: "Gagné", lost: "Perdu",
};

const statusColors: Record<string, string> = {
  new: "bg-muted-foreground/20 text-muted-foreground",
  contacted: "bg-blue-500/20 text-blue-400",
  qualified: "bg-primary/20 text-primary",
  proposal: "bg-warning/20 text-warning",
  negotiation: "bg-orange-500/20 text-orange-400",
  won: "bg-success/20 text-success",
  lost: "bg-destructive/20 text-destructive",
};

const urgencyLabels: Record<string, string> = { low: "Faible", medium: "Moyen", high: "Élevé", urgent: "Urgent" };
const projectLabels: Record<string, string> = { interior: "Intérieur", exterior: "Extérieur", commercial: "Commercial" };

const Leads = () => {
  const [search, setSearch] = useState("");
  const { data: leads, isLoading } = useLeads();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canModify } = useCanModify();
  const { isAdmin } = useUserRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = (leads ?? []).filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.address ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-destructive font-bold";
    if (score >= 70) return "text-primary font-bold";
    if (score >= 50) return "text-warning font-semibold";
    return "text-muted-foreground";
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Lead>) => {
      if (editingLead) {
        const { error } = await supabase.from("leads").update(data).eq("id", editingLead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leads").insert([{ ...data, created_by: user?.id } as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: editingLead ? "Prospect modifié!" : "Prospect créé!" });
      setFormOpen(false);
      setEditingLead(null);
    },
    onError: (err) => {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Prospect supprimé" });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    },
  });

  const handleCreate = () => { setEditingLead(null); setFormOpen(true); };
  const handleEdit = (lead: Lead) => { setEditingLead(lead); setFormOpen(true); };
  const handleSave = async (data: Partial<Lead>) => { await saveMutation.mutateAsync(data); };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prospects</h1>
            <p className="text-sm text-muted-foreground mt-1">{filtered.length} prospects au total</p>
          </div>
          {isAdmin === true && (
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm touch-target">
              <Plus className="w-4 h-4" /> Nouveau prospect
            </button>
          )}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou adresse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground p-4">Prospect</th>
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground p-4">Score</th>
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground p-4">Type</th>
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground p-4">Budget</th>
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground p-4">Urgence</th>
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground p-4">Statut</th>
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground p-4">Source</th>
                      <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                              {lead.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{lead.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{(lead.address ?? "").split(",")[0]}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("text-lg tabular-nums", getScoreColor(lead.score))}>{lead.score}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs border-border">{projectLabels[lead.project_type] ?? lead.project_type}</Badge>
                        </td>
                        <td className="p-4 text-sm font-medium text-foreground">{isAdmin === true ? `${Number(lead.budget).toLocaleString()} $` : "—"}</td>
                        <td className="p-4">
                          <span className={cn(
                            "text-xs font-medium",
                            lead.urgency === "urgent" && "text-destructive",
                            lead.urgency === "high" && "text-warning",
                            lead.urgency === "medium" && "text-foreground",
                            lead.urgency === "low" && "text-muted-foreground",
                          )}>
                            {urgencyLabels[lead.urgency] ?? lead.urgency}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusColors[lead.status] ?? "")}>
                            {statusLabels[lead.status] ?? lead.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground capitalize">{lead.source.replace("-", " ")}</td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isAdmin === true && canModify(lead.created_by) && (
                                <DropdownMenuItem onClick={() => handleEdit(lead)}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Modifier
                                </DropdownMenuItem>
                              )}
                              {lead.phone && (
                                <DropdownMenuItem onClick={() => window.open(`tel:${lead.phone}`)}>
                                  <Phone className="h-3.5 w-3.5 mr-2" /> Appeler
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => window.open(`mailto:${lead.email}`)}>
                                <Mail className="h-3.5 w-3.5 mr-2" /> Courriel
                              </DropdownMenuItem>
                              {isAdmin === true && canModify(lead.created_by) && (
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(lead.id)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                          Aucun prospect trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <LeadFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingLead(null); }}
        lead={editingLead}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le prospect et toutes ses données associées seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Leads;
