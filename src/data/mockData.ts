export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: "website" | "referral" | "google" | "facebook" | "door-to-door";
  projectType: "interior" | "exterior" | "commercial";
  budget: number;
  urgency: "low" | "medium" | "high" | "urgent";
  score: number;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  createdAt: string;
  lastContact: string;
  notes: string;
  address: string;
}

export interface PipelineDeal {
  id: string;
  leadId: string;
  name: string;
  value: number;
  probability: number;
  stage: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  projectType: "interior" | "exterior" | "commercial";
  expectedClose: string;
}

export const leads: Lead[] = [
  { id: "1", name: "Marc Tremblay", email: "marc@email.com", phone: "514-555-0101", source: "website", projectType: "exterior", budget: 8500, urgency: "high", score: 92, status: "proposal", createdAt: "2025-03-10", lastContact: "2025-03-20", notes: "Grande maison, 2 étages", address: "145 Rue Saint-Laurent, Montréal" },
  { id: "2", name: "Sophie Gagnon", email: "sophie@email.com", phone: "514-555-0102", source: "referral", projectType: "interior", budget: 4200, urgency: "medium", score: 78, status: "qualified", createdAt: "2025-03-12", lastContact: "2025-03-18", notes: "Cuisine et salon", address: "320 Ave du Parc, Laval" },
  { id: "3", name: "Jean-Pierre Dubois", email: "jp@email.com", phone: "514-555-0103", source: "google", projectType: "commercial", budget: 22000, urgency: "urgent", score: 95, status: "negotiation", createdAt: "2025-03-08", lastContact: "2025-03-21", notes: "Restaurant à repeindre avant ouverture", address: "890 Blvd René-Lévesque, Montréal" },
  { id: "4", name: "Isabelle Lavoie", email: "isa@email.com", phone: "514-555-0104", source: "facebook", projectType: "interior", budget: 3100, urgency: "low", score: 45, status: "contacted", createdAt: "2025-03-15", lastContact: "2025-03-17", notes: "2 chambres à coucher", address: "55 Rue des Érables, Longueuil" },
  { id: "5", name: "Robert Bouchard", email: "rob@email.com", phone: "514-555-0105", source: "referral", projectType: "exterior", budget: 12000, urgency: "high", score: 88, status: "proposal", createdAt: "2025-03-05", lastContact: "2025-03-19", notes: "Maison + garage + clôture", address: "1200 Ch. Chambly, Saint-Hubert" },
  { id: "6", name: "Marie-Claire Roy", email: "mc@email.com", phone: "514-555-0106", source: "door-to-door", projectType: "exterior", budget: 5500, urgency: "medium", score: 62, status: "new", createdAt: "2025-03-20", lastContact: "2025-03-20", notes: "Balcon et revêtement", address: "78 Rue Principale, Boucherville" },
  { id: "7", name: "Pierre Pelletier", email: "pierre@email.com", phone: "514-555-0107", source: "google", projectType: "commercial", budget: 35000, urgency: "urgent", score: 97, status: "qualified", createdAt: "2025-03-01", lastContact: "2025-03-21", notes: "Bureaux 3000pi²", address: "5000 Rue Sherbrooke, Montréal" },
  { id: "8", name: "Anne Côté", email: "anne@email.com", phone: "514-555-0108", source: "website", projectType: "interior", budget: 2800, urgency: "low", score: 38, status: "new", createdAt: "2025-03-21", lastContact: "2025-03-21", notes: "Salle de bain uniquement", address: "200 Rue King, Sherbrooke" },
];

