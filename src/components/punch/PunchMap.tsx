import { useEffect, useRef } from "react";
import { MapPin, LogIn, LogOut } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PunchMapRecord {
  id: string;
  latitude: number | null;
  longitude: number | null;
  punch_type: "in" | "out";
  punched_at: string;
  address: string | null;
  out_of_zone: boolean;
  user_id: string;
  project_name?: string;
  employee_name?: string;
}

interface ProjectMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface PunchMapProps {
  records: PunchMapRecord[];
  projects?: ProjectMarker[];
}

const GEOFENCE_RADIUS = 500;

const PunchMap = ({ records, projects = [] }: PunchMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const geoRecords = records.filter((r) => r.latitude && r.longitude);

  useEffect(() => {
    if (!mapRef.current || geoRecords.length === 0) return;

    let L: any;
    const loadMap = async () => {
      L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      // Fix default icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const avgLat = geoRecords.reduce((s, r) => s + r.latitude!, 0) / geoRecords.length;
      const avgLng = geoRecords.reduce((s, r) => s + r.longitude!, 0) / geoRecords.length;

      const map = L.map(mapRef.current!, {
        center: [avgLat, avgLng],
        zoom: 12,
        scrollWheelZoom: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Project geofence circles
      projects.forEach((project) => {
        L.circle([project.latitude, project.longitude], {
          radius: GEOFENCE_RADIUS,
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0.1,
          weight: 2,
          dashArray: "5, 5",
        }).addTo(map).bindPopup(`<strong>🏗️ ${project.name}</strong><br/>Zone de géofencing (${GEOFENCE_RADIUS}m)`);

        // Project center marker
        const projectIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:#22c55e;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏗️</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([project.latitude, project.longitude], { icon: projectIcon })
          .addTo(map)
          .bindPopup(`<strong>${project.name}</strong><br/>Centre du chantier`);
      });

      // Punch markers
      geoRecords.forEach((record) => {
        const isIn = record.punch_type === "in";
        const isOutOfZone = record.out_of_zone;
        const color = isOutOfZone ? "#ef4444" : isIn ? "#3b82f6" : "#f97316";
        const emoji = isOutOfZone ? "⚠️" : isIn ? "📥" : "📤";

        const icon = L.divIcon({
          className: "custom-marker",
          html: `<div style="background:${color};color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${emoji}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const name = record.employee_name || record.user_id.substring(0, 8);
        const projectLabel = record.project_name ? `<br/>🏗️ ${record.project_name}` : "";
        const zoneLabel = isOutOfZone ? `<br/><span style="color:#ef4444;font-weight:bold;">⚠️ Hors zone</span>` : "";

        L.marker([record.latitude!, record.longitude!], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${name}</strong><br/>` +
            `${isIn ? "Arrivée" : "Départ"} — ${format(new Date(record.punched_at), "d MMM HH:mm", { locale: fr })}` +
            projectLabel + zoneLabel +
            (record.address ? `<br/><small>${record.address.substring(0, 60)}</small>` : "")
          );
      });

      // Fit bounds
      const allPoints = [
        ...geoRecords.map((r) => [r.latitude!, r.longitude!] as [number, number]),
        ...projects.map((p) => [p.latitude, p.longitude] as [number, number]),
      ];
      if (allPoints.length > 1) {
        map.fitBounds(L.latLngBounds(allPoints).pad(0.1));
      }
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geoRecords.length, projects.length]);

  if (geoRecords.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Aucun pointage avec localisation GPS</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={mapRef} className="rounded-lg overflow-hidden border" style={{ height: "450px" }} />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Arrivée
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Départ
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Hors zone
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Chantier
        </span>
      </div>

      {/* Point list */}
      <div className="grid gap-2 max-h-[300px] overflow-y-auto">
        {geoRecords.slice(0, 50).map((record) => (
          <a
            key={record.id}
            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div
              className={`p-1.5 rounded-full ${
                record.out_of_zone
                  ? "bg-destructive/10 text-destructive"
                  : record.punch_type === "in"
                  ? "bg-primary/10 text-primary"
                  : "bg-orange-500/10 text-orange-600"
              }`}
            >
              {record.punch_type === "in" ? (
                <LogIn className="h-3.5 w-3.5" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {record.employee_name || record.user_id.substring(0, 8)} — {record.project_name || "Sans projet"}
                {record.out_of_zone && <span className="text-destructive ml-1">⚠️ Hors zone</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(record.punched_at), "d MMM HH:mm", { locale: fr })} — {record.address?.substring(0, 50) || "N/A"}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default PunchMap;
