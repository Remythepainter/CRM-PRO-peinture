import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Camera, Clock, Package, CheckCircle, Loader2, Trash2, Plus, Send } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import AppLayout from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";

interface MaterialUsage {
  item_id: string;
  item_name: string;
  quantity_used: number;
  unit: string;
}

interface DisposableMaterial {
  name: string;
  quantity: number;
}

const WorkOrderForm = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const memberId = searchParams.get("member");
  const dateParam = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
  const projectId = searchParams.get("project");

  const [description, setDescription] = useState("");
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [breakNotes, setBreakNotes] = useState("");
  const [jobCompleted, setJobCompleted] = useState(false);
  const [paintUsage, setPaintUsage] = useState<MaterialUsage[]>([]);
  const [disposables, setDisposables] = useState<DisposableMaterial[]>([]);
  const [photos, setPhotos] = useState<{ url: string; caption: string; type: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch team member info
  const { data: member } = useQuery({
    queryKey: ["team_member", memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await (supabase as any)
        .from("team_members_public")
        .select("id, name, role")
        .eq("id", memberId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Fetch project info
  const { data: project } = useQuery({
    queryKey: ["project_info", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, client_name, address")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch schedule events for this member on this date
  const { data: events } = useQuery({
    queryKey: ["work_order_events", memberId, dateParam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_events")
        .select("*")
        .eq("event_date", dateParam)
        .neq("status", "cancelled");
      if (error) throw error;
      // Filter by member name
      if (member) {
        return (data ?? []).filter((e: any) =>
          (e.crew_members ?? []).some((c: string) =>
            c.toLowerCase().trim() === member.name.toLowerCase().trim()
          )
        );
      }
      return data ?? [];
    },
    enabled: !!member,
  });

  // Fetch materials assigned to project
  const { data: projectMaterials } = useQuery({
    queryKey: ["project_materials_for_wo", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_materials")
        .select("id, quantity_needed, quantity_used, inventory_items:inventory_item_id(id, name, unit, category)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });

  // Check if already submitted
  const { data: existingReport } = useQuery({
    queryKey: ["existing_work_order", memberId, dateParam, projectId],
    queryFn: async () => {
      if (!memberId) return null;
      let q = supabase
        .from("work_order_reports")
        .select("*")
        .eq("team_member_id", memberId)
        .eq("report_date", dateParam);
      if (projectId) q = q.eq("project_id", projectId);
      const { data } = await q.maybeSingle();
      return data;
    },
    enabled: !!memberId,
  });

  // Load existing data if editing
  useEffect(() => {
    if (existingReport) {
      setDescription(existingReport.description || "");
      setBreakMinutes(existingReport.break_minutes || 0);
      setBreakNotes(existingReport.break_notes || "");
      setJobCompleted(existingReport.job_completed || false);
      setPaintUsage((existingReport.paint_usage as any) || []);
      setDisposables((existingReport.disposable_materials_used as any) || []);
      if (existingReport.submitted_at) setSubmitted(true);
    }
  }, [existingReport]);

  // Load existing photos
  const { data: existingPhotos } = useQuery({
    queryKey: ["work_order_photos", existingReport?.id],
    queryFn: async () => {
      if (!existingReport?.id) return [];
      const { data } = await supabase
        .from("work_order_photos")
        .select("*")
        .eq("work_order_id", existingReport.id);
      return data ?? [];
    },
    enabled: !!existingReport?.id,
  });

  useEffect(() => {
    if (existingPhotos && existingPhotos.length > 0) {
      setPhotos(existingPhotos.map((p: any) => ({ url: p.image_url, caption: p.caption || "", type: p.photo_type })));
    }
  }, [existingPhotos]);

  // Initialize paint usage from project materials
  useEffect(() => {
    if (projectMaterials && projectMaterials.length > 0 && paintUsage.length === 0 && !existingReport) {
      const paintItems = projectMaterials
        .filter((m: any) => m.inventory_items?.category === "peinture")
        .map((m: any) => ({
          item_id: m.inventory_items.id,
          item_name: m.inventory_items.name,
          quantity_used: 0,
          unit: m.inventory_items.unit || "gallon",
        }));
      setPaintUsage(paintItems);
    }
  }, [projectMaterials, existingReport]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${memberId}/${dateParam}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("work-order-photos").upload(path, file);
        if (error) throw error;
        const { data: signedData } = await supabase.storage.from("work-order-photos").createSignedUrl(path, 3600);
        setPhotos((prev) => [...prev, { url: signedData?.signedUrl || path, caption: "", type: "progress" }]);
      }
    } catch (err) {
      toast({ title: "Erreur upload", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        team_member_id: memberId!,
        report_date: dateParam,
        project_id: projectId || null,
        schedule_event_id: events?.[0]?.id || null,
        description,
        break_minutes: breakMinutes,
        break_notes: breakNotes || null,
        disposable_materials_used: JSON.parse(JSON.stringify(disposables)),
        paint_usage: JSON.parse(JSON.stringify(paintUsage)),
        job_completed: jobCompleted,
        submitted_at: new Date().toISOString(),
      };

      let reportId: string;
      if (existingReport) {
        const { error } = await supabase
          .from("work_order_reports")
          .update(payload)
          .eq("id", existingReport.id);
        if (error) throw error;
        reportId = existingReport.id;
      } else {
        const { data, error } = await supabase
          .from("work_order_reports")
          .insert([payload])
          .select("id")
          .single();
        if (error) throw error;
        reportId = data.id;
      }

      // Save photos
      if (photos.length > 0) {
        // Delete existing photos first if editing
        if (existingReport) {
          await supabase.from("work_order_photos").delete().eq("work_order_id", reportId);
        }
        const photoRows = photos.map((p) => ({
          work_order_id: reportId,
          image_url: p.url,
          caption: p.caption || null,
          photo_type: p.type,
        }));
        const { error: pErr } = await supabase.from("work_order_photos").insert(photoRows);
        if (pErr) throw pErr;
      }

      setSubmitted(true);
      toast({ title: "Bon de travail soumis ✓" });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const dateLabel = format(new Date(dateParam + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr });

  if (submitted) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-12 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Bon de travail soumis</h1>
          <p className="text-muted-foreground">Merci ! Votre rapport du {dateLabel} a été enregistré.</p>
          <Button variant="outline" onClick={() => setSubmitted(false)}>Modifier le rapport</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4 pb-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Bon de travail
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
          {member && <Badge variant="secondary" className="mt-1">{member.name} — {member.role}</Badge>}
          {project && <p className="text-sm text-muted-foreground mt-1">Projet : {project.name} — {project.client_name}</p>}
        </div>

        {/* Events summary */}
        {events && events.length > 0 && (
          <Card className="card-glowing border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1"><Clock className="h-4 w-4" /> Horaire du jour</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {events.map((e: any) => (
                <div key={e.id} className="text-sm flex justify-between">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-muted-foreground">{e.start_time?.slice(0, 5)} – {e.end_time?.slice(0, 5)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Description du travail */}
        <Card className="card-glowing border-border/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Description du travail effectué</CardTitle>
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="gap-2 text-primary border-primary/20 hover:bg-primary/10"
              onClick={() => {
                // Implementation structure for Dictaphone/Speech API
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (!SpeechRecognition) {
                  toast({
                    title: "Non supporté",
                    description: "La dictée vocale n'est pas supportée sur ce navigateur.",
                    variant: "destructive"
                  });
                  return;
                }
                
                const recognition = new SpeechRecognition();
                recognition.lang = 'fr-CA';
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;
                
                toast({
                  title: "Microphone activé 🎙️",
                  description: "Parlez maintenant...",
                });
                
                recognition.start();
                
                recognition.onresult = (event: any) => {
                  const speechResult = event.results[0][0].transcript;
                  setDescription(prev => prev ? `${prev} ${speechResult}` : speechResult);
                  toast({
                    title: "Texte ajouté ✓",
                    description: "Votre dictée a été transcrite."
                  });
                };
                
                recognition.onerror = (event: any) => {
                  toast({
                    title: "Erreur de dictée",
                    description: "Je n'ai pas pu vous entendre correctement.",
                    variant: "destructive"
                  });
                };
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              Dicter
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Décrivez ce qui a été fait aujourd'hui (appuyez sur Dicter pour utiliser le micro)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="text-base"
            />
          </CardContent>
        </Card>

        {/* Fichiers médias (Photos & Audio) */}
        <Card className="card-glowing border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1"><Camera className="h-4 w-4" /> Photos et Vocaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  {photo.url.match(/\.(mp3|wav|m4a|weba|ogg)$/i) ? (
                    <div className="w-full h-24 flex items-center justify-center bg-secondary rounded-md border border-border">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-music text-primary"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                  ) : (
                    <img src={photo.url} alt="" className="w-full h-24 object-cover rounded-md border border-border" />
                  )}
                  <button
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={uploading} className="w-full">
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
                    Joindre image/audio
                  </span>
                </Button>
                {/* allow image and audio types */}
                <input type="file" accept="image/*,audio/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Pauses */}
        <Card className="card-glowing border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1"><Clock className="h-4 w-4" /> Pauses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm shrink-0">Durée totale (min)</Label>
              <Input type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)} className="w-24" />
            </div>
            <Textarea placeholder="Notes sur les pauses (optionnel)" value={breakNotes} onChange={(e) => setBreakNotes(e.target.value)} rows={2} />
          </CardContent>
        </Card>

        {/* Matériel jetable */}
        <Card className="card-glowing border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1"><Package className="h-4 w-4" /> Matériel jetable utilisé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {disposables.map((d, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="Article"
                  value={d.name}
                  onChange={(e) => {
                    const updated = [...disposables];
                    updated[idx].name = e.target.value;
                    setDisposables(updated);
                  }}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  value={d.quantity}
                  onChange={(e) => {
                    const updated = [...disposables];
                    updated[idx].quantity = parseInt(e.target.value) || 0;
                    setDisposables(updated);
                  }}
                  className="w-20"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDisposables((prev) => prev.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setDisposables([...disposables, { name: "", quantity: 1 }])}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </CardContent>
        </Card>

        {/* Job terminé + peinture */}
        <Card className="card-glowing border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Statut du projet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={jobCompleted} onCheckedChange={setJobCompleted} />
              <Label className="text-sm">Travail terminé pour ce projet</Label>
            </div>

            {jobCompleted && paintUsage.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-sm font-medium text-foreground">Quantité de peinture utilisée :</p>
                {paintUsage.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground flex-1 truncate">{p.item_name}</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={p.quantity_used}
                      onChange={(e) => {
                        const updated = [...paintUsage];
                        updated[idx].quantity_used = parseFloat(e.target.value) || 0;
                        setPaintUsage(updated);
                      }}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">{p.unit}</span>
                  </div>
                ))}
              </div>
            )}

            {jobCompleted && paintUsage.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun matériel de peinture assigné à ce projet.</p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || !description.trim()}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Soumettre le bon de travail
        </Button>
      </div>
    </AppLayout>
  );
};

export default WorkOrderForm;
