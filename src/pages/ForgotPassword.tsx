import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, ArrowLeft, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useRateLimit } from "@/hooks/useRateLimit";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const { checkRateLimit, isLocked, remainingSeconds } = useRateLimit({ maxAttempts: 3, lockoutMs: 180_000 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit()) {
      toast({ title: "Trop de tentatives", description: `Veuillez patienter ${remainingSeconds} secondes.`, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-lg gold-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">R</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Peinture <span className="text-primary">Rémy Ouellette</span>
            </h1>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Mot de passe oublié</CardTitle>
            <CardDescription>
              {sent
                ? "Un courriel de réinitialisation a été envoyé"
                : "Entrez votre courriel pour recevoir un lien de réinitialisation"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Vérifiez votre boîte de réception à <span className="font-medium text-foreground">{email}</span>.
                  Cliquez sur le lien reçu pour créer un nouveau mot de passe.
                </p>
                <Link to="/auth">
                  <Button variant="outline" className="w-full mt-2">
                    <ArrowLeft /> Retour à la connexion
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Courriel</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="remy@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                {isLocked && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Trop de tentatives. Réessayez dans {remainingSeconds}s.</span>
                  </div>
                )}
                <Button type="submit" variant="gold" className="w-full" disabled={loading || isLocked}>
                  {loading && <Loader2 className="animate-spin" />}
                  {isLocked ? `Verrouillé (${remainingSeconds}s)` : "Envoyer le lien"}
                </Button>
                <div className="text-center">
                  <Link to="/auth" className="text-sm text-primary hover:underline">
                    <ArrowLeft className="inline h-3 w-3 mr-1" />
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
