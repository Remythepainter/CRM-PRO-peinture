import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import Forbidden from "@/pages/Forbidden";

interface AdminRouteProps {
  children: React.ReactNode;
  /** Si true, seul admin a accès. Sinon admin + gestionnaire. */
  adminOnly?: boolean;
}

const AdminRoute = ({ children, adminOnly = false }: AdminRouteProps) => {
  const { isAdmin, isAdminOrManager, isAccountant, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sauf indication contraire stricte, le comptable peut VISITER les routes admin pour voir les données
  const hasAccess = adminOnly ? isAdmin : (isAdminOrManager || isAccountant);

  if (!hasAccess) {
    return <Forbidden />;
  }

  return <>{children}</>;
};

export default AdminRoute;
