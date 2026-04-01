import { ShieldX, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const Forbidden = () => {
  const navigate = useNavigate();
  const { data: settings } = useCompanySettings();
  const adminEmail = settings?.company_email || "info@peinturero.com";
  const adminPhone = settings?.company_phone;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-display font-bold text-foreground">403</h1>
        <h2 className="text-xl font-semibold text-foreground">Accès refusé</h2>
        <p className="text-muted-foreground">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page. 
          Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/")} variant="default">
            Retour au tableau de bord
          </Button>
          <Button variant="outline" asChild>
            <a href={`mailto:${adminEmail}?subject=Demande d'accès&body=Bonjour, je souhaiterais obtenir l'accès à une section restreinte de l'application.`}>
              <Mail className="h-4 w-4 mr-2" />
              Contacter l'administrateur
            </a>
          </Button>
          {adminPhone && (
            <Button variant="outline" asChild>
              <a href={`tel:${adminPhone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Appeler l'administrateur
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
