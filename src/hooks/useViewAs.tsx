import { createContext, useContext, useState, type ReactNode } from "react";
import type { AppRole } from "@/hooks/useUserRole";

interface ViewAsContextType {
  viewAsRole: AppRole | null;
  setViewAsRole: (role: AppRole | null) => void;
  isImpersonating: boolean;
}

const ViewAsContext = createContext<ViewAsContextType>({
  viewAsRole: null,
  setViewAsRole: () => {},
  isImpersonating: false,
});

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAsRole, setViewAsRole] = useState<AppRole | null>(null);

  return (
    <ViewAsContext.Provider value={{ viewAsRole, setViewAsRole, isImpersonating: viewAsRole !== null }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}
