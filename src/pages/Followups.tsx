import AppLayout from "@/components/layout/AppLayout";
import { useFollowUps, useFollowUpSequence } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mail,
  MessageSquare,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Clock,
  SkipForward,
  Bell,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Reply,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { useState } from "react";

const stepTypeIcons: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
};

const stepTypeLabels: Record<string, string> = {
  email: "Courriel",
  sms: "SMS",
  call: "Appel",
};

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string; badgeClass: string }> = {
  sent: { icon: CheckCircle2, label: "Envoyé", color: "text-success", badgeClass: "bg-success/20 text-success" },
  replied: { icon: MessageCircle, label: "Répondu", color: "text-blue-400", badgeClass: "bg-blue-500/20 text-blue-400" },
  overdue: { icon: AlertTriangle, label: "En retard", color: "text-destructive", badgeClass: "bg-destructive/20 text-destructive" },
  pending: { icon: Clock, label: "Planifié", color: "text-muted-foreground", badgeClass: "bg-muted text-muted-foreground" },
  skipped: { icon: SkipForward, label: "Ignoré", color: "text-muted-foreground", badgeClass: "bg-muted text-muted-foreground" },
};

const sequenceStatusLabels: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-primary/20 text-primary" },
  completed: { label: "Terminée", className: "bg-success/20 text-success" },
  paused: { label: "En pause", className: "bg-warning/20 text-warning" },
  converted: { label: "Convertie", className: "bg-success/20 text-success" },
};

