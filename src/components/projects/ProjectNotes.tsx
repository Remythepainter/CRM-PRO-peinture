import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Mic, MicOff, Send, Camera, Upload, Loader2, Trash2, Play, Pause, FileText, ImageIcon, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSignedUrl, useSignedUrl } from "@/lib/storage";
import SignedImage from "@/components/ui/signed-image";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCanModify } from "@/hooks/useCanModify";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface ProjectNote {
  id: string;
  project_id: string;
  type: "text" | "photo" | "voice";
  content: string | null;
  image_url: string | null;
  audio_url: string | null;
  transcription: string | null;
  created_by: string | null;
  created_at: string;
}

interface ProjectNotesProps {
  projectId: string;
  projectName: string;
}

const typeConfig = {
  text: { icon: FileText, label: "Note", color: "bg-primary/20 text-primary" },
  photo: { icon: ImageIcon, label: "Photo", color: "bg-accent text-accent-foreground" },
  voice: { icon: Volume2, label: "Vocal", color: "bg-warning/20 text-warning" },
};

const ProjectNotes = ({ projectId, projectName }: ProjectNotesProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canModify } = useCanModify();
  const queryClient = useQueryClient();

  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["project_notes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_notes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectNote[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_notes", projectId] });
      toast({ title: "Note supprimée" });
      setDeleteId(null);
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  // --- Text note ---
  const handleSendNote = async () => {
    if (!noteText.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("project_notes").insert([{
        project_id: projectId,
        type: "text",
        content: noteText.trim(),
        created_by: user.id,
      }]);
      if (error) throw error;
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["project_notes", projectId] });
      toast({ title: "Note ajoutée" });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // --- Photo ---
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setSending(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("project-photos").upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabase.from("project_notes").insert([{
          project_id: projectId,
          type: "photo",
          image_url: fileName,
          created_by: user.id,
        }]);
        if (insertError) throw insertError;
      }
      queryClient.invalidateQueries({ queryKey: ["project_notes", projectId] });
      toast({ title: "Photo ajoutée" });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // --- Voice recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        handleVoiceUpload();
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast({ title: "Erreur microphone", description: "Autorisez l'accès au micro", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleVoiceUpload = async () => {
    if (!user || audioChunksRef.current.length === 0) return;
    setSending(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const fileName = `${user.id}/${projectId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from("voice-recordings").upload(fileName, audioBlob, { upsert: true });
      if (uploadError) throw uploadError;
      // Insert note first
      const { data: noteData, error: insertError } = await supabase.from("project_notes").insert([{
        project_id: projectId,
        type: "voice",
        audio_url: fileName,
        created_by: user.id,
      }]).select().single();
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["project_notes", projectId] });
      toast({ title: "Message vocal enregistré", description: "Transcription en cours..." });

      // Transcribe in background
      const audioSignedUrl = await getSignedUrl("voice-recordings", fileName);
      const { data: transcriptionData } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio_url: audioSignedUrl },
      });

      if (transcriptionData?.transcription && noteData) {
        await supabase.from("project_notes")
          .update({ transcription: transcriptionData.transcription })
          .eq("id", noteData.id);
        queryClient.invalidateQueries({ queryKey: ["project_notes", projectId] });
        toast({ title: "Transcription terminée" });
      }
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // --- Audio playback ---
  const togglePlayback = async (audioUrl: string, noteId: string) => {
    if (playingId === noteId) {
      audioPlayerRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    const signedUrl = await getSignedUrl("voice-recordings", audioUrl);
    const audio = new Audio(signedUrl);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioPlayerRef.current = audio;
    setPlayingId(noteId);
  };

  return (
    <div className="space-y-4">
      {/* Input area */}
      <div className="space-y-3 border border-border/50 rounded-lg p-3 bg-secondary/10">
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Écrire une note..."
          rows={2}
          className="resize-none"
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2">
            {/* Camera */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} />
            <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} disabled={sending}>
              <Camera className="h-4 w-4 mr-1" /> Photo
            </Button>
            {/* File upload */}
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} />
            <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={sending}>
              <Upload className="h-4 w-4 mr-1" /> Image
            </Button>
            {/* Voice */}
            <Button
              variant={recording ? "destructive" : "outline"}
              size="sm"
              onClick={recording ? stopRecording : startRecording}
              disabled={sending && !recording}
            >
              {recording ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
              {recording ? "Arrêter" : "Vocal"}
            </Button>
          </div>
          <Button variant="gold" size="sm" onClick={handleSendNote} disabled={!noteText.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Envoyer
          </Button>
        </div>
        {recording && (
          <div className="flex items-center gap-2 text-sm text-destructive animate-pulse">
            <span className="h-2 w-2 rounded-full bg-destructive" /> Enregistrement en cours...
          </div>
        )}
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune note pour ce projet</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const cfg = typeConfig[note.type];
            const Icon = cfg.icon;
            return (
              <Card key={note.id} className="border-border/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px] px-1.5", cfg.color)}>
                        <Icon className="h-3 w-3 mr-0.5" /> {cfg.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {format(parseISO(note.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                    {canModify(note.created_by) && (
                      <button
                        onClick={() => setDeleteId(note.id)}
                        className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Text note */}
                  {note.type === "text" && note.content && (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  )}

                  {/* Photo note */}
                  {note.type === "photo" && note.image_url && (
                    <SignedImage bucket="project-photos" storagePath={note.image_url} alt="Note photo" className="rounded-lg max-h-48 object-cover" loading="lazy" />
                  )}

                  {/* Voice note */}
                  {note.type === "voice" && (
                    <div className="space-y-2">
                      {note.audio_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePlayback(note.audio_url!, note.id)}
                        >
                          {playingId === note.id ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                          {playingId === note.id ? "Pause" : "Écouter"}
                        </Button>
                      )}
                      {note.transcription ? (
                        <div className="bg-muted/50 rounded-md p-2">
                          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Transcription :</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{note.transcription}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Transcription en cours...</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette note?</AlertDialogTitle>
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

export default ProjectNotes;
