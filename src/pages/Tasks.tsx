import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckSquare, Plus, Loader2, Trash2, Calendar, Flag, Check, Clock, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  todo: "À faire", in_progress: "En cours", done: "Terminée", cancelled: "Annulée",
};
const statusColors: Record<string, string> = {
  todo: "bg-muted-foreground/20 text-muted-foreground",
  in_progress: "bg-blue-500/20 text-blue-400",
  done: "bg-green-500/20 text-green-400",
  cancelled: "bg-destructive/20 text-destructive",
};
const priorityLabels: Record<string, string> = {
  low: "Basse", medium: "Moyenne", high: "Haute", urgent: "Urgente",
};
const priorityColors: Record<string, string> = {
  low: "text-muted-foreground", medium: "text-primary", high: "text-orange-400", urgent: "text-destructive",
};

const Tasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "", project_id: "" });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_list"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name");
      return data || [];
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team_members_list"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("team_members_public").select("id, name");
      return data || [];
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        due_date: form.due_date || null,
        project_id: form.project_id || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDialogOpen(false);
      setForm({ title: "", description: "", priority: "medium", due_date: "", project_id: "" });
      toast({ title: "Tâche créée ✓" });
    },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "done") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDeleteId(null);
      toast({ title: "Tâche supprimée" });
    },
  });

  const filtered = filter === "all" ? tasks : tasks.filter((t: any) => t.status === filter);

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t: any) => t.status === "todo").length,
    in_progress: tasks.filter((t: any) => t.status === "in_progress").length,
    done: tasks.filter((t: any) => t.status === "done").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-primary" /> Tâches
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{counts.todo} à faire · {counts.in_progress} en cours · {counts.done} terminées</p>
          </div>
          <Button variant="gold" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nouvelle tâche
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[{ key: "all", label: "Toutes" }, { key: "todo", label: "À faire" }, { key: "in_progress", label: "En cours" }, { key: "done", label: "Terminées" }].map((f) => (
            <Button key={f.key} variant={filter === f.key ? "default" : "outline"} size="sm" onClick={() => setFilter(f.key)}>
              {f.label} ({counts[f.key as keyof typeof counts] || 0})
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune tâche trouvée</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((task: any) => (
              <Card key={task.id} className={cn("transition-all", task.status === "done" && "opacity-60")}>
                <CardContent className="p-4 flex items-center gap-3">
                  <button
                    onClick={() => updateStatus.mutate({ id: task.id, status: task.status === "done" ? "todo" : "done" })}
                    className={cn("h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      task.status === "done" ? "bg-green-500 border-green-500" : "border-muted-foreground hover:border-primary"
                    )}
                  >
                    {task.status === "done" && <Check className="h-3 w-3 text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-foreground", task.status === "done" && "line-through")}>{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={cn("text-[10px]", statusColors[task.status])}>{statusLabels[task.status]}</Badge>
                      <span className={cn("text-xs flex items-center gap-0.5", priorityColors[task.priority])}>
                        <Flag className="h-2.5 w-2.5" /> {priorityLabels[task.priority]}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" /> {format(new Date(task.due_date), "d MMM", { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>

                  <Select value={task.status} onValueChange={(v) => updateStatus.mutate({ id: task.id, status: v })}>
                    <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <button onClick={() => setDeleteId(task.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
            <DialogDescription>Créez une tâche et assignez-la à un projet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Préparer les murs du salon" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détails..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Échéance</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Projet</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Aucun projet" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="gold" className="w-full" onClick={() => createTask.mutate()} disabled={!form.title || createTask.isPending}>
              {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cette tâche?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteTask.mutate(deleteId)}>Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Tasks;