const Followups = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: followUps, isLoading: loadingFollowUps } = useFollowUps();
  const { data: sequence, isLoading: loadingSequence } = useFollowUpSequence();

  const sequenceSteps = sequence?.follow_up_sequence_steps
    ?.sort((a: any, b: any) => a.step_order - b.step_order) || [];

  const selectedStep = selectedStepId
    ? sequenceSteps.find((s: any) => s.id === selectedStepId)
    : null;

  const allStepStatuses = followUps?.flatMap((fu: any) => fu.follow_up_step_statuses) || [];

  const overdueCount = allStepStatuses.filter((s: any) => s.status === "overdue").length;
  const repliedCount = allStepStatuses.filter((s: any) => s.status === "replied").length;
  const activeCount = followUps?.filter((fu: any) => fu.status === "active").length || 0;
  const convertedCount = followUps?.filter((fu: any) => fu.status === "converted").length || 0;

  const overdueFollowUps = followUps?.filter(
    (fu: any) => fu.status === "active" && fu.follow_up_step_statuses.some((s: any) => s.status === "overdue")
  ) || [];

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const handleSendFollowUp = async (stepStatusId: string) => {
    setSendingId(stepStatusId);
    try {
      const { data, error } = await supabase.functions.invoke("send-followup", {
        body: { action: "send-sms", followUpStepStatusId: stepStatusId },
      });
      if (error) throw error;
      toast.success("Suivi envoyé avec succès!");
      queryClient.invalidateQueries({ queryKey: ["follow_ups"] });
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSendingId(null);
    }
  };

  if (loadingFollowUps || loadingSequence) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Suivis automatiques</h1>
            <p className="text-sm text-muted-foreground mt-1">Séquences de relance après soumission</p>
          </div>
          <Button variant="gold" size="sm">
            <Send className="h-4 w-4 mr-1" />
            Nouvelle séquence
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Séquences actives</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <MessageCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-blue-400">{repliedCount}</p>
                <p className="text-xs text-muted-foreground">Réponses reçues</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border-border/50", overdueCount > 0 && "border-destructive/50")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", overdueCount > 0 ? "bg-destructive/10" : "bg-muted")}>
                <AlertTriangle className={cn("h-5 w-5", overdueCount > 0 ? "text-destructive" : "text-muted-foreground")} />
              </div>
              <div>
                <p className={cn("text-2xl font-bold font-display", overdueCount > 0 ? "text-destructive" : "text-foreground")}>{overdueCount}</p>
                <p className="text-xs text-muted-foreground">Suivis en retard</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">{convertedCount}</p>
                <p className="text-xs text-muted-foreground">Converties ce mois</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Alert */}
        {overdueFollowUps.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">
                  {overdueCount} suivi(s) en retard nécessitant votre attention
                </span>
              </div>
              <div className="space-y-2">
                {overdueFollowUps.map((fu: any) => {
                  const overdueSteps = fu.follow_up_step_statuses.filter((s: any) => s.status === "overdue");
                  return overdueSteps.map((step: any) => {
                    const stepDef = step.follow_up_sequence_steps;
                    const StepIcon = stepTypeIcons[stepDef.type] || Mail;
                    return (
                      <div key={step.id} className="flex items-center gap-3 rounded-lg bg-card p-3 border border-border/50">
                        <StepIcon className="h-4 w-4 text-destructive flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{fu.leads.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {stepDef.label} — prévu le {formatDate(step.scheduled_at)}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{fu.quote_value.toLocaleString()} $</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          disabled={sendingId === step.id}
                          onClick={() => handleSendFollowUp(step.id)}
                        >
                          {sendingId === step.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Exécuter"}
                        </Button>
                      </div>
                    );
                  });
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sequence Template */}
        {sequenceSteps.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold font-body">Séquence type: {sequence?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {sequenceSteps.map((step: any, i: number) => {
                  const StepIcon = stepTypeIcons[step.type] || Mail;
                  const isSelected = selectedStepId === step.id;
                  return (
                    <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setSelectedStepId(isSelected ? null : step.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-3 transition-all text-left",
                          isSelected ? "border-primary bg-primary/10" : "border-border/50 bg-card hover:border-primary/30"
                        )}
                      >
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", isSelected ? "bg-primary/20" : "bg-secondary")}>
                          <StepIcon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{step.label}</p>
                          <p className="text-[10px] text-muted-foreground">{stepTypeLabels[step.type]}</p>
                        </div>
                      </button>
                      {i < sequenceSteps.length - 1 && <div className="w-6 h-px bg-border flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
              {selectedStep && (
                <div className="mt-3 rounded-lg bg-secondary/50 p-4 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aperçu du template</span>
                  </div>
                  <p className="text-sm text-foreground italic">{(selectedStep as any).template_body}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Sequences */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Séquences en cours</h2>
          {followUps?.map((fu: any) => {
            const isExpanded = expandedId === fu.id;
            const steps = fu.follow_up_step_statuses?.sort(
              (a: any, b: any) => a.follow_up_sequence_steps.step_order - b.follow_up_sequence_steps.step_order
            ) || [];
            const hasOverdue = steps.some((s: any) => s.status === "overdue");
            const completedSteps = steps.filter((s: any) => s.status === "sent" || s.status === "replied").length;
            const seqStatus = sequenceStatusLabels[fu.status] || sequenceStatusLabels.active;

            return (
              <Card key={fu.id} className={cn("border-border/50 transition-colors", hasOverdue && "border-destructive/30")}>
                <CardContent className="p-0">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : fu.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground flex-shrink-0">
                      {fu.leads.name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{fu.leads.name}</p>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", seqStatus.className)}>
                          {seqStatus.label}
                        </span>
                        {hasOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{fu.quote_value.toLocaleString()} $ — Débuté le {formatDate(fu.started_at)}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                      {steps.map((step: any) => (
                        <div
                          key={step.id}
                          className={cn(
                            "h-2 w-6 rounded-full",
                            step.status === "sent" && "bg-success",
                            step.status === "replied" && "bg-blue-500",
                            step.status === "overdue" && "bg-destructive",
                            step.status === "pending" && "bg-secondary",
                            step.status === "skipped" && "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{completedSteps}/{steps.length}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      <div className="space-y-3">
                        {steps.map((step: any, i: number) => {
                          const stepDef = step.follow_up_sequence_steps;
                          const StepIcon = stepTypeIcons[stepDef.type] || Mail;
                          const cfg = statusConfig[step.status] || statusConfig.pending;
                          const StatusIcon = cfg.icon;

                          return (
                            <div key={step.id} className="space-y-0">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center flex-shrink-0">
                                  <div className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full border-2",
                                    step.status === "sent" && "border-success bg-success/10",
                                    step.status === "replied" && "border-blue-500 bg-blue-500/10",
                                    step.status === "overdue" && "border-destructive bg-destructive/10",
                                    step.status === "pending" && "border-border bg-secondary",
                                    step.status === "skipped" && "border-muted bg-muted"
                                  )}>
                                    <StepIcon className={cn("h-3.5 w-3.5", cfg.color)} />
                                  </div>
                                  {(i < steps.length - 1 || step.client_reply_message) && <div className="w-px h-6 bg-border" />}
                                </div>
                                <div className="flex-1 flex items-center justify-between min-w-0">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{stepDef.label}</p>
                                    <p className="text-xs text-muted-foreground">{stepTypeLabels[stepDef.type]} — {formatDate(step.scheduled_at)}</p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {step.executed_at && (
                                      <span className="text-[10px] text-muted-foreground">Exécuté: {formatDate(step.executed_at)}</span>
                                    )}
                                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", cfg.badgeClass)}>
                                      <StatusIcon className="h-3 w-3" />
                                      {cfg.label}
                                    </span>
                                    {step.status === "overdue" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7"
                                        disabled={sendingId === step.id}
                                        onClick={() => handleSendFollowUp(step.id)}
                                      >
                                        {sendingId === step.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Envoyer"}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {step.client_reply_message && (
                                <div className="flex items-start gap-3">
                                  <div className="flex flex-col items-center flex-shrink-0">
                                    <div className="flex h-6 w-8 items-center justify-center">
                                      <Reply className="h-3.5 w-3.5 text-blue-400" />
                                    </div>
                                    {i < steps.length - 1 && <div className="w-px h-4 bg-border" />}
                                  </div>
                                  <div className="flex-1 rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 mb-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <MessageCircle className="h-3 w-3 text-blue-400" />
                                      <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">
                                        Réponse client — {stepTypeLabels[step.client_reply_channel] || ""}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground ml-auto">
                                        {step.client_reply_received_at && formatDate(step.client_reply_received_at)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-foreground">"{step.client_reply_message}"</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Followups;
