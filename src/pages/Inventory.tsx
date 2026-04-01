import { useState, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package, Plus, Loader2, Pencil, Trash2, AlertTriangle, Upload, Image, Search,
  HardHat, Paintbrush, Wrench, Trash, ShoppingCart, FileText, Link, UserCheck, RotateCcw, Send, BarChart3
} from "lucide-react";
import SupplierComparison from "@/components/inventory/SupplierComparison";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string; name: string; description: string | null; category: string; brand: string | null;
  sku: string | null; quantity: number; unit: string; unit_cost: number; min_stock: number;
  image_url: string | null; created_at: string; created_by: string | null;
  tds_url: string | null; sds_url: string | null; supplier_price: number;
  supplier: string | null; color: string | null; finish: string | null;
  selling_price: number;
}

interface ProjectMaterial {
  id: string; project_id: string; inventory_item_id: string; quantity_needed: number;
  quantity_used: number; notes: string | null; created_at: string;
  inventory_items?: InventoryItem; projects?: { id: string; name: string; client_name: string };
}

interface ToolAssignment {
  id: string; inventory_item_id: string; team_member_id: string;
  assigned_date: string; returned_date: string | null; notes: string | null;
  status: string; created_at: string;
  inventory_items?: InventoryItem;
  team_members?: { id: string; name: string; avatar_url: string | null };
}

interface InventoryRequest {
  id: string; requested_by: string | null; team_member_id: string | null;
  item_name: string; description: string | null; quantity: number;
  url: string | null; image_url: string | null; status: string;
  priority: string; notes: string | null; created_at: string;
  team_members?: { id: string; name: string };
}

const categoryTabs = [
  { value: "rouleaux", label: "Rouleaux", icon: Package },
  { value: "pinceaux", label: "Pinceaux", icon: Paintbrush },
  { value: "outils_electriques", label: "Outils électriques", icon: Wrench },
  { value: "equipement_peinture", label: "Équipement peinture", icon: Package },
  { value: "epi", label: "Équipement protection individuelle", icon: HardHat },
  { value: "tape", label: "Tape", icon: Package },
  { value: "eponges", label: "Éponges", icon: Package },
  { value: "platrage", label: "Plâtrage", icon: Package },
  { value: "materiel_peinture", label: "Matériel peinture", icon: Package },
  { value: "peinture_stock", label: "Peinture en stock", icon: Paintbrush },
];

const categoryLabels: Record<string, string> = {};
categoryTabs.forEach(t => { categoryLabels[t.value] = t.label; });

