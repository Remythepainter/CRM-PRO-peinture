import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle2, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src="/pwa-192x192.png" alt="Peinture Rémy" className="w-20 h-20 rounded-2xl" />
          </div>
          <CardTitle className="text-xl font-display">Peinture Rémy CRM</CardTitle>
          <CardDescription>Installez l'application sur votre appareil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {installed ? (
            <div className="flex flex-col items-center gap-2 py-4 text-success">
              <CheckCircle2 className="h-12 w-12" />
              <p className="font-medium">Application installée!</p>
            </div>
          ) : isIOS ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Sur iPhone / iPad :</p>
              <ol className="list-decimal list-inside space-y-2">
                <li className="flex items-start gap-2"><Share className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> Appuyez sur le bouton <strong>Partager</strong></li>
                <li>Faites défiler et appuyez sur <strong>Sur l'écran d'accueil</strong></li>
                <li>Appuyez sur <strong>Ajouter</strong></li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <Button variant="gold" className="w-full" size="lg" onClick={handleInstall}>
              <Download className="h-4 w-4 mr-2" />
              Installer l'application
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <Smartphone className="h-8 w-8 mx-auto text-primary" />
              <p>Ouvrez cette page dans le navigateur de votre téléphone pour installer l'application.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
