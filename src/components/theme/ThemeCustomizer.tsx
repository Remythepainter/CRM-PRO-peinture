import { useState, useEffect } from "react";
import { Palette, X, Save, RotateCcw, Type, Eye, EyeOff, Sun, Moon, Volume2, VolumeX, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useThemeSettings, defaultTheme, applyTheme, ThemeSettings } from "@/hooks/useThemeSettings";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useSoundFeedback } from "@/hooks/useSoundFeedback";
import { cn } from "@/lib/utils";

const sectionLabels: Record<string, string> = {
  dashboard: "Tableau de bord",
  leads: "Prospects",
  clients: "Clients",
  pipeline: "Pipeline",
  quotes: "Soumissions",
  followups: "Suivis",
  tasks: "Tâches",
  schedule: "Calendrier",
  projects: "Projets",
  timesheets: "Feuilles de temps",
  punch: "Pointage",
  documents: "Documents",
  inventory: "Inventaire",
  profitability: "Rentabilité",
  team: "Équipe",
  activity: "Activité",
  settings: "Paramètres",
};

const fontLabels: Record<string, string> = {
  sm: "Petite",
  base: "Normale",
  lg: "Grande",
  xl: "Très grande",
};

const radiusLabels: Record<string, string> = {
  none: "Carré",
  sm: "Léger",
  md: "Normal",
  lg: "Arrondi",
  pill: "Pilule",
};

const ThemeCustomizer = () => {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const { activeTheme, saveGlobalTheme, saveUserTheme } = useThemeSettings();
  const { play } = useSoundFeedback();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ThemeSettings>(activeTheme);
  const [scope, setScope] = useState<"user" | "global">("user");

  useEffect(() => {
    setDraft(activeTheme);
  }, [activeTheme.primaryColor, activeTheme.backgroundColor, activeTheme.mode]);

  const handleChange = (key: keyof ThemeSettings, value: any) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    applyTheme(next);
  };

  const toggleSection = (section: string) => {
    const next = draft.visibleSections.includes(section)
      ? draft.visibleSections.filter((s) => s !== section)
      : [...draft.visibleSections, section];
    handleChange("visibleSections", next);
  };

  const save = async () => {
    try {
      if (scope === "global" && isAdmin) {
        await saveGlobalTheme.mutateAsync(draft);
      } else {
        await saveUserTheme.mutateAsync(draft);
      }
      play("success");
      toast({ title: "Thème enregistré ✓" });
    } catch {
      play("error");
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const reset = () => {
    setDraft(defaultTheme);
    applyTheme(defaultTheme);
  };

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); play("click"); }}
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
        title="Personnaliser l'apparence"
      >
        <Palette className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 max-h-[75vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" /> Apparence
        </h3>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Scope */}
        {isAdmin && (
          <div className="space-y-1.5">
            <Label className="text-xs">Appliquer à</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as "user" | "global")}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Mon compte</SelectItem>
                <SelectItem value="global">Tous les utilisateurs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mode toggle */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mode</p>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => handleChange("mode", "dark")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all",
                draft.mode === "dark" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Moon className="h-3.5 w-3.5" /> Sombre
            </button>
            <button
              onClick={() => handleChange("mode", "light")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all",
                draft.mode === "light" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sun className="h-3.5 w-3.5" /> Clair
            </button>
          </div>
        </div>

        {/* Brightness */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Luminosité</span>
            <span className="text-primary font-mono">{draft.brightness}%</span>
          </p>
          <Slider
            value={[draft.brightness]}
            onValueChange={([v]) => handleChange("brightness", v)}
            min={10}
            max={90}
            step={5}
          />
        </div>

        {/* Colors */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Couleurs</p>
          <ColorPicker label="Couleur principale" value={draft.primaryColor} onChange={(v) => handleChange("primaryColor", v)} />
          {draft.mode === "dark" && (
            <>
              <ColorPicker label="Arrière-plan" value={draft.backgroundColor} onChange={(v) => handleChange("backgroundColor", v)} />
              <ColorPicker label="Cartes" value={draft.cardColor} onChange={(v) => handleChange("cardColor", v)} />
              <ColorPicker label="Barre latérale" value={draft.sidebarColor} onChange={(v) => handleChange("sidebarColor", v)} />
            </>
          )}
        </div>

        {/* Button shape */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Circle className="h-3 w-3" /> Forme des boutons
          </p>
          <div className="grid grid-cols-5 gap-1">
            {Object.entries(radiusLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleChange("borderRadius", key)}
                className={cn(
                  "py-1.5 text-[10px] font-medium transition-all border",
                  key === "none" && "rounded-none",
                  key === "sm" && "rounded-sm",
                  key === "md" && "rounded-md",
                  key === "lg" && "rounded-lg",
                  key === "pill" && "rounded-full",
                  draft.borderRadius === key
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Font size */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Type className="h-3 w-3" /> Taille de police
          </p>
          <Select value={draft.fontSize} onValueChange={(v) => handleChange("fontSize", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(fontLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sounds */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              {draft.soundsEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              Sons & feedback
            </p>
            <Switch
              checked={draft.soundsEnabled}
              onCheckedChange={(v) => handleChange("soundsEnabled", v)}
              className="scale-75"
            />
          </div>
        </div>

        {/* Sections visibility */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sections visibles</p>
          <div className="space-y-1.5">
            {Object.entries(sectionLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-foreground flex items-center gap-1.5">
                  {draft.visibleSections.includes(key) ? <Eye className="h-3 w-3 text-primary" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  {label}
                </span>
                <Switch
                  checked={draft.visibleSections.includes(key)}
                  onCheckedChange={() => toggleSection(key)}
                  className="scale-75"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1" onClick={reset}>
            <RotateCcw className="h-3 w-3 mr-1" /> Défaut
          </Button>
          <Button variant="gold" size="sm" className="flex-1" onClick={save}>
            <Save className="h-3 w-3 mr-1" /> Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-md border border-border overflow-hidden">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-full w-full cursor-pointer border-0 p-0"
            style={{ minWidth: "28px" }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono w-16">{value}</span>
      </div>
    </div>
  );
}

export default ThemeCustomizer;
