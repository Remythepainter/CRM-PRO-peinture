import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity as ActivityIcon, Loader2, Users, FileText, Briefcase, DollarSign, RefreshCw, Calendar, Package, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

const entityIcons: Record<string, any> = {
  lead: Users, quote: FileText, project: Briefcase, deal: DollarSign,
  follow_up: RefreshCw, event: Calendar, inventory: Package,
};

const actionLabels: Record<string, string> = {
  created: "Créé", updated: "Mis à jour", deleted: "Supprimé",
  status_changed: "Statut changé", completed: "Terminé",
};

const entityLabels: Record<string, string> = {
  lead: "Prospect", quote: "Soumission", project: "Projet", deal: "Deal",
  follow_up: "Suivi", event: "Événement", inventory: "Inventaire",
  task: "Tâche", client: "Client", document: "Document",
};

const Activity = () => {
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const filtered = entityFilter === "all" ? activities : activities.filter((a: any) => a.entity_type === entityFilter);

  const entityTypes = [...new Set(activities.map((a: any) => a.entity_type))];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ActivityIcon className="h-6 w-6 text-primary" /> Fil d'activité
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Historique de toutes les actions récentes</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button variant={entityFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setEntityFilter("all")}>
            <Filter className="h-3 w-3 mr-1" /> Tout
          </Button>
          {entityTypes.map((type: string) => (
            <Button key={type} variant={entityFilter === type ? "default" : "outline"} size="sm" onClick={() => setEntityFilter(type)}>
              {entityLabels[type] || type}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <ActivityIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune activité enregistrée</p>
            <p className="text-xs mt-1">Les actions dans l'application apparaîtront ici automatiquement</p>
          </CardContent></Card>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {filtered.map((activity: any) => {
                const Icon = entityIcons[activity.entity_type] || ActivityIcon;
                return (
                  <div key={activity.id} className="relative flex gap-4 pl-2">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary border border-border">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <Card className="flex-1">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-foreground">
                              <span className="font-medium">{activity.user_name || "Système"}</span>
                              {" "}
                              <span className="text-muted-foreground">{actionLabels[activity.action] || activity.action}</span>
                              {" "}
                              <Badge variant="outline" className="text-[10px] mx-1">{entityLabels[activity.entity_type] || activity.entity_type}</Badge>
                              {activity.entity_name && <span className="font-medium">{activity.entity_name}</span>}
                            </p>
                            {activity.details && <p className="text-xs text-muted-foreground mt-1">{activity.details}</p>}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Activity;