const Inventory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canModify } = useCanModify();
  const { isAdmin } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("peinture");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [uploading, setUploading] = useState(false);

  // Material assignment
  const [matDialogOpen, setMatDialogOpen] = useState(false);
  const [matProjectId, setMatProjectId] = useState("");
  const [matItemId, setMatItemId] = useState("");
  const [matQtyNeeded, setMatQtyNeeded] = useState("");
  const [matNotes, setMatNotes] = useState("");

  // Tool assignment
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [toolItemId, setToolItemId] = useState("");
  const [toolMemberId, setToolMemberId] = useState("");
  const [toolNotes, setToolNotes] = useState("");

  // Request
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqQty, setReqQty] = useState("1");
  const [reqUrl, setReqUrl] = useState("");
  const [reqImageUrl, setReqImageUrl] = useState("");
  const [reqPriority, setReqPriority] = useState("normal");
  const [reqMemberId, setReqMemberId] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("peinture");
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [color, setColor] = useState<string>("#ffffff");
  const [colorName, setColorName] = useState<string>("");
  const [unit, setUnit] = useState("unité");
  const [unitCost, setUnitCost] = useState("");
  const [minStock, setMinStock] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tdsUrl, setTdsUrl] = useState("");
  const [sdsUrl, setSdsUrl] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [finish, setFinish] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_items").select("*").order("name");
      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, client_name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team_members_list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("team_members_public").select("id, name, avatar_url").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: projectMaterials = [] } = useQuery({
    queryKey: ["project_materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_materials")
        .select("*, inventory_items(*), projects(id, name, client_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectMaterial[];
    },
  });

  const { data: toolAssignments = [] } = useQuery({
    queryKey: ["tool_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_assignments")
        .select("*, inventory_items(*), team_members(id, name, avatar_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ToolAssignment[];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["inventory_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_requests")
        .select("*, team_members(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InventoryRequest[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name, description: description || null, category, brand: brand || null,
        sku: sku || null, quantity: parseFloat(quantity) || 0, unit,
        unit_cost: parseFloat(unitCost) || 0, min_stock: parseFloat(minStock) || 0,
        image_url: imageUrl, tds_url: tdsUrl || null, sds_url: sdsUrl || null,
        supplier_price: parseFloat(supplierPrice) || 0, supplier: supplier || null,
        color: color || null, finish: finish || null,
        selling_price: parseFloat(sellingPrice) || 0,
      };
      if (editing) {
        const { error } = await supabase.from("inventory_items").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_items").insert([{ ...payload, created_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast({ title: editing ? "Produit modifié" : "Produit ajouté" });
      closeForm();
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast({ title: "Produit supprimé" }); setDeleteId(null);
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_materials").insert([{
        project_id: matProjectId, inventory_item_id: matItemId,
        quantity_needed: parseFloat(matQtyNeeded) || 0, notes: matNotes || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_materials"] });
      toast({ title: "Matériel assigné au chantier" });
      setMatDialogOpen(false); setMatProjectId(""); setMatItemId(""); setMatQtyNeeded(""); setMatNotes("");
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const toolAssignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tool_assignments").insert([{
        inventory_item_id: toolItemId, team_member_id: toolMemberId,
        notes: toolNotes || null, created_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool_assignments"] });
      toast({ title: "Outil assigné à l'employé" });
      setToolDialogOpen(false); setToolItemId(""); setToolMemberId(""); setToolNotes("");
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const toolReturnMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tool_assignments").update({
        status: "returned", returned_date: new Date().toISOString().split("T")[0],
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool_assignments"] });
      toast({ title: "Outil marqué comme retourné" });
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inventory_requests").insert([{
        item_name: reqName, description: reqDesc || null,
        quantity: parseFloat(reqQty) || 1, url: reqUrl || null,
        image_url: reqImageUrl || null, priority: reqPriority,
        team_member_id: reqMemberId || null, requested_by: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_requests"] });
      toast({ title: "Demande soumise" });
      setReqDialogOpen(false); setReqName(""); setReqDesc(""); setReqQty("1");
      setReqUrl(""); setReqImageUrl(""); setReqPriority("normal"); setReqMemberId("");
    },
    onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("inventory_requests").update({
        status, resolved_at: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_requests"] });
      toast({ title: "Statut mis à jour" });
    },
  });

  const closeForm = () => {
    setFormOpen(false); setEditing(null);
    setName(""); setDescription(""); setCategory("peinture"); setBrand(""); setSku("");
    setQuantity(""); setUnit("unité"); setUnitCost(""); setMinStock(""); setImageUrl(null);
    setTdsUrl(""); setSdsUrl(""); setSupplierPrice(""); setSupplier(""); setColor(""); setFinish("");
    setSellingPrice("");
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item); setName(item.name); setDescription(item.description || "");
    setCategory(item.category); setBrand(item.brand || ""); setSku(item.sku || "");
    setQuantity(String(item.quantity)); setUnit(item.unit);
    setUnitCost(String(item.unit_cost)); setMinStock(String(item.min_stock));
    setImageUrl(item.image_url); setTdsUrl(item.tds_url || ""); setSdsUrl(item.sds_url || "");
    setSupplierPrice(String(item.supplier_price || "")); setSupplier(item.supplier || "");
    setColor(item.color || ""); setFinish(item.finish || "");
    setSellingPrice(String(item.selling_price || ""));
    setFormOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format invalide", variant: "destructive" }); return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `product-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("inventory-images").upload(fileName, file, { upsert: true });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("inventory-images").getPublicUrl(fileName);
    setImageUrl(urlData.publicUrl);
    setUploading(false);
  };

  // Get unique suppliers for the current category tab
  const suppliersInTab = [...new Set(items.filter(i => i.category === activeTab).map(i => i.supplier).filter(Boolean))] as string[];
  const brandsInTab = [...new Set(items.filter(i => i.category === activeTab).map(i => i.brand).filter(Boolean))] as string[];

  const filtered = items
    .filter((i) => i.category === activeTab)
    .filter((i) => supplierFilter === "all" || i.supplier === supplierFilter)
    .filter((i) => brandFilter === "all" || i.brand === brandFilter)
    .filter((i) => search === "" || i.name.toLowerCase().includes(search.toLowerCase()) || (i.brand && i.brand.toLowerCase().includes(search.toLowerCase())));

  const lowStockCount = items.filter((i) => i.min_stock > 0 && i.quantity <= i.min_stock).length;
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const tools = items.filter(i => i.category === "outils");
  const pendingRequests = requests.filter(r => r.status === "pending").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" /> Inventaire
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gestion des stocks, outils et matériaux</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setReqDialogOpen(true)}>
              <ShoppingCart className="h-4 w-4 mr-1" /> Demande
              {pendingRequests > 0 && <Badge className="ml-1 h-5 px-1.5 bg-warning text-warning-foreground">{pendingRequests}</Badge>}
            </Button>
            {isAdmin === true && (
              <>
                <Button variant="outline" size="sm" onClick={() => setToolDialogOpen(true)}>
                  <UserCheck className="h-4 w-4 mr-1" /> Prêter un outil
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMatDialogOpen(true)}>
                  <HardHat className="h-4 w-4 mr-1" /> Assigner au chantier
                </Button>
                <Button variant="gold" size="sm" onClick={() => { closeForm(); setCategory(activeTab); setFormOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Nouveau produit
                </Button>
              </>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-border/50"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total produits</p>
            <p className="text-2xl font-bold text-foreground">{items.length}</p>
          </CardContent></Card>
          {isAdmin === true && (
            <Card className="border-border/50"><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Valeur stock</p>
              <p className="text-2xl font-bold text-foreground">{fmt(totalValue)}</p>
            </CardContent></Card>
          )}
          <Card className="border-border/50"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">{lowStockCount > 0 && <AlertTriangle className="h-3 w-3 text-warning" />} Stock bas</p>
            <p className={cn("text-2xl font-bold", lowStockCount > 0 ? "text-warning" : "text-foreground")}>{lowStockCount}</p>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outils prêtés</p>
            <p className="text-2xl font-bold text-primary">{toolAssignments.filter(a => a.status === "assigned").length}</p>
          </CardContent></Card>
          <Card className="border-border/50"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Demandes en attente</p>
            <p className={cn("text-2xl font-bold", pendingRequests > 0 ? "text-warning" : "text-foreground")}>{pendingRequests}</p>
          </CardContent></Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="peinture" value={activeTab} onValueChange={(v) => { setActiveTab(v); setSupplierFilter("all"); setBrandFilter("all"); }}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {categoryTabs.map(tab => {
              const count = items.filter(i => i.category === tab.value).length;
              const TabIcon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
                  <TabIcon className="h-3.5 w-3.5" />
                  {tab.label}
                  {count > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{count}</Badge>}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="chantiers" className="flex items-center gap-1.5">
              <HardHat className="h-3.5 w-3.5" /> Par chantier
            </TabsTrigger>
            <TabsTrigger value="outils-prets" className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" /> Outils prêtés
              {toolAssignments.filter(a => a.status === "assigned").length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{toolAssignments.filter(a => a.status === "assigned").length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="demandes" className="flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" /> Demandes
              {pendingRequests > 0 && <Badge className="ml-1 h-5 px-1.5 bg-warning text-warning-foreground text-xs">{pendingRequests}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="comparaison" className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Comparaison prix
            </TabsTrigger>
          </TabsList>

          {/* Category inventory tabs */}
          {categoryTabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-4">
              <div className="flex gap-3 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
                </div>
                {suppliersInTab.length > 1 && (
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Tous les fournisseurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les fournisseurs</SelectItem>
                      {suppliersInTab.sort().map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {brandsInTab.length > 1 && (
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Toutes les marques" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les marques</SelectItem>
                      {brandsInTab.sort().map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : filtered.length === 0 ? (
                <Card className="border-border/50"><CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Aucun produit dans cette catégorie</p>
                  {isAdmin === true && (
                    <Button variant="gold" size="sm" className="mt-4" onClick={() => { closeForm(); setCategory(tab.value); setFormOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter un produit
                    </Button>
                  )}
                </CardContent></Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((item) => {
                    const isLow = item.min_stock > 0 && item.quantity <= item.min_stock;
                    return (
                      <Card key={item.id} className={cn("border-border/50 hover:border-primary/30 transition-colors", isLow && "border-warning/50")}>
                        <CardContent className="p-0">
                          <div className="relative h-40 bg-secondary/30 rounded-t-lg overflow-hidden">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-contain bg-white p-2" />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Image className="h-10 w-10 text-muted-foreground/30" />
                              </div>
                            )}
                            {isLow && (
                              <Badge className="absolute top-2 right-2 bg-warning/90 text-warning-foreground text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Stock bas
                              </Badge>
                            )}
                          </div>

                          <div className="p-4 space-y-2">
                            <div>
                              <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                              {item.brand && <p className="text-xs text-muted-foreground">{item.brand}{item.sku ? ` • ${item.sku}` : ""}</p>}
                              {(item.color || item.finish) && (
                                <p className="text-xs text-muted-foreground">
                                  {item.color && `Couleur: ${item.color}`}{item.color && item.finish && " • "}{item.finish && `Fini: ${item.finish}`}
                                </p>
                              )}
                              {item.supplier && <p className="text-xs text-muted-foreground">Fournisseur: {item.supplier}</p>}
                            </div>
                            {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                            <div className="flex items-center justify-between text-sm">
                              <span className={cn("font-medium", isLow ? "text-warning" : "text-foreground")}>
                                {item.quantity} {item.unit}
                              </span>
                              {isAdmin === true && <span className="text-muted-foreground">{fmt(item.unit_cost)} / {item.unit}</span>}
                            </div>
                            {isAdmin === true && (
                              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                                {item.supplier_price > 0 && (
                                  <p className="text-muted-foreground">Prix fournisseur: {fmt(item.supplier_price)}</p>
                                )}
                                <p className="text-muted-foreground">Avec taxes: {fmt(item.unit_cost * 1.14975)}</p>
                                {item.selling_price > 0 && (
                                  <p className="text-foreground font-medium">Prix client: {fmt(item.selling_price)}</p>
                                )}
                                {item.selling_price > 0 && (
                                  <p className="text-muted-foreground">Client + taxes: {fmt(item.selling_price * 1.14975)}</p>
                                )}
                              </div>
                            )}

                            {/* TDS / SDS links */}
                            {(item.tds_url || item.sds_url) && (
                              <div className="flex gap-2 pt-1">
                                {item.tds_url && (
                                  <a href={item.tds_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                    <FileText className="h-3 w-3" /> Fiche technique
                                  </a>
                                )}
                                {item.sds_url && (
                                  <a href={item.sds_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                    <FileText className="h-3 w-3" /> Fiche signalétique
                                  </a>
                                )}
                              </div>
                            )}

                            {isAdmin === true && canModify(item.created_by) && (
                              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                                  <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}

          {/* Chantiers tab */}
          <TabsContent value="chantiers" className="space-y-4">
            {projectMaterials.length === 0 ? (
              <Card className="border-border/50"><CardContent className="py-12 text-center">
                <HardHat className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Aucun matériel assigné aux chantiers</p>
                <Button variant="gold" size="sm" className="mt-4" onClick={() => setMatDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Assigner du matériel
                </Button>
              </CardContent></Card>
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Projet</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Produit</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Qté nécessaire</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Qté utilisée</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectMaterials.map((pm) => (
                        <tr key={pm.id} className="border-b border-border/50 hover:bg-accent/30">
                          <td className="py-2.5 px-4">
                            <p className="font-medium text-foreground">{pm.projects?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{pm.projects?.client_name}</p>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              {pm.inventory_items?.image_url && (
                                <img src={pm.inventory_items.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                              )}
                              <span className="text-foreground">{pm.inventory_items?.name || "—"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">{pm.quantity_needed} {pm.inventory_items?.unit}</td>
                          <td className="py-2.5 px-4 text-right">{pm.quantity_used} {pm.inventory_items?.unit}</td>
                          <td className="py-2.5 px-4 text-muted-foreground text-xs">{pm.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tool assignments tab */}
          <TabsContent value="outils-prets" className="space-y-4">
            {toolAssignments.length === 0 ? (
              <Card className="border-border/50"><CardContent className="py-12 text-center">
                <Wrench className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Aucun outil prêté</p>
                <Button variant="gold" size="sm" className="mt-4" onClick={() => setToolDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Prêter un outil
                </Button>
              </CardContent></Card>
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Outil</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Employé</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date prêt</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Statut</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Notes</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toolAssignments.map((ta) => (
                        <tr key={ta.id} className="border-b border-border/50 hover:bg-accent/30">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              {ta.inventory_items?.image_url && (
                                <img src={ta.inventory_items.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                              )}
                              <span className="font-medium text-foreground">{ta.inventory_items?.name || "—"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              {ta.team_members?.avatar_url && (
                                <img src={ta.team_members.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                              )}
                              <span className="text-foreground">{ta.team_members?.name || "—"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">{ta.assigned_date}</td>
                          <td className="py-2.5 px-4">
                            <Badge variant={ta.status === "assigned" ? "default" : "secondary"}>
                              {ta.status === "assigned" ? "Prêté" : "Retourné"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground text-xs">{ta.notes || "—"}</td>
                          <td className="py-2.5 px-4 text-right">
                            {ta.status === "assigned" && (
                              <Button variant="outline" size="sm" onClick={() => toolReturnMutation.mutate(ta.id)}>
                                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Retourné
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Requests tab */}
          <TabsContent value="demandes" className="space-y-4">
            {requests.length === 0 ? (
              <Card className="border-border/50"><CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Aucune demande</p>
                <Button variant="gold" size="sm" className="mt-4" onClick={() => setReqDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Nouvelle demande
                </Button>
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {requests.map((req) => (
                  <Card key={req.id} className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{req.item_name}</h3>
                          {req.team_members?.name && <p className="text-xs text-muted-foreground">Demandé par: {req.team_members.name}</p>}
                          <p className="text-xs text-muted-foreground">Qté: {req.quantity}</p>
                        </div>
                        <Badge variant={req.status === "pending" ? "default" : req.status === "approved" ? "secondary" : "destructive"}>
                          {req.status === "pending" ? "En attente" : req.status === "approved" ? "Approuvée" : "Refusée"}
                        </Badge>
                      </div>
                      {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
                      {req.url && (
                        <a href={req.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Link className="h-3 w-3" /> Voir le lien
                        </a>
                      )}
                      {req.image_url && (
                        <img src={req.image_url} alt={req.item_name} className="h-24 rounded-lg object-contain bg-secondary/30 w-full" />
                      )}
                      {req.status === "pending" && (
                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => updateRequestStatus.mutate({ id: req.id, status: "approved" })}>
                            ✓ Approuver
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => updateRequestStatus.mutate({ id: req.id, status: "rejected" })}>
                            ✕ Refuser
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Comparison tab */}
          <TabsContent value="comparaison" className="space-y-4">
            <SupplierComparison items={items} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Form */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
            <DialogDescription>{editing ? "Modifiez les informations" : "Ajoutez un produit à l'inventaire"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 mt-2">
            {/* Image */}
            <div className="space-y-2">
              <Label>Photo du produit</Label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="relative group">
                    <img src={imageUrl} alt="Produit" className="h-20 w-20 rounded-lg object-contain border border-border bg-white p-1" />
                    <button type="button" onClick={() => setImageUrl(null)} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">✕</button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                    <Image className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                    {uploading ? "Téléchargement..." : "Choisir une photo"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Nom *</Label>
              <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Peinture latex blanc" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryTabs.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-brand">Marque</Label>
                <Input id="inv-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Benjamin Moore" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-color">Couleur</Label>
                <Input id="inv-color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="OC-17 White Dove" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-finish">Fini</Label>
                <Select value={finish} onValueChange={setFinish}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun</SelectItem>
                    <SelectItem value="mat">Mat</SelectItem>
                    <SelectItem value="velours">Velours</SelectItem>
                    <SelectItem value="coquille-oeuf">Coquille d'œuf</SelectItem>
                    <SelectItem value="perle">Perlé</SelectItem>
                    <SelectItem value="satin">Satin</SelectItem>
                    <SelectItem value="semi-lustre">Semi-lustre</SelectItem>
                    <SelectItem value="lustre">Lustre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-desc">Description</Label>
              <Textarea id="inv-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Détails, usage..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-qty">Quantité</Label>
                <Input id="inv-qty" type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" disabled={!isAdminOrManager} className={!isAdminOrManager ? "opacity-50 cursor-not-allowed" : ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-unit">Unité</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unité">Unité</SelectItem>
                    <SelectItem value="gallon">Gallon</SelectItem>
                    <SelectItem value="litre">Litre</SelectItem>
                    <SelectItem value="rouleau">Rouleau</SelectItem>
                    <SelectItem value="boîte">Boîte</SelectItem>
                    <SelectItem value="pi²">Pi²</SelectItem>
                    <SelectItem value="paquet">Paquet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-min">Min stock</Label>
                <Input id="inv-min" type="number" min="0" step="1" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="5" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-cost">Coût unitaire ($)</Label>
                <Input id="inv-cost" type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="45.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-supplier-price">Prix fournisseur ($)</Label>
                <Input id="inv-supplier-price" type="number" min="0" step="0.01" value={supplierPrice} onChange={(e) => setSupplierPrice(e.target.value)} placeholder="38.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-selling-price">Prix de vente client ($)</Label>
                <Input id="inv-selling-price" type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="65.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-sku">SKU / Code</Label>
                <Input id="inv-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="BM-OC-17" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-supplier">Fournisseur</Label>
                <Input id="inv-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Sherwin-Williams" />
              </div>
            </div>

            {/* TDS / SDS */}
            <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><FileText className="h-4 w-4" /> Fiches techniques</p>
              <div className="space-y-1.5">
                <Label htmlFor="inv-tds">Fiche technique (TDS) — URL</Label>
                <Input id="inv-tds" value={tdsUrl} onChange={(e) => setTdsUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-sds">Fiche signalétique (SDS) — URL</Label>
                <Input id="inv-sds" value={sdsUrl} onChange={(e) => setSdsUrl(e.target.value)} placeholder="https://..." />
              </div>
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

      {/* Assign Material Dialog */}
      <Dialog open={matDialogOpen} onOpenChange={(o) => { if (!o) setMatDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assigner du matériel au chantier</DialogTitle>
            <DialogDescription>Sélectionnez le projet et le produit à assigner</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(); }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Projet *</Label>
              <Select value={matProjectId} onValueChange={setMatProjectId}>
                <SelectTrigger><SelectValue placeholder="Choisir un projet" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.client_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Produit *</Label>
              <Select value={matItemId} onValueChange={setMatItemId}>
                <SelectTrigger><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}{i.brand ? ` (${i.brand})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-qty">Quantité nécessaire</Label>
              <Input id="mat-qty" type="number" min="0" step="1" value={matQtyNeeded} onChange={(e) => setMatQtyNeeded(e.target.value)} placeholder="10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-notes">Notes</Label>
              <Input id="mat-notes" value={matNotes} onChange={(e) => setMatNotes(e.target.value)} placeholder="Couleur spécifique, finition..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setMatDialogOpen(false)}>Annuler</Button>
              <Button type="submit" variant="gold" disabled={assignMutation.isPending || !matProjectId || !matItemId}>
                {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Assigner
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tool Assignment Dialog */}
      <Dialog open={toolDialogOpen} onOpenChange={(o) => { if (!o) setToolDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prêter un outil à un employé</DialogTitle>
            <DialogDescription>Sélectionnez l'outil et l'employé</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); toolAssignMutation.mutate(); }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Outil *</Label>
              <Select value={toolItemId} onValueChange={setToolItemId}>
                <SelectTrigger><SelectValue placeholder="Choisir un outil" /></SelectTrigger>
                <SelectContent>
                  {tools.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.brand ? ` (${t.brand})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employé *</Label>
              <Select value={toolMemberId} onValueChange={setToolMemberId}>
                <SelectTrigger><SelectValue placeholder="Choisir un employé" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tool-notes">Notes</Label>
              <Input id="tool-notes" value={toolNotes} onChange={(e) => setToolNotes(e.target.value)} placeholder="Détails du prêt..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setToolDialogOpen(false)}>Annuler</Button>
              <Button type="submit" variant="gold" disabled={toolAssignMutation.isPending || !toolItemId || !toolMemberId}>
                {toolAssignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Prêter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Dialog */}
      <Dialog open={reqDialogOpen} onOpenChange={(o) => { if (!o) setReqDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Demande de matériel</DialogTitle>
            <DialogDescription>Un employé peut demander un produit spécifique</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); requestMutation.mutate(); }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Demandé par</Label>
              <Select value={reqMemberId} onValueChange={setReqMemberId}>
                <SelectTrigger><SelectValue placeholder="Employé (optionnel)" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-name">Nom du produit *</Label>
              <Input id="req-name" value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="Rouleau 18 pouces..." required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-desc">Description</Label>
              <Textarea id="req-desc" value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} rows={2} placeholder="Détails..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="req-qty">Quantité</Label>
                <Input id="req-qty" type="number" min="1" value={reqQty} onChange={(e) => setReqQty(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={reqPriority} onValueChange={setReqPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-url">Lien web (optionnel)</Label>
              <Input id="req-url" value={reqUrl} onChange={(e) => setReqUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-img">URL de l'image (optionnel)</Label>
              <Input id="req-img" value={reqImageUrl} onChange={(e) => setReqImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReqDialogOpen(false)}>Annuler</Button>
              <Button type="submit" variant="gold" disabled={requestMutation.isPending || !reqName}>
                {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Soumettre
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Inventory;
