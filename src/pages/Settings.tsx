import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/useCompanySettings";
import { Settings as SettingsIcon, User, Bell, Building2, Upload, X, Loader2, Image } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import UserRoleManager from "@/components/settings/UserRoleManager";

const Settings = () => {
  const { isAdmin } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);

  // Company state
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [licenseRbq, setLicenseRbq] = useState("");
  const [taxTps, setTaxTps] = useState("");
  const [taxTvq, setTaxTvq] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || "");
      setCompanyAddress(settings.company_address || "");
      setCompanyPhone(settings.company_phone || "");
      setCompanyEmail(settings.company_email || "");
      setCompanyWebsite(settings.company_website || "");
      setLicenseRbq(settings.license_rbq || "");
      setTaxTps(settings.tax_tps || "");
      setTaxTvq(settings.tax_tvq || "");
      setLogoUrl(settings.logo_url);
    }
  }, [settings]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone },
    });
    setSavingProfile(false);
    toast(error
      ? { title: "Erreur", description: error.message, variant: "destructive" as const }
      : { title: "Profil mis à jour" }
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Format invalide", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erreur d'upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("company-assets")
      .getPublicUrl(fileName);

    setLogoUrl(urlData.publicUrl);
    setUploading(false);
    toast({ title: "Logo téléchargé" });
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
  };

  const handleSaveCompany = () => {
    updateSettings.mutate(
      {
        company_name: companyName,
        company_address: companyAddress,
        company_phone: companyPhone,
        company_email: companyEmail,
        company_website: companyWebsite,
        license_rbq: licenseRbq,
        tax_tps: taxTps,
        tax_tvq: taxTvq,
        logo_url: logoUrl,
      },
      {
        onSuccess: () => toast({ title: "Paramètres entreprise enregistrés" }),
        onError: (err) => toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" }),
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Paramètres
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configuration du système</p>
        </div>

        {/* Profil */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Profil
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Courriel</Label>
              <Input value={user?.email || ""} disabled className="bg-secondary/30" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full-name">Nom complet</Label>
              <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(514) 555-0000" />
            </div>
            <button onClick={handleSaveProfile} className="px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm">
              {savingProfile ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>

        {/* Entreprise */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Entreprise
          </h2>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <div className="relative group">
                        <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-contain border border-border bg-background" />
                        <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                        {uploading ? "Téléchargement..." : "Choisir un logo"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG. Max 2 Mo.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="company-name">Nom de l'entreprise</Label>
                  <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company-address">Adresse</Label>
                  <Input id="company-address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="123 rue Principale, Montréal, QC" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="company-phone">Téléphone</Label>
                    <Input id="company-phone" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="514-555-0100" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company-email">Courriel</Label>
                    <Input id="company-email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="info@entreprise.ca" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company-website">Site web</Label>
                  <Input id="company-website" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="www.entreprise.ca" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="license-rbq">Licence RBQ</Label>
                    <Input id="license-rbq" value={licenseRbq} onChange={(e) => setLicenseRbq(e.target.value)} placeholder="1234-5678-90" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tax-tps">No TPS</Label>
                    <Input id="tax-tps" value={taxTps} onChange={(e) => setTaxTps(e.target.value)} placeholder="123456789 RT0001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tax-tvq">No TVQ</Label>
                    <Input id="tax-tvq" value={taxTvq} onChange={(e) => setTaxTvq(e.target.value)} placeholder="1234567890 TQ0001" />
                  </div>
                </div>
                <button onClick={handleSaveCompany} disabled={updateSettings.isPending} className="px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
                  {updateSettings.isPending ? "Enregistrement..." : "Enregistrer les paramètres entreprise"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Gestion des rôles */}
        {isAdmin && <UserRoleManager />}

        {/* Notifications */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Notifications par courriel</p>
              <p className="text-xs text-muted-foreground">Recevoir les rappels de suivi par courriel</p>
            </div>
            <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
