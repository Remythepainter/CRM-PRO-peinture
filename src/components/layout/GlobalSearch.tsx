import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Users, Kanban, FileText, Briefcase, Calendar, Package, Clock, UserCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  path: string;
}

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  lead: { icon: Users, label: "Prospect", color: "text-blue-400" },
  deal: { icon: Kanban, label: "Pipeline", color: "text-emerald-400" },
  quote: { icon: FileText, label: "Soumission", color: "text-amber-400" },
  project: { icon: Briefcase, label: "Projet", color: "text-purple-400" },
  event: { icon: Calendar, label: "Événement", color: "text-rose-400" },
  inventory: { icon: Package, label: "Inventaire", color: "text-cyan-400" },
  team: { icon: UserCheck, label: "Équipe", color: "text-orange-400" },
  time: { icon: Clock, label: "Temps", color: "text-teal-400" },
};

function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const pattern = `%${q.trim()}%`;

    try {
      const [leads, deals, quotes, projects, events, inventory, team, timeEntries] = await Promise.all([
        supabase.from("leads").select("id, name, email, phone, status, address, source, notes, project_type")
          .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},address.ilike.${pattern},notes.ilike.${pattern},source.ilike.${pattern},project_type.ilike.${pattern}`).limit(5),
        supabase.from("pipeline_deals").select("id, name, stage, value, project_type")
          .or(`name.ilike.${pattern},stage.ilike.${pattern},project_type.ilike.${pattern}`).limit(5),
        supabase.from("quotes").select("id, client_name, client_email, client_phone, client_address, status, total, project_description, notes, template_type")
          .or(`client_name.ilike.${pattern},client_email.ilike.${pattern},client_phone.ilike.${pattern},client_address.ilike.${pattern},project_description.ilike.${pattern},notes.ilike.${pattern},template_type.ilike.${pattern}`).limit(5),
        supabase.from("projects").select("id, name, client_name, status, description, address")
          .or(`name.ilike.${pattern},client_name.ilike.${pattern},description.ilike.${pattern},address.ilike.${pattern}`).limit(5),
        supabase.from("schedule_events").select("id, title, description, address, event_type, status")
          .or(`title.ilike.${pattern},description.ilike.${pattern},address.ilike.${pattern}`).limit(5),
        supabase.from("inventory_items").select("id, name, description, category, brand, sku")
          .or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern},brand.ilike.${pattern},sku.ilike.${pattern}`).limit(5),
        (supabase as any).from("team_members_public").select("id, name, role")
          .or(`name.ilike.${pattern},role.ilike.${pattern}`).limit(5),
        supabase.from("time_entries").select("id, description, project_id, date")
          .ilike("description", pattern).limit(5),
      ]);

      if (controller.signal.aborted) return;

      const mapped: SearchResult[] = [
        ...(leads.data?.map((l) => ({ id: l.id, title: l.name, subtitle: [l.email, l.phone, l.status].filter(Boolean).join(" · "), type: "lead", path: "/leads" })) || []),
        ...(deals.data?.map((d) => ({ id: d.id, title: d.name, subtitle: `${d.stage} · ${Number(d.value).toLocaleString()} $`, type: "deal", path: "/pipeline" })) || []),
        ...(quotes.data?.map((q) => ({ id: q.id, title: q.client_name, subtitle: [q.status, `${Number(q.total).toLocaleString()} $`, q.project_description?.slice(0, 40)].filter(Boolean).join(" · "), type: "quote", path: "/quotes" })) || []),
        ...(projects.data?.map((p) => ({ id: p.id, title: p.name, subtitle: [p.client_name, p.status, p.address].filter(Boolean).join(" · "), type: "project", path: "/projects" })) || []),
        ...(events.data?.map((e) => ({ id: e.id, title: e.title, subtitle: [e.event_type, e.status, e.address].filter(Boolean).join(" · "), type: "event", path: "/schedule" })) || []),
        ...(inventory.data?.map((i) => ({ id: i.id, title: i.name, subtitle: [i.category, i.brand, i.sku].filter(Boolean).join(" · "), type: "inventory", path: "/inventory" })) || []),
        ...(team.data?.map((t) => ({ id: t.id, title: t.name, subtitle: [t.role, t.email, t.phone].filter(Boolean).join(" · "), type: "team", path: "/team" })) || []),
        ...(timeEntries.data?.map((te) => ({ id: te.id, title: te.description || "Entrée de temps", subtitle: te.date, type: "time", path: "/profitability" })) || []),
      ];

      setResults(mapped);
    } catch { /* aborted */ } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const reset = useCallback(() => { setQuery(""); setResults([]); }, []);

  return { query, setQuery, results, loading, reset };
}

// ── Inline mini search bar (header) ──
const GlobalSearch = () => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setPaletteOpen(true)}
        className="flex items-center gap-2 h-9 w-full max-w-md rounded-lg border border-border bg-secondary/50 px-3 text-sm text-muted-foreground hover:bg-secondary/80 transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">Rechercher…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}
    </>
  );
};

// ── Full-screen Command Palette ──
const CommandPalette = ({ onClose }: { onClose: () => void }) => {
  const { query, setQuery, results, loading, reset } = useGlobalSearch();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-result-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" />

      {/* Palette */}
      <div
        className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-border bg-popover shadow-2xl animate-in slide-in-from-top-4 fade-in duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher dans tout le CRM…"
            className="flex-1 h-12 bg-transparent text-foreground text-base placeholder:text-muted-foreground focus:outline-none"
          />
          {query ? (
            <button onClick={() => { setQuery(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">ESC</kbd>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : query.length < 2 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Tapez au moins 2 caractères pour rechercher</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {Object.entries(typeConfig).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <span key={key} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary rounded-full px-2 py-1">
                      <Icon className={cn("h-3 w-3", cfg.color)} />
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Aucun résultat pour « {query} »
            </p>
          ) : (
            <ul className="py-1">
              {results.map((result, i) => {
                const config = typeConfig[result.type] || typeConfig.lead;
                const Icon = config.icon;
                return (
                  <li key={`${result.type}-${result.id}`} data-result-item>
                    <button
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 text-left text-sm transition-colors",
                        i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                      )}
                    >
                      <div className={cn("flex items-center justify-center h-8 w-8 rounded-lg bg-secondary shrink-0")}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                        {config.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            <span>{results.length} résultat{results.length > 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <span>↑↓ naviguer</span>
              <span>↵ sélectionner</span>
              <span>esc fermer</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
