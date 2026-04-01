import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Returns true if the current user can edit/delete a record.
 * Admins & gestionnaires can always edit; employees can only edit their own records.
 * Accountants cannot edit anything except specific sections (handled manually per route).
 */
export function useCanModify() {
  const { user } = useAuth();
  const { isAdmin, isAdminOrManager, isAccountant } = useUserRole();

  const canModify = (createdBy: string | null | undefined): boolean => {
    if (isAccountant) return false; // L'expert comptable a un accès en "Lecture seule"
    if (isAdminOrManager) return true;
    if (!user || !createdBy) return false;
    return createdBy === user.id;
  };

  return { canModify, isAdmin, isAdminOrManager, isAccountant };
}
