import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2, CheckCircle, ShieldAlert } from "lucide-react";
import PasswordStrengthMeter, { getPasswordStrength } from "@/components/auth/PasswordStrengthMeter";
import { useRateLimit } from "@/hooks/useRateLimit";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkRateLimit, isLocked, remainingSeconds } = useRateLimit();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    // Check hash for recovery token
    if (window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit()) {
      toast({ title: "Trop de tentatives", description: `Veuillez patienter ${remainingSeconds} secondes.`, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    const { isValid } = getPasswordStrength(password);
    if (!isValid) {
      toast({ title: "Mot de passe trop faible", description: "Veuillez respecter au moins 4 des 5 critères de sécurité.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
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
            <CardTitle className="text-xl">
              {success ? "Mot de passe modifié" : "Nouveau mot de passe"}
            </CardTitle>
            <CardDescription>
              {success
                ? "Votre mot de passe a été mis à jour avec succès"
                : "Choisissez un nouveau mot de passe pour votre compte"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-sm text-muted-foreground">Redirection vers le tableau de bord...</p>
              </div>
            ) : !isRecovery ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Lien de réinitialisation invalide ou expiré. Veuillez demander un nouveau lien.
                </p>
                <Button variant="outline" onClick={() => navigate("/forgot-password")} className="w-full">
                  Demander un nouveau lien
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      minLength={8}
                      required
                    />
                  </div>
                  <PasswordStrengthMeter password={password} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9"
                      minLength={8}
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
                  {isLocked ? `Verrouillé (${remainingSeconds}s)` : "Mettre à jour le mot de passe"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
