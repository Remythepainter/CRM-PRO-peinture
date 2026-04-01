import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Mail, StickyNote, Plus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  call: { label: "Appel", icon: Phone, color: "bg-blue-500/10 text-blue-500" },
  email: { label: "Courriel", icon: Mail, color: "bg-primary/10 text-primary" },
  note: { label: "Note", icon: StickyNote, color: "bg-yellow-500/10 text-yellow-600" },
  meeting: { label: "Rencontre", icon: MessageSquare, color: "bg-green-500/10 text-green-500" },
};

interface Props {
  clientId: string;
}

const ClientInteractionHistory = ({ clientId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("note");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");

  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ["client-interactions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_interactions")
        .select("*")
        .eq("client_id", clientId)
        .order("interaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const trimmed = summary.trim();
      if (!trimmed) throw new Error("Le résumé est requis");
      if (trimmed.length > 200) throw new Error("Le résumé doit faire moins de 200 caractères");
      const { error } = await supabase.from("client_interactions").insert({
        client_id: clientId,
        type,
        summary: trimmed,
        details: details.trim() || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-interactions", clientId] });
      setSummary("");
      setDetails("");
      setShowForm(false);
      toast({ title: "Interaction ajoutée" });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_interactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-interactions", clientId] });
      toast({ title: "Interaction supprimée" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Interactions ({interactions.length})
          </span>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {showForm && (
          <div className="px-4 pb-4 space-y-3 border-b border-border">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Résumé de l'interaction"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={200}
            />
            <Textarea
              placeholder="Détails (optionnel)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              maxLength={1000}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button size="sm" onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : interactions.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 pb-4">Aucune interaction enregistrée</p>
        ) : (
          <div className="divide-y divide-border">
            {interactions.map((i: any) => {
              const cfg = typeConfig[i.type] || typeConfig.note;
              const Icon = cfg.icon;
              return (
                <div key={i.id} className="px-4 py-3 flex gap-3 group">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{i.summary}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">{cfg.label}</Badge>
                    </div>
                    {i.details && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{i.details}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(i.interaction_date).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(i.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 mt-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientInteractionHistory;