export const pipelineDeals: PipelineDeal[] = [
  { id: "d1", leadId: "1", name: "Tremblay - Ext. Maison", value: 8500, probability: 70, stage: "proposal", projectType: "exterior", expectedClose: "2025-04-05" },
  { id: "d2", leadId: "2", name: "Gagnon - Int. Cuisine/Salon", value: 4200, probability: 50, stage: "qualified", projectType: "interior", expectedClose: "2025-04-12" },
  { id: "d3", leadId: "3", name: "Dubois - Restaurant Commercial", value: 22000, probability: 80, stage: "negotiation", projectType: "commercial", expectedClose: "2025-03-28" },
  { id: "d4", leadId: "4", name: "Lavoie - Int. Chambres", value: 3100, probability: 20, stage: "contacted", projectType: "interior", expectedClose: "2025-04-20" },
  { id: "d5", leadId: "5", name: "Bouchard - Ext. Complète", value: 12000, probability: 65, stage: "proposal", projectType: "exterior", expectedClose: "2025-04-08" },
  { id: "d6", leadId: "6", name: "Roy - Ext. Balcon", value: 5500, probability: 30, stage: "new", projectType: "exterior", expectedClose: "2025-04-25" },
  { id: "d7", leadId: "7", name: "Pelletier - Bureaux", value: 35000, probability: 55, stage: "qualified", projectType: "commercial", expectedClose: "2025-04-15" },
  { id: "d8", leadId: "8", name: "Côté - Int. SDB", value: 2800, probability: 15, stage: "new", projectType: "interior", expectedClose: "2025-05-01" },
];

export interface FollowUpStep {
  id: string;
  label: string;
  delayHours: number;
  type: "email" | "sms" | "call";
  templateId: string;
  templateName: string;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  steps: FollowUpStep[];
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  sequenceId: string;
  quoteId: string;
  quoteValue: number;
  startedAt: string;
  currentStepIndex: number;
  status: "active" | "completed" | "paused" | "converted";
  steps: FollowUpStepStatus[];
}

export interface FollowUpStepStatus {
  stepId: string;
  scheduledAt: string;
  executedAt: string | null;
  status: "pending" | "sent" | "overdue" | "skipped" | "replied";
  clientReply?: {
    message: string;
    receivedAt: string;
    channel: "email" | "sms" | "call";
  };
}

export const followUpTemplates: Record<string, string> = {
  "tpl-1": "Bonjour {{name}}, merci pour votre confiance! Votre soumission de {{value}} $ est prête. N'hésitez pas à nous contacter pour toute question.",
  "tpl-2": "{{name}}, avez-vous eu le temps de consulter notre soumission? Nous sommes disponibles pour en discuter.",
  "tpl-3": "{{name}}, nous voulions faire un suivi concernant votre projet de peinture. Avez-vous des questions?",
  "tpl-4": "{{name}}, notre soumission est toujours valide. Souhaitez-vous planifier le début des travaux?",
};

export const defaultSequence: FollowUpSequence = {
  id: "seq-1",
  name: "Séquence post-soumission standard",
  steps: [
    { id: "s1", label: "Confirmation 24h", delayHours: 24, type: "email", templateId: "tpl-1", templateName: "Remerciement + confirmation" },
    { id: "s2", label: "Relance 48h", delayHours: 48, type: "email", templateId: "tpl-2", templateName: "Premier suivi" },
    { id: "s3", label: "Suivi 5 jours", delayHours: 120, type: "sms", templateId: "tpl-3", templateName: "Rappel SMS" },
    { id: "s4", label: "Relance 10 jours", delayHours: 240, type: "call", templateId: "tpl-4", templateName: "Appel de clôture" },
  ],
};

