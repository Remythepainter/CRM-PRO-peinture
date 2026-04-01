import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PunchRecord {
  id: string;
  user_id: string;
  team_member_id: string | null;
  punch_type: "in" | "out";
  punched_at: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  notes: string | null;
  project_id: string | null;
  out_of_zone: boolean;
  created_at: string;
}

export function usePunchRecords(filters?: {
  period?: "day" | "week" | "month" | "quarter" | "year";
  userId?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["punch_records", filters],
    queryFn: async () => {
      let query = supabase
        .from("punch_records")
        .select("*")
        .order("punched_at", { ascending: false });

      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }

      if (filters?.period) {
        const now = new Date();
        let startDate: Date;
        switch (filters.period) {
          case "day":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            const day = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
            startDate.setHours(0, 0, 0, 0);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "quarter":
            const qMonth = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), qMonth, 1);
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }
        query = query.gte("punched_at", startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PunchRecord[];
    },
    enabled: !!user,
  });
}

export function useLastPunch() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["last_punch", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("punch_records")
        .select("*")
        .eq("user_id", user!.id)
        .order("punched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PunchRecord | null;
    },
    enabled: !!user,
  });
}

export function useActiveProjects() {
  return useQuery({
    queryKey: ["active_projects_punch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, address, latitude, longitude, client_name")
        .in("status", ["planning", "in_progress"])
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

const GEOFENCE_RADIUS_METERS = 500;

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function checkGeofence(
  userLat: number,
  userLng: number,
  projectLat: number | null,
  projectLng: number | null
): { inZone: boolean; distance: number | null } {
  if (projectLat == null || projectLng == null) {
    return { inZone: true, distance: null }; // No coordinates set = no restriction
  }
  const distance = haversineDistance(userLat, userLng, projectLat, projectLng);
  return { inZone: distance <= GEOFENCE_RADIUS_METERS, distance: Math.round(distance) };
}

export function usePunchIn() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      latitude?: number;
      longitude?: number;
      address?: string;
      notes?: string;
      teamMemberId?: string;
      projectId?: string;
      outOfZone?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("punch_records")
        .insert({
          user_id: user!.id,
          team_member_id: params.teamMemberId || null,
          punch_type: "in",
          latitude: params.latitude || null,
          longitude: params.longitude || null,
          address: params.address || null,
          notes: params.notes || null,
          project_id: params.projectId || null,
          out_of_zone: params.outOfZone || false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["punch_records"] });
      queryClient.invalidateQueries({ queryKey: ["last_punch"] });
    },
  });
}

export function usePunchOut() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      latitude?: number;
      longitude?: number;
      address?: string;
      notes?: string;
      teamMemberId?: string;
      projectId?: string;
      outOfZone?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("punch_records")
        .insert({
          user_id: user!.id,
          team_member_id: params.teamMemberId || null,
          punch_type: "out",
          latitude: params.latitude || null,
          longitude: params.longitude || null,
          address: params.address || null,
          notes: params.notes || null,
          project_id: params.projectId || null,
          out_of_zone: params.outOfZone || false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["punch_records"] });
      queryClient.invalidateQueries({ queryKey: ["last_punch"] });
    },
  });
}
