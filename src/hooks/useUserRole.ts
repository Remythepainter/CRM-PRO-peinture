import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/hooks/useViewAs";

export type AppRole = "admin" | "manager" | "employee" | "accountant";

export function useUserRole() {
  const { user } = useAuth();
  const { viewAsRole, isImpersonating } = useViewAs();

  const { data: realRole, isLoading } = useQuery({
    queryKey: ["user_role", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      return (data?.[0]?.role as AppRole) ?? "employee";
    },
  });

  const effectiveRole = (isImpersonating ? viewAsRole : realRole) ?? "employee";

  return {
    role: effectiveRole as AppRole,
    realRole: (realRole ?? "employee") as AppRole,
    isAdmin: effectiveRole === "admin",
    isManager: effectiveRole === "manager",
    isAccountant: effectiveRole === "accountant",
    isAdminOrManager: effectiveRole === "admin" || effectiveRole === "manager",
    isRealAdmin: (realRole ?? "employee") === "admin",
    isImpersonating,
    isLoading,
  };
}
