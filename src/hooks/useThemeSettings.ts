import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface ThemeSettings {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  sidebarColor: string;
  fontSize: "sm" | "base" | "lg" | "xl";
  visibleSections: string[];
  mode: "dark" | "light";
  brightness: number; // 0-100, default 50
  borderRadius: "none" | "sm" | "md" | "lg" | "pill";
  soundsEnabled: boolean;
}

export const defaultTheme: ThemeSettings = {
  primaryColor: "#c49a2a",
  accentColor: "#c49a2a",
  backgroundColor: "#141821",
  cardColor: "#1a1e28",
  sidebarColor: "#171b24",
  fontSize: "base",
  visibleSections: [
    "dashboard", "leads", "clients", "pipeline", "quotes", "followups",
    "tasks", "schedule", "projects", "timesheets", "punch", "documents", "visualizer", "inventory",
    "profitability", "team", "activity", "settings",
  ],
  mode: "dark",
  brightness: 50,
  borderRadius: "md",
  soundsEnabled: true,
};

const fontSizeMap: Record<string, string> = {
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "20px",
};

const radiusMap: Record<string, string> = {
  none: "0px",
  sm: "0.375rem",
  md: "0.625rem",
  lg: "1rem",
  pill: "9999px",
};

// Light mode default colors
const lightDefaults = {
  backgroundColor: "#f5f5f0",
  cardColor: "#ffffff",
  sidebarColor: "#fafaf7",
};

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function lighten(hex: string, amount: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, r + amount); g = Math.min(255, g + amount); b = Math.min(255, b + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darken(hex: string, amount: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, r - amount); g = Math.max(0, g - amount); b = Math.max(0, b - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function adjustBrightness(hex: string, brightness: number): string {
  // brightness 50 = no change, 0 = darker, 100 = lighter
  const delta = Math.round((brightness - 50) * 1.2);
  if (delta > 0) return lighten(hex, delta);
  if (delta < 0) return darken(hex, Math.abs(delta));
  return hex;
}

export function applyTheme(settings: ThemeSettings) {
  const root = document.documentElement;
  const isLight = settings.mode === "light";

  const bg = adjustBrightness(isLight ? lightDefaults.backgroundColor : settings.backgroundColor, settings.brightness);
  const card = adjustBrightness(isLight ? lightDefaults.cardColor : settings.cardColor, settings.brightness);
  const sb = adjustBrightness(isLight ? lightDefaults.sidebarColor : settings.sidebarColor, settings.brightness);

  const p = hexToHsl(settings.primaryColor);
  const bgHsl = hexToHsl(bg);
  const cardHsl = hexToHsl(card);
  const sbHsl = hexToHsl(sb);

  root.style.setProperty("--primary", p);
  root.style.setProperty("--ring", p);
  root.style.setProperty("--gold", p);
  root.style.setProperty("--gold-light", hexToHsl(lighten(settings.primaryColor, 30)));
  root.style.setProperty("--gold-dark", hexToHsl(darken(settings.primaryColor, 30)));
  root.style.setProperty("--background", bgHsl);
  root.style.setProperty("--card", cardHsl);
  root.style.setProperty("--popover", cardHsl);
  root.style.setProperty("--sidebar-background", sbHsl);
  root.style.setProperty("--sidebar-primary", p);
  root.style.setProperty("--sidebar-ring", p);

  if (isLight) {
    root.style.setProperty("--foreground", "220 20% 10%");
    root.style.setProperty("--card-foreground", "220 20% 10%");
    root.style.setProperty("--popover-foreground", "220 20% 10%");
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--secondary", hexToHsl(darken(bg, 10)));
    root.style.setProperty("--secondary-foreground", "220 15% 25%");
    root.style.setProperty("--muted", hexToHsl(darken(bg, 8)));
    root.style.setProperty("--muted-foreground", "220 10% 45%");
    root.style.setProperty("--accent", hexToHsl(darken(bg, 12)));
    root.style.setProperty("--accent-foreground", "220 20% 10%");
    root.style.setProperty("--border", hexToHsl(darken(bg, 18)));
    root.style.setProperty("--input", hexToHsl(darken(bg, 18)));
    root.style.setProperty("--sidebar-foreground", "220 15% 35%");
    root.style.setProperty("--sidebar-border", hexToHsl(darken(sb, 15)));
    root.style.setProperty("--sidebar-accent", hexToHsl(darken(sb, 8)));
    root.style.setProperty("--sidebar-accent-foreground", "220 20% 10%");
  } else {
    root.style.setProperty("--foreground", "45 20% 95%");
    root.style.setProperty("--card-foreground", "45 20% 95%");
    root.style.setProperty("--popover-foreground", "45 20% 95%");
    root.style.setProperty("--primary-foreground", "220 20% 8%");
    root.style.setProperty("--secondary", hexToHsl(lighten(bg, 20)));
    root.style.setProperty("--secondary-foreground", "45 15% 85%");
    root.style.setProperty("--muted", hexToHsl(lighten(bg, 15)));
    root.style.setProperty("--muted-foreground", "220 10% 55%");
    root.style.setProperty("--accent", hexToHsl(lighten(bg, 25)));
    root.style.setProperty("--accent-foreground", "220 20% 8%");
    root.style.setProperty("--border", hexToHsl(lighten(bg, 25)));
    root.style.setProperty("--input", hexToHsl(lighten(bg, 25)));
    root.style.setProperty("--sidebar-foreground", "45 15% 75%");
    root.style.setProperty("--sidebar-border", hexToHsl(lighten(sb, 15)));
    root.style.setProperty("--sidebar-accent", hexToHsl(lighten(sb, 10)));
    root.style.setProperty("--sidebar-accent-foreground", "45 20% 95%");
  }

  // Border radius
  root.style.setProperty("--radius", radiusMap[settings.borderRadius] || radiusMap.md);

  // Font size
  root.style.fontSize = fontSizeMap[settings.fontSize] || "16px";

  // Sounds preference
  localStorage.setItem("theme_sounds", String(settings.soundsEnabled));
}

export function useThemeSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: globalTheme } = useQuery({
    queryKey: ["theme_global"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_theme_settings")
        .select("settings")
        .eq("is_global", true)
        .maybeSingle();
      return data?.settings as unknown as ThemeSettings | null;
    },
  });

  const { data: userTheme } = useQuery({
    queryKey: ["theme_user", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("app_theme_settings")
        .select("settings")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.settings as unknown as ThemeSettings | null;
    },
  });

  const activeTheme: ThemeSettings = {
    ...defaultTheme,
    ...(globalTheme || {}),
    ...(userTheme || {}),
  };

  useEffect(() => {
    applyTheme(activeTheme);
  }, [globalTheme, userTheme]);

  const saveGlobalTheme = useMutation({
    mutationFn: async (settings: ThemeSettings) => {
      const { data: existing } = await supabase
        .from("app_theme_settings")
        .select("id")
        .eq("is_global", true)
        .maybeSingle();
      if (existing) {
        await supabase.from("app_theme_settings").update({ settings: settings as any }).eq("id", existing.id);
      } else {
        await supabase.from("app_theme_settings").insert([{ is_global: true, user_id: null, settings: settings as any }]);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["theme_global"] }),
  });

  const saveUserTheme = useMutation({
    mutationFn: async (settings: ThemeSettings) => {
      if (!user?.id) return;
      const { data: existing } = await supabase
        .from("app_theme_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        await supabase.from("app_theme_settings").update({ settings: settings as any }).eq("id", existing.id);
      } else {
        await supabase.from("app_theme_settings").insert([{ user_id: user.id, settings: settings as any }]);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["theme_user", user?.id] }),
  });

  return { activeTheme, saveGlobalTheme, saveUserTheme, globalTheme, userTheme };
}
