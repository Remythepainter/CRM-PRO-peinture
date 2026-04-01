import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Shield, ShieldCheck, Loader2, Users, KeyRound } from "lucide-react";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "employee" | "accountant";
  created_at: string;
}

export default function UserRoleManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users_list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-user-role", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data.users as UserWithRole[];
    },
  });

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    manager: "Gestionnaire",
    accountant: "Comptable",
    employee: "Employé",
  };

  const nextRole = (current: string): string => {
    if (current === "employee") return "accountant";
    if (current === "accountant") return "manager";
    if (current === "manager") return "admin";
    return "employee";
  };

  const handleToggleRole = async (targetUserId: string, currentRole: string) => {
    setUpdatingId(targetUserId);
    const newRole = nextRole(currentRole);

    const { data, error } = await supabase.functions.invoke("manage-user-role", {
      body: { action: "update_role", targetUserId, newRole },
    });

    setUpdatingId(null);

    if (error || data?.error) {
      toast({
        title: "Erreur",
        description: data?.error || error?.message || "Impossible de modifier le rôle",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Rôle mis à jour", description: `L'utilisateur est maintenant ${roleLabels[newRole] || newRole}` });
    queryClient.invalidateQueries({ queryKey: ["admin_users_list"] });
  };

  const handleResetPassword = async (targetUserId: string) => {
    setResettingId(targetUserId);
    const { data, error } = await supabase.functions.invoke("manage-user-role", {
      body: { action: "reset_password", targetUserId },
    });
    setResettingId(null);

    if (error || data?.error) {
      toast({
        title: "Erreur",
        description: data?.error || error?.message || "Impossible d'envoyer le lien",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Lien envoyé ✓",
      description: `Un courriel de réinitialisation a été envoyé à ${data.email}`,
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-4 w-4 text-primary" /> Gestion des rôles
        </CardTitle>
        <CardDescription>Promouvoir ou rétrograder les utilisateurs (admin / employé)</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !users?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur trouvé</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const isSelf = u.id === user?.id;
              const isAdmin = u.role === "admin";

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {isAdmin ? (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.full_name || u.email}
                        {isSelf && <span className="text-xs text-muted-foreground ml-1">(vous)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={isAdmin ? "default" : "secondary"}
                      className={isAdmin ? "bg-primary/20 text-primary border-primary/30" : u.role === "manager" ? "bg-blue-500/20 text-blue-600 border-blue-500/30" : ""}
                    >
                      {roleLabels[u.role] || u.role}
                    </Badge>

                    {!isSelf && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(u.id)}
                          disabled={resettingId === u.id}
                          className="text-xs"
                          title="Réinitialiser le mot de passe"
                        >
                          {resettingId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <KeyRound className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleRole(u.id, u.role)}
                          disabled={updatingId === u.id}
                          className="text-xs"
                        >
                          {updatingId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            `→ ${roleLabels[nextRole(u.role)]}`
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
