import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, Equal, Search, TrendingDown, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string; name: string; description: string | null; category: string; brand: string | null;
  sku: string | null; quantity: number; unit: string; unit_cost: number; min_stock: number;
  image_url: string | null; supplier: string | null; supplier_price: number;
  color: string | null; finish: string | null;
}

interface ComparisonPair {
  key: string;
  productType: string;
  finish: string;
  sw: InventoryItem | null;
  bm: InventoryItem | null;
  priceDiff: number | null; // positive = SW cheaper
  priceDiffPercent: number | null;
}

// Normalize product names to find matching pairs
function normalizeProductType(item: InventoryItem): string {
  const name = item.name.toLowerCase();
  // Extract the general product type by removing brand-specific prefixes and finish suffixes
  const finishTerms = ["mat", "matte", "satin", "semi-lustré", "lustré", "eggshell", "perle", "lowsheen", "coquille"];
  let cleaned = name;
  finishTerms.forEach(t => { cleaned = cleaned.replace(new RegExp(`\\b${t}\\b`, "gi"), "").trim(); });
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function getFinish(item: InventoryItem): string {
  if (item.finish) return item.finish;
  const name = item.name.toLowerCase();
  if (name.includes("semi-lustré") || name.includes("semi-gloss")) return "Semi-lustré";
  if (name.includes("lustré") || name.includes("gloss")) return "Lustré";
  if (name.includes("satin")) return "Satin";
  if (name.includes("mat") || name.includes("flat")) return "Mat";
  if (name.includes("eggshell") || name.includes("coquille")) return "Eggshell";
  if (name.includes("perle") || name.includes("pearl")) return "Perle";
  return "N/A";
}

// Define product line equivalents between SW and BM
const equivalentLines: { sw: string[]; bm: string[]; category: string }[] = [
  // Interior - Premium
  { sw: ["duration"], bm: ["aura", "regal select"], category: "Intérieur Premium" },
  { sw: ["emerald"], bm: ["aura"], category: "Intérieur Ultra-Premium" },
  // Interior - Mid
  { sw: ["superpaint"], bm: ["ben", "regal select"], category: "Intérieur Milieu de gamme" },
  { sw: ["opulence"], bm: ["ben"], category: "Intérieur Standard+" },
  { sw: ["promar", "solo"], bm: ["ultra spec 500", "super hide"], category: "Intérieur Économique" },
  // Exterior
  { sw: ["duration ext", "emerald ext"], bm: ["aura ext", "regal select ext"], category: "Extérieur Premium" },
  { sw: ["superpaint ext", "a100"], bm: ["ben ext", "ultra spec ext"], category: "Extérieur Standard" },
  { sw: ["latitude"], bm: ["ultra spec ext"], category: "Extérieur Économique" },
  // Trim / Cabinet
  { sw: ["emerald uréthane", "proclassic"], bm: ["advance"], category: "Boiseries / Armoires" },
  // Primers
  { sw: ["extreme bond", "preprite", "covermax"], bm: ["fresh start"], category: "Apprêts" },
  // Ceiling
  { sw: ["premium ceiling", "painters edge"], bm: ["ultra spec 500 mat (plafond)"], category: "Plafonds" },
  // Specialty
  { sw: ["précatalysé", "scuff tuff"], bm: ["précat", "autoscellant"], category: "Produits spécialisés" },
];

function findEquivalentCategory(item: InventoryItem): string | null {
  const name = item.name.toLowerCase();
  const brand = item.supplier?.toLowerCase() || item.brand?.toLowerCase() || "";
  
  for (const eq of equivalentLines) {
    const lines = brand.includes("sherwin") ? eq.sw : brand.includes("benjamin") ? eq.bm : [];
    for (const line of lines) {
      if (name.includes(line.toLowerCase())) return eq.category;
    }
  }
  return null;
}

interface SupplierComparisonProps {
  items: InventoryItem[];
}

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(n);

const SupplierComparison = ({ items }: SupplierComparisonProps) => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "diff" | "percent">("name");

  const paintItems = useMemo(() => items.filter(i => i.category === "peinture"), [items]);
  const swItems = useMemo(() => paintItems.filter(i => i.supplier === "Sherwin-Williams" || i.brand === "Sherwin-Williams"), [paintItems]);
  const bmItems = useMemo(() => paintItems.filter(i => i.supplier === "Benjamin Moore" || i.brand === "Benjamin Moore"), [paintItems]);

  // Build comparison groups by equivalent category
  const comparisons = useMemo(() => {
    const groups: Record<string, { sw: InventoryItem[]; bm: InventoryItem[] }> = {};

    swItems.forEach(item => {
      const cat = findEquivalentCategory(item);
      if (cat) {
        if (!groups[cat]) groups[cat] = { sw: [], bm: [] };
        groups[cat].sw.push(item);
      }
    });

    bmItems.forEach(item => {
      const cat = findEquivalentCategory(item);
      if (cat) {
        if (!groups[cat]) groups[cat] = { sw: [], bm: [] };
        groups[cat].bm.push(item);
      }
    });

    return groups;
  }, [swItems, bmItems]);

  const categories = useMemo(() => Object.keys(comparisons).sort(), [comparisons]);

  // Build flat comparison rows
  const rows = useMemo(() => {
    const result: { category: string; swItem: InventoryItem; bmItem: InventoryItem | null; finish: string; diff: number; diffPercent: number }[] = [];
    
    for (const [cat, group] of Object.entries(comparisons)) {
      if (categoryFilter !== "all" && cat !== categoryFilter) continue;

      for (const swItem of group.sw) {
        const swFinish = getFinish(swItem);
        // Find BM item with matching finish
        const bmMatch = group.bm.find(bm => getFinish(bm) === swFinish) || group.bm[0] || null;
        
        const swPrice = swItem.supplier_price || swItem.unit_cost;
        const bmPrice = bmMatch ? (bmMatch.supplier_price || bmMatch.unit_cost) : 0;
        const diff = bmMatch ? swPrice - bmPrice : 0;
        const diffPercent = bmMatch && bmPrice > 0 ? ((swPrice - bmPrice) / bmPrice) * 100 : 0;

        if (search && !swItem.name.toLowerCase().includes(search.toLowerCase()) && 
            !(bmMatch?.name.toLowerCase().includes(search.toLowerCase()))) continue;

        result.push({ category: cat, swItem, bmItem: bmMatch, finish: swFinish, diff, diffPercent });
      }
    }

    // Sort
    if (sortBy === "diff") result.sort((a, b) => a.diff - b.diff);
    else if (sortBy === "percent") result.sort((a, b) => a.diffPercent - b.diffPercent);
    else result.sort((a, b) => a.category.localeCompare(b.category) || a.swItem.name.localeCompare(b.swItem.name));

    return result;
  }, [comparisons, categoryFilter, search, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const withBoth = rows.filter(r => r.bmItem && (r.swItem.supplier_price || r.swItem.unit_cost) > 0 && ((r.bmItem.supplier_price || r.bmItem.unit_cost) > 0));
    const swCheaper = withBoth.filter(r => r.diff < 0).length;
    const bmCheaper = withBoth.filter(r => r.diff > 0).length;
    const avgDiff = withBoth.length > 0 ? withBoth.reduce((s, r) => s + r.diffPercent, 0) / withBoth.length : 0;
    return { total: withBoth.length, swCheaper, bmCheaper, avgDiff };
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Paires comparées</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-emerald-500" /> SW moins cher</p>
          <p className="text-2xl font-bold text-emerald-500">{stats.swCheaper}</p>
        </CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-blue-500" /> BM moins cher</p>
          <p className="text-2xl font-bold text-blue-500">{stats.bmCheaper}</p>
        </CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Écart moyen</p>
          <p className={cn("text-2xl font-bold", stats.avgDiff > 0 ? "text-destructive" : stats.avgDiff < 0 ? "text-emerald-500" : "text-foreground")}>
            {stats.avgDiff > 0 ? "+" : ""}{stats.avgDiff.toFixed(1)}%
          </p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit..." className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Par catégorie</SelectItem>
            <SelectItem value="diff">Par écart ($)</SelectItem>
            <SelectItem value="percent">Par écart (%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Comparison Table */}
      {rows.length === 0 ? (
        <Card className="border-border/50"><CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Aucune comparaison trouvée</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez des produits des deux fournisseurs avec des prix pour comparer</p>
        </CardContent></Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className="font-medium text-muted-foreground">Catégorie</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Fini</TableHead>
                  <TableHead className="font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                      Sherwin-Williams
                    </span>
                  </TableHead>
                  <TableHead className="font-medium text-right">Prix SW</TableHead>
                  <TableHead className="font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Benjamin Moore
                    </span>
                  </TableHead>
                  <TableHead className="font-medium text-right">Prix BM</TableHead>
                  <TableHead className="font-medium text-right">Écart</TableHead>
                  <TableHead className="font-medium text-center">Meilleur prix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const swPrice = row.swItem.supplier_price || row.swItem.unit_cost;
                  const bmPrice = row.bmItem ? (row.bmItem.supplier_price || row.bmItem.unit_cost) : 0;
                  const hasBoth = row.bmItem && swPrice > 0 && bmPrice > 0;
                  const swWins = hasBoth && swPrice < bmPrice;
                  const bmWins = hasBoth && bmPrice < swPrice;
                  const tie = hasBoth && swPrice === bmPrice;

                  return (
                    <TableRow key={`${row.swItem.id}-${idx}`} className="hover:bg-secondary/20">
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">{row.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.finish}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {row.swItem.image_url && (
                            <img src={row.swItem.image_url} alt="" className="w-8 h-8 rounded object-contain bg-white border border-border" />
                          )}
                          <span className="text-sm font-medium text-foreground">{row.swItem.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn("text-right font-mono text-sm", swWins && "text-emerald-500 font-semibold")}>
                        {swPrice > 0 ? fmt(swPrice) : "—"}
                      </TableCell>
                      <TableCell>
                        {row.bmItem ? (
                          <div className="flex items-center gap-2">
                            {row.bmItem.image_url && (
                              <img src={row.bmItem.image_url} alt="" className="w-8 h-8 rounded object-contain bg-white border border-border" />
                            )}
                            <span className="text-sm font-medium text-foreground">{row.bmItem.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Aucun équivalent</span>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono text-sm", bmWins && "text-emerald-500 font-semibold")}>
                        {bmPrice > 0 ? fmt(bmPrice) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasBoth ? (
                          <span className={cn("text-sm font-mono font-medium", row.diff > 0 ? "text-destructive" : row.diff < 0 ? "text-emerald-500" : "text-muted-foreground")}>
                            {row.diff > 0 ? "+" : ""}{fmt(row.diff)}
                            <span className="block text-xs text-muted-foreground">
                              ({row.diffPercent > 0 ? "+" : ""}{row.diffPercent.toFixed(1)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {swWins && (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                            <ArrowDownRight className="h-3 w-3 mr-0.5" /> SW
                          </Badge>
                        )}
                        {bmWins && (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                            <ArrowDownRight className="h-3 w-3 mr-0.5" /> BM
                          </Badge>
                        )}
                        {tie && (
                          <Badge variant="outline" className="text-xs">
                            <Equal className="h-3 w-3 mr-0.5" /> Égal
                          </Badge>
                        )}
                        {!hasBoth && <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupplierComparison;
