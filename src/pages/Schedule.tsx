import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCanModify } from "@/hooks/useCanModify";
import { useUserRole } from "@/hooks/useUserRole";
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
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Loader2, Pencil, Trash2, FileDown } from "lucide-react";
import { generateAllWorkOrdersForDate, generateWorkOrderPdf } from "@/components/reports/WorkOrderPdf";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addWeeks,
  subMonths,
  subWeeks,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

type ViewMode = "month" | "week";

interface ScheduleEvent {
  id: string;
  title: string;
  description: string | null;
  lead_id: string | null;
  deal_id: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  status: string;
  address: string | null;
  crew_members: string[];
  color: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

const eventTypeLabels: Record<string, string> = {
  job: "Travail",
  estimate: "Estimation",
  meeting: "Réunion",
  followup: "Suivi",
};

const statusLabels: Record<string, string> = {
  scheduled: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/20 text-primary",
  in_progress: "bg-warning/20 text-warning",
  completed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

const presetColors = ["#d4a853", "#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#f97316"];

const Schedule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canModify } = useCanModify();
  const { isAdmin } = useUserRole();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [exportingWorkOrders, setExportingWorkOrders] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventType, setEventType] = useState("job");
  const [status, setStatus] = useState("scheduled");
  const [address, setAddress] = useState("");
  const [color, setColor] = useState("#d4a853");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["schedule_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as ScheduleEvent[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description: description || null,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        event_type: eventType,
        status,
        address: address || null,
        color,
      };
      if (editingEvent) {
        const { error } = await supabase.from("schedule_events").update(payload).eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("schedule_events").insert([{ ...payload, created_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_events"] });
      toast({ title: editingEvent ? "Événement modifié" : "Événement créé" });
      closeForm();
    },
    onError: (err) => {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_events"] });
      toast({ title: "Événement supprimé" });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    },
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditingEvent(null);
    setTitle(""); setDescription(""); setEventDate(""); setStartTime("");
    setEndTime(""); setEventType("job"); setStatus("scheduled");
    setAddress(""); setColor("#d4a853");
  };

  const openCreate = (date?: Date) => {
    closeForm();
    if (date) setEventDate(format(date, "yyyy-MM-dd"));
    setFormOpen(true);
  };

  const openEdit = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setEventDate(event.event_date);
    setStartTime(event.start_time || "");
    setEndTime(event.end_time || "");
    setEventType(event.event_type);
    setStatus(event.status);
    setAddress(event.address || "");
    setColor(event.color || "#d4a853");
    setFormOpen(true);
  };

  const navigate = (dir: number) => {
    setCurrentDate((d) => (viewMode === "month" ? (dir > 0 ? addMonths(d, 1) : subMonths(d, 1)) : (dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1))));
  };

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const monthDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
    return days;
  }, [currentDate]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.event_date), day));

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Calendrier</h1>
            <p className="text-sm text-muted-foreground mt-1">Planification des projets et rendez-vous</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                className="rounded-none"
              >
                Mois
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="rounded-none"
              >
                Semaine
              </Button>
            </div>
            {isAdmin === true && (
              <Button variant="gold" size="sm" onClick={() => openCreate()}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            )}
            {isAdmin === true && (
              <Button
                variant="outline"
                size="sm"
                disabled={exportingWorkOrders}
                onClick={async () => {
                  setExportingWorkOrders(true);
                  try {
                    const targetDate = selectedDate || new Date();
                    const names = await generateAllWorkOrdersForDate(targetDate);
                    if (names.length === 0) {
                      toast({ title: "Aucun bon de travail", description: "Aucun employé planifié pour cette journée." });
                    } else {
                      toast({ title: `${names.length} bon(s) de travail téléchargé(s)`, description: names.join(", ") });
                    }
                  } catch (err) {
                    toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
                  } finally {
                    setExportingWorkOrders(false);
                  }
                }}
                title="Télécharger les bons de travail du jour"
              >
                {exportingWorkOrders ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileDown className="h-4 w-4 mr-1" />}
                Bons de travail
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground capitalize">
            {viewMode === "month"
              ? format(currentDate, "MMMM yyyy", { locale: fr })
              : `Semaine du ${format(weekStart, "d MMM", { locale: fr })} au ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: fr })}`}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Aujourd'hui
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : viewMode === "month" ? (
          /* Monthly View */
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-7">
                {dayNames.map((d) => (
                  <div key={d} className="p-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/30">
                    {d}
                  </div>
                ))}
                {monthDays.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const inMonth = isSameMonth(day, currentDate);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-[100px] p-1.5 border-b border-r border-border transition-colors",
                        isAdmin === true && "cursor-pointer hover:bg-accent/30",
                        !inMonth && "opacity-40 bg-secondary/10",
                        isToday(day) && "bg-primary/5",
                      )}
                      onClick={() => isAdmin === true && openCreate(day)}
                    >
                      <span className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday(day) && "bg-primary text-primary-foreground font-bold",
                      )}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate text-white font-medium cursor-pointer"
                            style={{ backgroundColor: ev.color || "#d4a853" }}
                            onClick={(e) => { e.stopPropagation(); if (isAdmin === true) openEdit(ev); }}
                          >
                            {ev.start_time ? `${ev.start_time.slice(0, 5)} ` : ""}{ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground pl-1.5">+{dayEvents.length - 3} de plus</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Weekly View */
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-7">
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "text-center p-2 border-b border-r border-border bg-secondary/30",
                      isToday(day) && "bg-primary/10",
                    )}
                  >
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {format(day, "EEE", { locale: fr })}
                    </p>
                    <p className={cn(
                      "text-lg font-semibold mt-0.5",
                      isToday(day) ? "text-primary" : "text-foreground",
                    )}>
                      {format(day, "d")}
                    </p>
                  </div>
                ))}
                {weekDays.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div
                      key={day.toISOString() + "-body"}
                      className={cn(
                        "min-h-[300px] p-2 border-r border-border cursor-pointer hover:bg-accent/20 transition-colors",
                        isToday(day) && "bg-primary/5",
                      )}
                      onClick={() => isAdmin === true && openCreate(day)}
                    >
                      <div className="space-y-1.5">
                        {dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="rounded-lg p-2 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: ev.color || "#d4a853" }}
                            onClick={(e) => { e.stopPropagation(); if (isAdmin === true) openEdit(ev); }}
                          >
                            <p className="font-semibold truncate">{ev.title}</p>
                            {ev.start_time && (
                              <p className="flex items-center gap-1 mt-0.5 opacity-90">
                                <Clock className="h-3 w-3" />
                                {ev.start_time.slice(0, 5)}{ev.end_time ? ` - ${ev.end_time.slice(0, 5)}` : ""}
                              </p>
                            )}
                            {ev.address && (
                              <p className="flex items-center gap-1 mt-0.5 opacity-90 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />{ev.address}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-1.5">
                              <Badge className={cn("text-[10px] px-1.5 py-0", statusColors[ev.status])}>
                                {statusLabels[ev.status]}
                              </Badge>
                              {isAdmin === true && (
                                <div className="flex gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); openEdit(ev); }} className="opacity-70 hover:opacity-100">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(ev.id); }} className="opacity-70 hover:opacity-100">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Event Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Modifiez les détails de l'événement" : "Planifiez un nouveau rendez-vous ou travail"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">Titre *</Label>
              <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Peinture cuisine - Dupont" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-date">Date *</Label>
                <Input id="ev-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job">Travail</SelectItem>
                    <SelectItem value="estimate">Estimation</SelectItem>
                    <SelectItem value="meeting">Réunion</SelectItem>
                    <SelectItem value="followup">Suivi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">Début</Label>
                <Input id="ev-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-end">Fin</Label>
                <Input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Planifié</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-address">Adresse</Label>
              <Input id="ev-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="145 Rue Saint-Laurent, Montréal" />
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      color === c ? "border-foreground scale-110" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails supplémentaires..." rows={2} />
            </div>
            <div className="flex justify-between pt-2">
              {editingEvent && canModify(editingEvent.created_by) && (
                <Button type="button" variant="destructive" size="sm" onClick={() => { setDeleteId(editingEvent.id); closeForm(); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={closeForm}>Annuler</Button>
                <Button type="submit" variant="gold" disabled={saveMutation.isPending || !title || !eventDate}>
                  {saveMutation.isPending && <Loader2 className="animate-spin" />}
                  {editingEvent ? "Enregistrer" : "Créer"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet événement?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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

export default Schedule;
