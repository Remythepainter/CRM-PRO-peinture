import { useState, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FolderOpen, Plus, Loader2, Trash2, Download, FileText, File, Image, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSignedUrl } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categoryLabels: Record<string, string> = {
  general: "Général", contract: "Contrat", permit: "Permis", plan: "Plan",
  invoice: "Facture", purchase_order: "Bon de commande", insurance: "Assurance", other: "Autre",
};

const fileTypeIcons: Record<string, any> = {
  pdf: FileText, image: Image, document: File, other: File,
};

function getFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "document";
  return "other";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " Ko";
  return (bytes / 1048576).toFixed(1) + " Mo";
}

const Documents = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  const handleDownload = async (fileUrl: string) => {
    try {
      const url = await getSignedUrl("documents", fileUrl);
      window.open(url, "_blank");
    } catch {
      toast({ title: "Erreur", description: "Impossible de télécharger le fichier", variant: "destructive" });
    }
  };
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", category: "general", project_id: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
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

  const uploadDoc = async () => {
    if (!selectedFile || !form.name) return;
    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${user?.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, selectedFile);
      if (upErr) throw upErr;
      const { error } = await supabase.from("documents").insert({
        name: form.name,
        file_url: path,
        file_type: getFileType(selectedFile.name),
        file_size: selectedFile.size,
        category: form.category,
        project_id: form.project_id || null,
        created_by: user?.id,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setDialogOpen(false);
      setForm({ name: "", category: "general", project_id: "" });
      setSelectedFile(null);
      toast({ title: "Document ajouté ✓" });
    } catch {
      toast({ title: "Erreur d'envoi", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setDeleteId(null);
      toast({ title: "Document supprimé" });
    },
  });

  const filtered = docs
    .filter((d: any) => catFilter === "all" || d.category === catFilter)
    .filter((d: any) => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-primary" /> Documents
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{docs.length} fichier{docs.length !== 1 ? "s" : ""}</p>
          </div>
          {isAdmin === true && (
            <Button variant="gold" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {Object.entries(categoryLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun document</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc: any) => {
              const Icon = fileTypeIcons[doc.file_type] || File;
              return (
                <Card key={doc.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{categoryLabels[doc.category] || doc.category}</Badge>
                          {doc.file_size > 0 && <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.file_size)}</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleDownload(doc.file_url)} className="text-muted-foreground hover:text-primary">
                          <Download className="h-4 w-4" />
                        </button>
                        {isAdmin === true && (
                          <button onClick={() => setDeleteId(doc.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>Téléversez un fichier et associez-le à un projet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du document *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Contrat Dupont" />
            </div>
            <div>
              <Label>Fichier *</Label>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> {selectedFile ? selectedFile.name : "Choisir un fichier"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Projet</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="gold" className="w-full" onClick={uploadDoc} disabled={!form.name || !selectedFile || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Téléverser
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce document?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteDoc.mutate(deleteId)}>Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Documents;
