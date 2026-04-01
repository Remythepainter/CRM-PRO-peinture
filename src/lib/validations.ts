import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100, "100 caractères maximum"),
  email: z.string().trim().email("Courriel invalide").max(255, "255 caractères maximum"),
  phone: z.string().max(30, "30 caractères maximum").optional().or(z.literal("")),
  address: z.string().max(500, "500 caractères maximum").optional().or(z.literal("")),
  source: z.enum(["website", "referral", "google", "facebook", "door-to-door"]),
  project_type: z.enum(["interior", "exterior", "commercial"]),
  budget: z.number().min(0, "Le budget doit être positif").max(10_000_000, "Budget trop élevé"),
  urgency: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]),
  score: z.number().int().min(0, "Score minimum : 0").max(100, "Score maximum : 100"),
  notes: z.string().max(5000, "5000 caractères maximum").optional().or(z.literal("")),
});

export type LeadFormData = z.infer<typeof leadSchema>;

export const quoteClientSchema = z.object({
  clientName: z.string().trim().min(1, "Le nom du client est requis").max(100, "100 caractères maximum"),
  clientEmail: z.string().trim().email("Courriel invalide").max(255, "255 caractères maximum"),
  clientPhone: z.string().max(30, "30 caractères maximum").optional().or(z.literal("")),
  clientAddress: z.string().max(500, "500 caractères maximum").optional().or(z.literal("")),
  projectDescription: z.string().max(5000, "5000 caractères maximum").optional().or(z.literal("")),
  notes: z.string().max(5000, "5000 caractères maximum").optional().or(z.literal("")),
});

export type QuoteClientData = z.infer<typeof quoteClientSchema>;

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Le nom du projet est requis").max(200, "200 caractères maximum"),
  client_name: z.string().trim().min(1, "Le nom du client est requis").max(100, "100 caractères maximum"),
  description: z.string().max(5000, "5000 caractères maximum").optional().or(z.literal("")),
  status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]),
  budget: z.number().min(0, "Le budget doit être positif").max(100_000_000, "Budget trop élevé"),
  spent: z.number().min(0, "Le montant doit être positif").max(100_000_000, "Montant trop élevé"),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  address: z.string().max(500, "500 caractères maximum").optional().or(z.literal("")),
});

export type ProjectFormData = z.infer<typeof projectSchema>;
