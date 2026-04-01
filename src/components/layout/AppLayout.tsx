import { ReactNode, useState } from "react";
import AppSidebar from "./AppSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import ThemeCustomizer from "@/components/theme/ThemeCustomizer";
import AiChatBubble from "@/components/ai/AiChatBubble";
import { useThemeSettings } from "@/hooks/useThemeSettings";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  useThemeSettings();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Floating menu button — no header bar, matches Remy Paint Hub */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 bg-card/80 backdrop-blur-md border border-border shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <AppSidebar onNavigate={() => setMobileOpen(false)} forceExpanded />
          </SheetContent>
        </Sheet>

        <main className="min-h-screen pb-[env(safe-area-inset-bottom)]">
          <div className="p-4 pt-16 pb-24">{children}</div>
        </main>

        <ThemeCustomizer />
        <AiChatBubble />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-16 lg:ml-64 min-h-screen transition-all duration-300">
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">{children}</div>
      </main>

      <ThemeCustomizer />
      <AiChatBubble />
    </div>
  );
};

export default AppLayout;
