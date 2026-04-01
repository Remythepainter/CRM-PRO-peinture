import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Kanban, FileText, Calendar, Clock,
  BarChart3, UserCog, Settings, Briefcase, RefreshCw, LogOut, Package,
  CheckSquare, Activity, FolderOpen, UserCheck, MapPin,
  ChevronLeft, ChevronRight, Paintbrush, Eye, Type, ShieldCheck, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useViewAs } from "@/hooks/useViewAs";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

const allNavItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/", section: "dashboard", access: "all" as const },
  { icon: Users, label: "Prospects", path: "/leads", section: "leads", access: "manager" as const },
  { icon: UserCheck, label: "Clients", path: "/clients", section: "clients", access: "manager" as const },
  { icon: Kanban, label: "Pipeline", path: "/pipeline", section: "pipeline", access: "manager" as const },
  { icon: FileText, label: "Soumissions", path: "/quotes", section: "quotes", access: "manager" as const },
  { icon: RefreshCw, label: "Suivis", path: "/followups", section: "followups", access: "manager" as const },
  { icon: CheckSquare, label: "Tâches", path: "/tasks", section: "tasks", access: "all" as const },
  { icon: Calendar, label: "Calendrier", path: "/schedule", section: "schedule", access: "all" as const },
  { icon: Briefcase, label: "Projets", path: "/projects", section: "projects", access: "all" as const },
  { icon: Clock, label: "Feuilles de temps", path: "/timesheets", section: "timesheets", access: "all" as const },
  { icon: MapPin, label: "Pointage GPS", path: "/punch", section: "punch", access: "all" as const },
  { icon: FolderOpen, label: "Documents", path: "/documents", section: "documents", access: "all" as const },
  { icon: Paintbrush, label: "Simulateur Couleurs", path: "/visualizer", section: "visualizer", access: "all" as const },
  { icon: Package, label: "Inventaire", path: "/inventory", section: "inventory", access: "all" as const },
  { icon: BarChart3, label: "Rentabilité", path: "/profitability", section: "profitability", access: "manager" as const },
  { icon: UserCog, label: "Équipe", path: "/team", section: "team", access: "all" as const },
  { icon: Activity, label: "Activité", path: "/activity", section: "activity", access: "manager" as const },
  { icon: Settings, label: "Paramètres", path: "/settings", section: "settings", access: "admin" as const },
];

interface AppSidebarProps {
  onNavigate?: () => void;
  forceExpanded?: boolean;
}

const AppSidebar = ({ onNavigate, forceExpanded }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, isAdminOrManager, role, isRealAdmin, isImpersonating } = useUserRole();
  const { viewAsRole, setViewAsRole } = useViewAs();
  const { activeTheme } = useThemeSettings();
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  const isExpanded = forceExpanded || !collapsed;

  const navItems = allNavItems
    .filter((item) => activeTheme.visibleSections.includes(item.section))
    .filter((item) => {
      if (item.access === "all") return true;
      if (item.access === "manager") return isAdminOrManager;
      if (item.access === "admin") return isAdmin;
      return false;
    });

  const toggleHighContrast = () => {
    setHighContrast(!highContrast);
    document.documentElement.classList.toggle("high-contrast");
  };

  const toggleLargeText = () => {
    setLargeText(!largeText);
    document.documentElement.classList.toggle("large-text");
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-all duration-300",
      isExpanded ? "w-64" : "w-16",
      forceExpanded && "relative"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <Paintbrush className="w-5 h-5 text-primary-foreground" />
        </div>
        {isExpanded && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-foreground truncate">Peinture Rémy</h1>
            <p className="text-xs text-muted-foreground truncate">Ouellette</p>
          </div>
        )}
      </div>

      {/* Search & Notifications (expanded only) */}
      {isExpanded && (
        <div className="px-3 py-2 border-b border-sidebar-border space-y-2">
          <GlobalSearch />
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Notifications</span>
            <NotificationBell />
          </div>
        </div>
      )}

      {/* View-as switcher (admin only) */}
      {isRealAdmin && isExpanded && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Voir en tant que
          </p>
          <div className="flex rounded-lg border border-border/50 overflow-hidden bg-background/50">
            {([null, "manager", "employee"] as (AppRole | null)[]).map((r) => {
              const label = r === null ? "Admin" : r === "manager" ? "Gest." : "Empl.";
              const isActive = viewAsRole === r;
              return (
                <button
                  key={r ?? "admin"}
                  onClick={() => setViewAsRole(r)}
                  className={cn(
                    "flex-1 text-xs py-1.5 font-medium transition-all",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {isImpersonating && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Mode aperçu actif
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-target",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={!isExpanded ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Accessibility & User section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {/* Accessibility toggles */}
        <div className={cn("flex gap-1", !isExpanded && "flex-col")}>
          <button
            onClick={toggleHighContrast}
            className={cn(
              "flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors touch-target",
              highContrast ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
            title="Contraste élevé"
          >
            <Eye className="w-4 h-4" />
            {isExpanded && <span>Contraste</span>}
          </button>
          <button
            onClick={toggleLargeText}
            className={cn(
              "flex items-center justify-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors touch-target",
              largeText ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
            title="Grand texte"
          >
            <Type className="w-4 h-4" />
            {isExpanded && <span>Texte</span>}
          </button>
        </div>

        {/* Current user */}
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-lg bg-sidebar-accent",
          !isExpanded && "justify-center"
        )}>
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-foreground">
              {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Utilisateur"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
          {isExpanded && (
            <button onClick={signOut} className="text-sidebar-foreground hover:text-foreground transition-colors" title="Déconnexion">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle - hidden on mobile */}
      {!forceExpanded && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-secondary border border-border items-center justify-center hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}
    </aside>
  );
};

export default AppSidebar;
