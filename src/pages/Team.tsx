import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserCog, Plus, Loader2, Pencil, Trash2, Phone, Mail, DollarSign, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  hourly_rate: number;
  rate_ccq_commercial: number;
  rate_ccq_residential_light: number;
  rate_ccq_residential_heavy: number;
  das_percent: number;
  avatar_url: string | null;
  status: string;
  created_at: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(n);

const calcTrueCost = (rate: number, dasPercent: number) => rate * (1 + dasPercent / 100);

const defaultRoles: Record<string, string> = {
  painter: "Peintre",
  foreman: "Contremaître",
  apprentice: "Apprenti",
  estimator: "Estimateur",
  admin: "Admin",
  plasterer: "Plâtrier",
  admin_assistant: "Adjoint(e) administratif(ve)",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Actif", color: "bg-success/20 text-success" },
  inactive: { label: "Inactif", color: "bg-muted text-muted-foreground" },
  on_leave: { label: "En congé", color: "bg-warning/20 text-warning" },
};

const Team = () => {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManageMembers = isAdmin === true;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("painter");
  const [customRole, setCustomRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [rateCcqCommercial, setRateCcqCommercial] = useState("");
  const [rateCcqResLight, setRateCcqResLight] = useState("");
  const [rateCcqResHeavy, setRateCcqResHeavy] = useState("");
  const [dasPercent, setDasPercent] = useState("14.5");
  const [status, setStatus] = useState("active");
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team_members", canManageMembers ? "admin" : "public"],
    queryFn: async () => {
      if (canManageMembers) {
        const { data, error } = await supabase.from("team_members").select("*").order("name");
        if (error) throw error;
        return data as TeamMember[];
      } else {
        const { data, error } = await supabase
          .from("team_members_public")
          .select("id, name, role, avatar_url, status, created_at")
          .order("name");
        if (error) throw error;
        return (data ?? []).map((m) => ({
          id: m.id ?? "",
          name: m.name ?? "",
          role: m.role ?? "painter",
          phone: null,
          email: null,
          hourly_rate: 0,
          rate_ccq_commercial: 0,
          rate_ccq_residential_light: 0,
          rate_ccq_residential_heavy: 0,
          das_percent: 0,
          avatar_url: m.avatar_url,
          status: m.status ?? "active",
          created_at: m.created_at ?? "",
        })) as TeamMember[];
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canManageMembers) {
        throw new Error("Accès refusé");
      }

      let avatarUrl = currentAvatarUrl;

      // Upload avatar if a new file is selected
      if (avatarFile) {
        setUploadingAvatar(true);
        const ext = avatarFile.name.split(".").pop();
        const path = `avatars/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("company-assets").upload(path, avatarFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("company-assets").getPublicUrl(path);
        avatarUrl = publicUrl;
        setUploadingAvatar(false);
      }

      const payload = {
        name,
        role: role === "__custom" ? customRole : role,
        phone: phone || null,
        email: email || null,
        hourly_rate: parseFloat(hourlyRate) || 0,
        rate_ccq_commercial: parseFloat(rateCcqCommercial) || 0,
        rate_ccq_residential_light: parseFloat(rateCcqResLight) || 0,
        rate_ccq_residential_heavy: parseFloat(rateCcqResHeavy) || 0,
        das_percent: parseFloat(dasPercent) || 0,
        status,
        avatar_url: avatarUrl,
      };
      if (editing) {
        const { error } = await supabase.from("team_members").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_members").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast({ title: editing ? "Membre modifié" : "Membre ajouté" });
      closeForm();
    },
    onError: (err) => { setUploadingAvatar(false); toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canManageMembers) {
        throw new Error("Accès refusé");
      }

      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
      toast({ title: "Membre supprimé" });
      setDeleteId(null);
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const closeForm = () => {
    setFormOpen(false); setEditing(null);
    setName(""); setRole("painter"); setCustomRole(""); setPhone(""); setEmail(""); setHourlyRate("");
    setRateCcqCommercial(""); setRateCcqResLight(""); setRateCcqResHeavy(""); setDasPercent("14.5");
    setStatus("active"); setAvatarFile(null); setAvatarPreview(null); setCurrentAvatarUrl(null);
  };

  const openEdit = (m: TeamMember) => {
    if (!canManageMembers) return;

    setEditing(m); setName(m.name); setPhone(m.phone || "");
    if (defaultRoles[m.role]) {
      setRole(m.role); setCustomRole("");
    } else {
      setRole("__custom"); setCustomRole(m.role);
    }
    setEmail(m.email || ""); setHourlyRate(String(m.hourly_rate)); setStatus(m.status);
    setRateCcqCommercial(String(m.rate_ccq_commercial || "")); 
    setRateCcqResLight(String(m.rate_ccq_residential_light || ""));
    setRateCcqResHeavy(String(m.rate_ccq_residential_heavy || ""));
    setDasPercent(String(m.das_percent || 14.5));
    setCurrentAvatarUrl(m.avatar_url || null);
    setAvatarPreview(m.avatar_url || null);
    setAvatarFile(null);
    setFormOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const activeCount = members.filter((m) => m.status === "active").length;
  const avgRate = members.length > 0 ? members.reduce((s, m) => s + m.hourly_rate, 0) / members.length : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <UserCog className="h-6 w-6 text-primary" /> Équipe
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gestion des membres de l'équipe</p>
          </div>
          {canManageMembers && (
            <Button variant="gold" size="sm" onClick={() => { closeForm(); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="border-border/50"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total membres</p>
            <p className="text-2xl font-bold text-foreground">{members.length}</p>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Actifs</p>
            <p className="text-2xl font-bold text-primary">{activeCount}</p>
          </CardContent></Card>
          {canManageMembers && (
            <Card className="border-border/50 col-span-2 md:col-span-1"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Taux moyen</p>
              <p className="text-2xl font-bold text-foreground">{avgRate.toFixed(2)} $/h</p>
            </CardContent></Card>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : members.length === 0 ? (
          <Card className="border-border/50"><CardContent className="py-12 text-center">
            <UserCog className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucun membre d'équipe</p>
            {canManageMembers && (
              <Button variant="gold" size="sm" className="mt-4" onClick={() => { closeForm(); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter un membre
              </Button>
            )}
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((m) => {
              const sc = statusLabels[m.status] || statusLabels.active;
              return (
                <Card key={m.id} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt={m.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-foreground">{m.name}</h3>
                          <p className="text-xs text-muted-foreground">{defaultRoles[m.role] || m.role}</p>
                        </div>
                      </div>
                      <Badge className={cn("text-xs shrink-0", sc.color)}>{sc.label}</Badge>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {canManageMembers && m.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {m.phone}</p>}
                      {canManageMembers && m.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {m.email}</p>}
                      {canManageMembers && <p className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> {m.hourly_rate.toFixed(2)} $/h</p>}
                      {canManageMembers && (
                        <div className="mt-2 space-y-1 bg-secondary/30 rounded-lg p-2">
                          <p className="text-xs font-medium text-foreground">Taux CCQ & coût réel</p>
                          {m.rate_ccq_commercial > 0 && <p>Commercial : {fmt(m.rate_ccq_commercial)}/h</p>}
                          {m.rate_ccq_residential_light > 0 && <p>Résidentiel léger : {fmt(m.rate_ccq_residential_light)}/h</p>}
                          {m.rate_ccq_residential_heavy > 0 && <p>Résidentiel lourd : {fmt(m.rate_ccq_residential_heavy)}/h</p>}
                          <p>DAS : {m.das_percent}%</p>
                          <p className="font-semibold text-primary">Coût réel : {fmt(calcTrueCost(m.hourly_rate, m.das_percent))}/h</p>
                        </div>
                      )}
                    </div>
                    {canManageMembers && (
                      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5 mr-1" /> Modifier</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {canManageMembers && (
        <Dialog open={formOpen} onOpenChange={(o) => { if (!o) closeForm(); }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le membre" : "Nouveau membre"}</DialogTitle>
              <DialogDescription>{editing ? "Modifiez les informations" : "Ajoutez un membre à l'équipe"}</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 mt-2">
            {/* Avatar upload */}
            <div className="flex items-center gap-4">
              <label className="relative cursor-pointer group">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Photo" className="h-16 w-16 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center border-2 border-border group-hover:border-primary transition-colors">
                    <Camera className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Camera className="h-3 w-3 text-primary-foreground" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
              <div className="text-sm">
                <p className="font-medium text-foreground">Photo de profil</p>
                <p className="text-xs text-muted-foreground">Cliquez pour choisir une photo</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-name">Nom *</Label>
              <Input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select value={role} onValueChange={(v) => { setRole(v); if (v !== "__custom") setCustomRole(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(defaultRoles).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    <SelectItem value="__custom">Personnalisé…</SelectItem>
                  </SelectContent>
                </Select>
                {role === "__custom" && (
                  <Input className="mt-1.5" value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="Ex: Plâtrier, Adjointe..." required />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tm-phone">Téléphone</Label>
                <Input id="tm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="514-555-0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tm-email">Courriel</Label>
                <Input id="tm-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@email.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-rate">Taux horaire régulier ($)</Label>
              <Input id="tm-rate" type="number" min="0" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="24.85" />
            </div>
            <p className="text-xs font-medium text-muted-foreground pt-1">Taux CCQ</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Commercial</Label>
                <Input type="number" min="0" step="0.01" value={rateCcqCommercial} onChange={(e) => setRateCcqCommercial(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rés. léger</Label>
                <Input type="number" min="0" step="0.01" value={rateCcqResLight} onChange={(e) => setRateCcqResLight(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rés. lourd</Label>
                <Input type="number" min="0" step="0.01" value={rateCcqResHeavy} onChange={(e) => setRateCcqResHeavy(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-das">DAS employeur (%)</Label>
              <Input id="tm-das" type="number" min="0" step="0.1" value={dasPercent} onChange={(e) => setDasPercent(e.target.value)} placeholder="14.5" />
            </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeForm}>Annuler</Button>
                <Button type="submit" variant="gold" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {editing ? "Enregistrer" : "Ajouter"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {canManageMembers && (
        <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce membre?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AppLayout>
  );
};

export default Team;
