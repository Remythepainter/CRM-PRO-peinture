import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLastPunch, usePunchIn, usePunchOut, useActiveProjects, checkGeofence } from "@/hooks/usePunchRecords";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, LogIn, LogOut, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PunchHistory from "@/components/punch/PunchHistory";
import PunchDashboard from "@/components/punch/PunchDashboard";

const Punch = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const { data: lastPunch, isLoading: loadingLast } = useLastPunch();
  const { data: projects } = useActiveProjects();
  const punchIn = usePunchIn();
  const punchOut = usePunchOut();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);

  const isPunchedIn = lastPunch?.punch_type === "in";

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getLocation = useCallback(async (): Promise<{
    lat: number;
    lng: number;
    address: string;
  } | null> => {
    setGeoLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );

      const { latitude, longitude } = position.coords;

      let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "fr" } }
        );
        const geo = await res.json();
        if (geo.display_name) {
          address = geo.display_name;
        }
      } catch {
        // Keep coordinates as fallback
      }

      const loc = { lat: latitude, lng: longitude, address };
      setLocation(loc);
      return loc;
    } catch (err: any) {
      toast({
        title: "Localisation indisponible",
        description:
          err.code === 1
            ? "Veuillez autoriser l'accès à votre position."
            : "Impossible d'obtenir votre position GPS.",
        variant: "destructive",
      });
      return null;
    } finally {
      setGeoLoading(false);
    }
  }, [toast]);

  const notifyAdminOutOfZone = async (
    projectName: string,
    distance: number | null,
    punchType: "in" | "out"
  ) => {
    try {
      const userName = user?.user_metadata?.full_name || user?.email || "Un employé";
      const distanceText = distance ? `${distance}m` : "inconnue";

      // Get admin user IDs
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.user_id,
          title: "📍 Pointage hors zone",
          message: `${userName} a punché ${punchType === "in" ? "l'entrée" : "la sortie"} à ${distanceText} du chantier « ${projectName} » (rayon autorisé : 500m).`,
          type: "warning",
          link: "/punch",
        }));

        await supabase.from("notifications").insert(notifications);
      }
    } catch (err) {
      console.error("Failed to notify admin:", err);
    }
  };

  const handlePunch = async (type: "in" | "out") => {
    const loc = await getLocation();
    const mutate = type === "in" ? punchIn : punchOut;

    // Geofence check
    let outOfZone = false;
    let geoDistance: number | null = null;
    const selectedProject = projects?.find((p) => p.id === selectedProjectId);

    if (loc && selectedProject) {
      const result = checkGeofence(
        loc.lat,
        loc.lng,
        selectedProject.latitude,
        selectedProject.longitude
      );
      outOfZone = !result.inZone;
      geoDistance = result.distance;
    }

    mutate.mutate(
      {
        latitude: loc?.lat,
        longitude: loc?.lng,
        address: loc?.address,
        notes: notes || undefined,
        projectId: selectedProjectId || undefined,
        outOfZone,
      },
      {
        onSuccess: () => {
          const toastMsg = outOfZone
            ? `⚠️ Hors zone (${geoDistance}m du chantier). L'admin a été notifié.`
            : loc?.address
            ? `Position : ${loc.address.substring(0, 80)}...`
            : "Position non disponible";

          toast({
            title: type === "in" ? "Entrée enregistrée ✅" : "Sortie enregistrée ✅",
            description: toastMsg,
            variant: outOfZone ? "destructive" : "default",
          });

          if (outOfZone && selectedProject) {
            notifyAdminOutOfZone(selectedProject.name, geoDistance, type);
          }

          setNotes("");
        },
        onError: () => {
          toast({
            title: "Erreur",
            description: "Impossible d'enregistrer le pointage.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const hasProjectCoords = selectedProject?.latitude != null && selectedProject?.longitude != null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Pointage
          </h1>
          <p className="text-muted-foreground">
            Enregistrez votre arrivée et départ avec localisation GPS
          </p>
        </div>

        {/* Clock & Punch Buttons */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {/* Live Clock */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span className="text-sm">
                  {format(currentTime, "EEEE d MMMM yyyy", { locale: fr })}
                </span>
              </div>
              <div className="text-5xl md:text-6xl font-display font-bold text-primary tabular-nums">
                {format(currentTime, "HH:mm:ss")}
              </div>

              {/* Status */}
              {loadingLast ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <Badge
                  variant={isPunchedIn ? "default" : "secondary"}
                  className="text-sm px-4 py-1"
                >
                  {isPunchedIn
                    ? `En service depuis ${format(new Date(lastPunch!.punched_at), "HH:mm")}`
                    : "Hors service"}
                </Badge>
              )}

              {/* Project Selector */}
              <div className="max-w-md mx-auto space-y-2">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un chantier (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          {project.latitude != null ? (
                            <ShieldCheck className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span>{project.name}</span>
                          <span className="text-muted-foreground text-xs">
                            — {project.client_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedProject && (
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    {hasProjectCoords ? (
                      <>
                        <ShieldCheck className="h-3 w-3 text-green-500" />
                        Géofencing actif (rayon 500m)
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        Pas de coordonnées GPS — géofencing inactif
                      </>
                    )}
                    {selectedProject.address && (
                      <span className="ml-1">• {selectedProject.address.substring(0, 40)}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Location indicator */}
              {location && (
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-xs">
                    {location.address.substring(0, 60)}
                  </span>
                </div>
              )}

              {/* Notes */}
              <Textarea
                placeholder="Notes (optionnel)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="max-w-md mx-auto"
                rows={2}
              />

              {/* Punch Buttons */}
              <div className="flex gap-4 justify-center w-full max-w-md mx-auto mt-6">
                <Button
                  size="lg"
                  className={`flex-1 flex flex-col gap-2 py-8 h-auto text-xl font-bold rounded-2xl shadow-lg transition-all border-2 ${
                    !isPunchedIn ? "bg-green-600 hover:bg-green-700 text-white border-green-500 hover:scale-105" : "bg-muted text-muted-foreground border-transparent opacity-50"
                  }`}
                  disabled={isPunchedIn || punchIn.isPending || geoLoading}
                  onClick={() => handlePunch("in")}
                  style={{ minHeight: "120px" }}
                >
                  {punchIn.isPending || geoLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                       <LogIn className="h-10 w-10 mb-1" />
                       <span>ENTRER</span>
                    </>
                  )}
                </Button>
                
                <Button
                  size="lg"
                  variant="destructive"
                  className={`flex-1 flex flex-col gap-2 py-8 h-auto text-xl font-bold rounded-2xl shadow-lg transition-all border-2 ${
                    isPunchedIn ? "bg-red-600 hover:bg-red-700 text-white border-red-500 hover:scale-105" : "bg-muted text-muted-foreground border-transparent opacity-50"
                  }`}
                  disabled={!isPunchedIn || punchOut.isPending || geoLoading}
                  onClick={() => handlePunch("out")}
                  style={{ minHeight: "120px" }}
                >
                  {punchOut.isPending || geoLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-10 w-10 mb-1" />
                      <span>SORTIR</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard for admins, history for employees */}
        {!isAdmin && (
          <div className="pt-4">
            <h2 className="text-xl font-semibold mb-4 text-muted-foreground px-2">Mon Historique</h2>
            <PunchHistory userId={user?.id} />
          </div>
        )}
        
        {isAdmin && (
          <div className="pt-4 border-t-2 border-primary/10 mt-8">
             <h2 className="text-2xl font-bold mb-6 text-primary flex items-center gap-2"><ShieldCheck className="h-6 w-6"/> Espace Administrateur</h2>
             <PunchDashboard />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Punch;
