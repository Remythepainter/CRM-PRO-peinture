import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, Plus, Loader2, Trash2, DollarSign, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface TimeEntry {
  id: string;
  project_id: string;
  team_member_id: string | null;
  date: string;
  hours: number;
  hourly_rate: number;
  total_cost: number;
  description: string | null;
  created_at: string;
  team_members?: { name: string; role: string; das_percent: number } | null;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
}

interface ProjectTimeTrackerProps {
  projectId: string;
  projectName: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(n);

const ProjectTimeTracker = ({ projectId, projectName }: ProjectTimeTrackerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [memberId, setMemberId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [description, setDescription] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["time_entries", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, team_members(name, role, das_percent)")
        .eq("project_id", projectId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as TimeEntry[];
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, role, hourly_rate")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("time_entries").insert([{
        project_id: projectId,
        team_member_id: memberId || null,
        date,
        hours: parseFloat(hours) || 0,
        hourly_rate: parseFloat(rate) || 0,
        description: description || null,
        created_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries", projectId] });
      toast({ title: "Heures ajoutées" });
      resetForm();
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries", projectId] });
      toast({ title: "Entrée supprimée" });
      setDeleteId(null);
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const resetForm = () => {
    setShowForm(false);
    setMemberId("");
    setDate(new Date().toISOString().slice(0, 10));
    setHours("");
    setRate("");
    setDescription("");
  };

  const handleMemberSelect = (id: string) => {
    setMemberId(id);
    const member = teamMembers.find((m) => m.id === id);
    if (member) setRate(String(member.hourly_rate));
  };

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const totalCost = entries.reduce((s, e) => s + e.total_cost, 0);

  // True cost with DAS (employer deductions)
  const totalTrueCost = entries.reduce((s, e) => {
    const dasPercent = e.team_members?.das_percent || 0;
    return s + e.total_cost * (1 + dasPercent / 100);
  }, 0);

  // Group by member
  const byMember = entries.reduce((acc, e) => {
    const name = e.team_members?.name || "Non assigné";
    if (!acc[name]) acc[name] = { hours: 0, cost: 0, trueCost: 0 };
    const dasPercent = e.team_members?.das_percent || 0;
    acc[name].hours += e.hours;
    acc[name].cost += e.total_cost;
    acc[name].trueCost += e.total_cost * (1 + dasPercent / 100);
    return acc;
  }, {} as Record<string, { hours: number; cost: number; trueCost: number }>);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={cn("grid gap-3", isAdmin ? "grid-cols-3" : "grid-cols-2")}>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Heures totales</p>
              <p className="text-lg font-bold text-foreground">{totalHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Coût salaire</p>
              <p className="text-lg font-bold text-foreground">{fmt(totalCost)}</p>
            </div>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Coût réel (DAS)</p>
                <p className="text-lg font-bold text-primary">{fmt(totalTrueCost)}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* By member summary */}
      {Object.keys(byMember).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Par membre</p>
          <div className="space-y-1">
            {Object.entries(byMember).map(([name, data]) => (
              <div key={name} className="flex items-center justify-between text-sm bg-secondary/30 rounded-lg px-3 py-1.5">
                <span className="text-foreground font-medium">{name}</span>
                <span className="text-muted-foreground">
                  {data.hours.toFixed(1)}h · {fmt(data.cost)}
                  {isAdmin && <span className="text-primary ml-1">(réel: {fmt(data.trueCost)})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add button */}
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> Ajouter des heures
      </Button>

      {/* Add form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Membre de l'équipe</Label>
              <Select value={memberId} onValueChange={handleMemberSelect}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({fmt(m.hourly_rate)}/h)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Heures</Label>
                <Input type="number" min="0.25" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="8" />
              </div>
              <div className="space-y-1.5">
                <Label>Taux ($/h)</Label>
                <Input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="24.85" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Préparation, application 1re couche..." />
            </div>
            {hours && rate && (
              <p className="text-sm text-primary font-medium">
                Coût : {fmt((parseFloat(hours) || 0) * (parseFloat(rate) || 0))}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Annuler</Button>
              <Button variant="gold" size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !hours || !rate}>
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries list */}
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : entries.length > 0 ? (
        <div className="space-y-1.5">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm hover:border-primary/20 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{e.team_members?.name || "—"}</span>
                  <span className="text-muted-foreground text-xs">{format(parseISO(e.date), "d MMM yyyy", { locale: fr })}</span>
                </div>
                {e.description && <p className="text-xs text-muted-foreground truncate">{e.description}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">{e.hours}h × {fmt(e.hourly_rate)}</span>
                <span className="font-semibold text-foreground">{fmt(e.total_cost)}</span>
                <button onClick={() => setDeleteId(e.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">Aucune heure enregistrée</p>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectTimeTracker;