export const activeFollowUps: FollowUp[] = [
  {
    id: "fu-1", leadId: "1", leadName: "Marc Tremblay", sequenceId: "seq-1", quoteId: "q-1", quoteValue: 8500,
    startedAt: "2025-03-18T10:00:00", currentStepIndex: 2, status: "active",
    steps: [
      { stepId: "s1", scheduledAt: "2025-03-19T10:00:00", executedAt: "2025-03-19T10:05:00", status: "replied", clientReply: { message: "Merci! Je vais regarder ça ce soir.", receivedAt: "2025-03-19T18:30:00", channel: "email" } },
      { stepId: "s2", scheduledAt: "2025-03-20T10:00:00", executedAt: "2025-03-20T09:45:00", status: "sent" },
      { stepId: "s3", scheduledAt: "2025-03-23T10:00:00", executedAt: null, status: "overdue" },
      { stepId: "s4", scheduledAt: "2025-03-28T10:00:00", executedAt: null, status: "pending" },
    ],
  },
  {
    id: "fu-2", leadId: "5", leadName: "Robert Bouchard", sequenceId: "seq-1", quoteId: "q-2", quoteValue: 12000,
    startedAt: "2025-03-15T14:00:00", currentStepIndex: 3, status: "active",
    steps: [
      { stepId: "s1", scheduledAt: "2025-03-16T14:00:00", executedAt: "2025-03-16T14:02:00", status: "sent" },
      { stepId: "s2", scheduledAt: "2025-03-17T14:00:00", executedAt: "2025-03-17T14:10:00", status: "sent" },
      { stepId: "s3", scheduledAt: "2025-03-20T14:00:00", executedAt: "2025-03-20T14:30:00", status: "sent" },
      { stepId: "s4", scheduledAt: "2025-03-25T14:00:00", executedAt: null, status: "overdue" },
    ],
  },
  {
    id: "fu-3", leadId: "3", leadName: "Jean-Pierre Dubois", sequenceId: "seq-1", quoteId: "q-3", quoteValue: 22000,
    startedAt: "2025-03-20T09:00:00", currentStepIndex: 1, status: "active",
    steps: [
      { stepId: "s1", scheduledAt: "2025-03-21T09:00:00", executedAt: "2025-03-21T09:03:00", status: "sent" },
      { stepId: "s2", scheduledAt: "2025-03-22T09:00:00", executedAt: null, status: "overdue" },
      { stepId: "s3", scheduledAt: "2025-03-25T09:00:00", executedAt: null, status: "pending" },
      { stepId: "s4", scheduledAt: "2025-03-30T09:00:00", executedAt: null, status: "pending" },
    ],
  },
  {
    id: "fu-4", leadId: "2", leadName: "Sophie Gagnon", sequenceId: "seq-1", quoteId: "q-4", quoteValue: 4200,
    startedAt: "2025-03-10T11:00:00", currentStepIndex: 3, status: "converted",
    steps: [
      { stepId: "s1", scheduledAt: "2025-03-11T11:00:00", executedAt: "2025-03-11T11:01:00", status: "replied", clientReply: { message: "Bonjour, oui j'ai bien reçu. Très intéressant!", receivedAt: "2025-03-11T14:22:00", channel: "email" } },
      { stepId: "s2", scheduledAt: "2025-03-12T11:00:00", executedAt: "2025-03-12T11:05:00", status: "replied", clientReply: { message: "On peut se voir jeudi pour en discuter?", receivedAt: "2025-03-12T16:45:00", channel: "email" } },
      { stepId: "s3", scheduledAt: "2025-03-15T11:00:00", executedAt: "2025-03-15T11:20:00", status: "replied", clientReply: { message: "OK on y va! Quand commencez-vous?", receivedAt: "2025-03-15T12:10:00", channel: "sms" } },
      { stepId: "s4", scheduledAt: "2025-03-20T11:00:00", executedAt: null, status: "skipped" },
    ],
  },
  {
    id: "fu-5", leadId: "7", leadName: "Pierre Pelletier", sequenceId: "seq-1", quoteId: "q-5", quoteValue: 35000,
    startedAt: "2025-03-19T08:00:00", currentStepIndex: 0, status: "active",
    steps: [
      { stepId: "s1", scheduledAt: "2025-03-20T08:00:00", executedAt: "2025-03-20T08:02:00", status: "sent" },
      { stepId: "s2", scheduledAt: "2025-03-21T08:00:00", executedAt: null, status: "overdue" },
      { stepId: "s3", scheduledAt: "2025-03-24T08:00:00", executedAt: null, status: "pending" },
      { stepId: "s4", scheduledAt: "2025-03-29T08:00:00", executedAt: null, status: "pending" },
    ],
  },
];

export const monthlyRevenue = [
  { month: "Oct", revenue: 28000, target: 30000 },
  { month: "Nov", revenue: 35000, target: 30000 },
  { month: "Déc", revenue: 18000, target: 25000 },
  { month: "Jan", revenue: 12000, target: 20000 },
  { month: "Fév", revenue: 22000, target: 25000 },
  { month: "Mar", revenue: 31000, target: 30000 },
];

export const conversionBySource = [
  { source: "Site web", leads: 45, converted: 18, rate: 40 },
  { source: "Référence", leads: 32, converted: 22, rate: 69 },
  { source: "Google Ads", leads: 28, converted: 8, rate: 29 },
  { source: "Facebook", leads: 20, converted: 5, rate: 25 },
  { source: "Porte-à-porte", leads: 15, converted: 6, rate: 40 },
];
