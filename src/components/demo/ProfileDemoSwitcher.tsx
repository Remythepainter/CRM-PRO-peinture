import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldCheck, UserCog, Users, Kanban, FileText, Calendar, Clock, Package, BarChart3, CheckSquare, Briefcase, MapPin, FolderOpen, Activity, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/hooks/useUserRole";

const roleConfig: Record<AppRole, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badgeClass: string;
  pages: { icon: React.ElementType; label: string }[];
}> = {
  admin: {
    label: "Administrateur",
    description: "Accès complet à toutes les fonctionnalités, gestion des utilisateurs et paramètres.",
    icon: ShieldCheck,
    color: "from-primary to-yellow-500",
    badgeClass: "bg-primary/20 text-primary border-primary/30",
    pages: [
      { icon: Users, label: "Prospects" },
      { icon: Kanban, label: "Pipeline" },
      { icon: FileText, label: "Soumissions" },
      { icon: BarChart3, label: "Rentabilité" },
      { icon: Activity, label: "Activité" },
      { icon: Settings, label: "Paramètres" },
      { icon: Calendar, label: "Calendrier" },
      { icon: Briefcase, label: "Projets" },
      { icon: Clock, label: "Feuilles de temps" },
      { icon: MapPin, label: "Pointage GPS" },
      { icon: Package, label: "Inventaire" },
      { icon: CheckSquare, label: "Tâches" },
      { icon: FolderOpen, label: "Documents" },
    ],
  },
  manager: {
    label: "Gestionnaire",
    description: "Gestion des prospects, clients, pipeline et rapports. Pas d'accès aux paramètres système.",
    icon: UserCog,
    color: "from-blue-500 to-indigo-500",
    badgeClass: "bg-blue-500/20 text-blue-600 border-blue-500/30",
    pages: [
      { icon: Users, label: "Prospects" },
      { icon: Kanban, label: "Pipeline" },
      { icon: FileText, label: "Soumissions" },
      { icon: BarChart3, label: "Rentabilité" },
      { icon: Activity, label: "Activité" },
      { icon: Calendar, label: "Calendrier" },
      { icon: Briefcase, label: "Projets" },
      { icon: Clock, label: "Feuilles de temps" },
      { icon: MapPin, label: "Pointage GPS" },
      { icon: Package, label: "Inventaire" },
      { icon: CheckSquare, label: "Tâches" },
      { icon: FolderOpen, label: "Documents" },
    ],
  },
  employee: {
    label: "Employé",
    description: "Accès aux tâches, projets, pointage et feuilles de temps. Vue limitée.",
    icon: Shield,
    color: "from-muted-foreground to-muted-foreground/70",
    badgeClass: "",
    pages: [
      { icon: Calendar, label: "Calendrier" },
      { icon: Briefcase, label: "Projets" },
      { icon: Clock, label: "Feuilles de temps" },
      { icon: MapPin, label: "Pointage GPS" },
      { icon: Package, label: "Inventaire" },
      { icon: CheckSquare, label: "Tâches" },
      { icon: FolderOpen, label: "Documents" },
    ],
  },
};

const roles: AppRole[] = ["admin", "manager", "employee"];

export default function ProfileDemoSwitcher() {
  const [activeRole, setActiveRole] = useState<AppRole>("admin");
  const config = roleConfig[activeRole];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Switcher */}
      <div className="flex rounded-xl border border-border/50 overflow-hidden bg-card">
        {roles.map((role) => {
          const rc = roleConfig[role];
          const RoleIcon = rc.icon;
          const isActive = activeRole === role;
          return (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all relative ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="demo-tab-bg"
                  className={`absolute inset-0 bg-gradient-to-r ${rc.color} opacity-15`}
                  transition={{ type: "spring", duration: 0.4 }}
                />
              )}
              <RoleIcon className="h-4 w-4 relative z-10" />
              <span className="relative z-10 hidden sm:inline">{rc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {config.label}
                    <Badge variant="secondary" className={config.badgeClass}>
                      {activeRole}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Pages accessibles ({config.pages.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {config.pages.map((page) => {
                  const PageIcon = page.icon;
                  return (
                    <div
                      key={page.label}
                      className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 text-sm"
                    >
                      <PageIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{page.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
