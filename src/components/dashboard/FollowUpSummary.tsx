import { useFollowUps } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageCircle,
  ArrowRight,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const FollowUpSummary = () => {
  const { data: followUps, isLoading } = useFollowUps();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Suivis en cours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground animate-pulse">Chargement…</div>
        </CardContent>
      </Card>
    );
  }

  const active = followUps?.filter((f) => f.status === "active") || [];
  const allStatuses = followUps?.flatMap(
    (f) => (f.follow_up_step_statuses as any[]) || []
  ) || [];

  const overdueCount = allStatuses.filter((s) => s.status === "overdue").length;
  const sentCount = allStatuses.filter((s) => s.status === "sent").length;
  const repliedCount = allStatuses.filter((s) => s.status === "replied").length;
  const pendingCount = allStatuses.filter((s) => s.status === "pending").length;
  const totalSteps = allStatuses.length;
  const completedSteps = sentCount + repliedCount;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Get the most urgent overdue follow-ups (up to 3)
  const overdueFollowUps = followUps
    ?.filter((f) => {
      const statuses = (f.follow_up_step_statuses as any[]) || [];
      return statuses.some((s) => s.status === "overdue");
    })
    .slice(0, 3) || [];

  const stats = [
    { icon: AlertTriangle, label: "En retard", value: overdueCount, className: "text-destructive" },
    { icon: Clock, label: "Planifiés", value: pendingCount, className: "text-muted-foreground" },
    { icon: CheckCircle2, label: "Envoyés", value: sentCount, className: "text-success" },
    { icon: MessageCircle, label: "Réponses", value: repliedCount, className: "text-blue-400" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Suivis en cours
            {active.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {active.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => navigate("/followups")}
          >
            Voir tout <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className={`flex justify-center mb-1 ${s.className}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progression globale</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Overdue alerts */}
        {overdueFollowUps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Suivis en retard
            </p>
            {overdueFollowUps.map((f) => {
              const lead = f.leads as any;
              const overdueSteps = ((f.follow_up_step_statuses as any[]) || []).filter(
                (s) => s.status === "overdue"
              );
              const oldestOverdue = overdueSteps.sort(
                (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
              )[0];

              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 cursor-pointer hover:bg-destructive/10 transition-colors"
                  onClick={() => navigate("/followups")}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{lead?.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {overdueSteps.length} étape(s) en retard
                      {oldestOverdue && (
                        <> · depuis {formatDistanceToNow(new Date(oldestOverdue.scheduled_at), { locale: fr })}</>
                      )}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">
                    Urgent
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {active.length === 0 && overdueCount === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucun suivi en cours.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FollowUpSummary;
