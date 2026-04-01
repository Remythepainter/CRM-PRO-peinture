import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProfileDemoSwitcher from "@/components/demo/ProfileDemoSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Loader2, ShieldAlert } from "lucide-react";
import PasswordStrengthMeter, { getPasswordStrength } from "@/components/auth/PasswordStrengthMeter";
import { useRateLimit } from "@/hooks/useRateLimit";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkRateLimit, isLocked, remainingSeconds } = useRateLimit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit()) {
      toast({
        title: "Trop de tentatives",
        description: `Veuillez patienter ${remainingSeconds} secondes avant de réessayer.`,
        variant: "destructive",
      });
      return;
    }
    if (!isLogin) {
      const { isValid } = getPasswordStrength(password);
      if (!isValid) {
        toast({
          title: "Mot de passe trop faible",
          description: "Veuillez respecter au moins 4 des 5 critères de sécurité.",
          variant: "destructive",
        });
        return;
      }
    }
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Inscription réussie",
          description: "Vérifiez votre courriel pour confirmer votre compte.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
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
          <p className="text-muted-foreground text-sm">CRM intelligent pour entrepreneurs en peinture</p>
        </div>

        {/* Switcher de démo de profils */}
        <ProfileDemoSwitcher />

        <Card className="border-border/50 card-glowing">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">
              {isLogin ? "Connexion" : "Créer un compte"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Entrez vos identifiants pour accéder au CRM"
                : "Remplissez le formulaire pour créer votre compte"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="Rémy Ouellette"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              )}

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

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
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
                {!isLogin && <PasswordStrengthMeter password={password} />}
              </div>

              {isLocked && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>Trop de tentatives. Réessayez dans {remainingSeconds}s.</span>
                </div>
              )}

              <Button type="submit" className="w-full btn-primary-glow" disabled={loading || isLocked}>
                {loading && <Loader2 className="animate-spin" />}
                {isLocked ? `Verrouillé (${remainingSeconds}s)` : isLogin ? "Se connecter" : "Créer le compte"}
              </Button>
            </form>

            {isLogin && (
              <div className="text-center">
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                  Mot de passe oublié?
                </Link>
              </div>
            )}

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Pas encore de compte?" : "Déjà un compte?"}
              </span>{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
