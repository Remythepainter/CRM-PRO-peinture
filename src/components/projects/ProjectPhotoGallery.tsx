import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Camera, Upload, Loader2, Trash2, X, ImageIcon, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import SignedImage from "@/components/ui/signed-image";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface ProjectPhoto {
  id: string;
  project_id: string;
  image_url: string;
  caption: string | null;
  category: string;
  taken_at: string | null;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  before: "Avant",
  progress: "En cours",
  after: "Après",
  detail: "Détail",
  issue: "Problème",
};

const categoryColors: Record<string, string> = {
  before: "bg-muted text-muted-foreground",
  progress: "bg-primary/20 text-primary",
  after: "bg-success/20 text-success",
  detail: "bg-accent text-accent-foreground",
  issue: "bg-destructive/20 text-destructive",
};

interface ProjectPhotoGalleryProps {
  projectId: string;
  projectName: string;
}

const ProjectPhotoGallery = ({ projectId, projectName }: ProjectPhotoGalleryProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<ProjectPhoto | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  // Upload form state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("progress");

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["project_photos", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_photos")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectPhoto[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_photos", projectId] });
      toast({ title: "Photo supprimée" });
      setDeleteId(null);
      if (lightboxPhoto && lightboxPhoto.id === deleteId) setLightboxPhoto(null);
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({ title: "Format invalide", description: "Sélectionnez des images", variant: "destructive" });
      return;
    }
    setPendingFiles(imageFiles);
    setUploadDialogOpen(true);
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);

    try {
      for (const file of pendingFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("project-photos")
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from("project_photos").insert([{
          project_id: projectId,
          image_url: fileName,
          caption: caption || null,
          category,
          taken_at: new Date().toISOString(),
        }]);

        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ["project_photos", projectId] });
      toast({ title: `${pendingFiles.length} photo${pendingFiles.length > 1 ? "s" : ""} ajoutée${pendingFiles.length > 1 ? "s" : ""}` });
      setUploadDialogOpen(false);
      setPendingFiles([]);
      setCaption("");
      setCategory("progress");
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filtered = filterCategory === "all" ? photos : photos.filter((p) => p.category === filterCategory);

  const countByCategory = Object.keys(categoryLabels).reduce((acc, key) => {
    acc[key] = photos.filter((p) => p.category === key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-2">
          {/* Camera button (mobile) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
            <Camera className="h-4 w-4 mr-1" /> Photo
          </Button>

          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <Button variant="gold" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Télécharger
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={filterCategory === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterCategory("all")}>
          Toutes ({photos.length})
        </Button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          countByCategory[key] > 0 && (
            <Button key={key} variant={filterCategory === key ? "default" : "outline"} size="sm" onClick={() => setFilterCategory(key)}>
              {label} ({countByCategory[key]})
            </Button>
          )
        ))}
      </div>

      {/* Gallery grid */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Aucune photo pour ce projet</p>
            <p className="text-xs text-muted-foreground mt-1">Prenez une photo ou téléchargez depuis votre appareil</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((photo) => (
            <div key={photo.id} className="group relative rounded-lg overflow-hidden border border-border/50 hover:border-primary/30 transition-colors bg-secondary/20">
              <div className="aspect-square relative cursor-pointer" onClick={() => setLightboxPhoto(photo)}>
                <SignedImage bucket="project-photos" storagePath={photo.image_url} alt={photo.caption || "Photo projet"} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <Badge className={cn("absolute top-2 left-2 text-[10px] px-1.5", categoryColors[photo.category])}>
                  {categoryLabels[photo.category] || photo.category}
                </Badge>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(photo.id); }}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {photo.caption && (
                <p className="text-xs text-muted-foreground p-2 truncate">{photo.caption}</p>
              )}
              {photo.taken_at && (
                <p className="text-[10px] text-muted-foreground/60 px-2 pb-2">
                  {format(parseISO(photo.taken_at), "d MMM yyyy HH:mm", { locale: fr })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload dialog with category/caption */}
      <Dialog open={uploadDialogOpen} onOpenChange={(o) => { if (!o) { setUploadDialogOpen(false); setPendingFiles([]); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter {pendingFiles.length} photo{pendingFiles.length > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>Projet : {projectName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Preview */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pendingFiles.map((f, i) => (
                <img key={i} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover border border-border shrink-0" />
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-caption">Légende</Label>
              <Input id="photo-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Description de la photo..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setPendingFiles([]); }}>Annuler</Button>
              <Button variant="gold" onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                {uploading ? "Téléchargement..." : "Ajouter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightboxPhoto} onOpenChange={(o) => { if (!o) setLightboxPhoto(null); }}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Photo</DialogTitle>
            <DialogDescription>Vue agrandie</DialogDescription>
          </DialogHeader>
          {lightboxPhoto && (
            <div className="relative">
              <SignedImage bucket="project-photos" storagePath={lightboxPhoto.image_url} alt={lightboxPhoto.caption || ""} className="w-full max-h-[80vh] object-contain" />
              <button onClick={() => setLightboxPhoto(null)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", categoryColors[lightboxPhoto.category])}>
                    {categoryLabels[lightboxPhoto.category]}
                  </Badge>
                  {lightboxPhoto.taken_at && (
                    <span className="text-xs text-white/60">{format(parseISO(lightboxPhoto.taken_at), "d MMM yyyy HH:mm", { locale: fr })}</span>
                  )}
                </div>
                {lightboxPhoto.caption && <p className="text-sm text-white mt-1">{lightboxPhoto.caption}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette photo?</AlertDialogTitle>
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

export default ProjectPhotoGallery;
