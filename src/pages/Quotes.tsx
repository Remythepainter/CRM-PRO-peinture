import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCanModify } from "@/hooks/useCanModify";
import { useUserRole } from "@/hooks/useUserRole";
import AppLayout from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, ArrowLeft, Send, Save, Eye, Users, Search } from "lucide-react";
import QuoteTemplates, { templates, type TemplateType } from "@/components/quotes/QuoteTemplates";
import QuoteLineItems, { type LineItem } from "@/components/quotes/QuoteLineItems";
import MarginCalculator from "@/components/quotes/MarginCalculator";
import QuotePdfGenerator from "@/components/quotes/QuotePdfGenerator";
import { useLeads } from "@/hooks/useSupabaseData";
import { cn } from "@/lib/utils";
import { quoteClientSchema } from "@/lib/validations";

type ViewMode = "list" | "lead-select" | "template-select" | "editor";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/20 text-primary",
  accepted: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const templateLabels: Record<string, string> = {
  interior: "Intérieur",
  exterior: "Extérieur",
  commercial: "Commercial",
};

const Quotes = () => {
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canModify } = useCanModify();
  const { isAdmin } = useUserRole();
  const [view, setView] = useState<ViewMode>("list");
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState("");

  // Leads data for picker
  const { data: leadsData } = useLeads();

  // Form state
  const [templateType, setTemplateType] = useState<TemplateType>("interior");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [taxRate] = useState(14.975);
  const [depositPercent, setDepositPercent] = useState<number>(30);
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Pre-fill from client detail page
  useEffect(() => {
    const state = location.state as { prefillClient?: { name: string; email?: string | null; phone?: string | null; address?: string | null } } | null;
    if (state?.prefillClient) {
      setClientName(state.prefillClient.name);
      setClientEmail(state.prefillClient.email || "");
      setClientPhone(state.prefillClient.phone || "");
      setClientAddress(state.prefillClient.address || "");
      setView("template-select");
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      // Validate client info
      const validation = quoteClientSchema.safeParse({
        clientName, clientEmail, clientPhone, clientAddress, projectDescription, notes,
      });
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of validation.error.issues) {
          const key = issue.path[0] as string;
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setFormErrors(fieldErrors);
        throw new Error("Veuillez corriger les erreurs du formulaire");
      }
      setFormErrors({});
      const subtotal = lineItems.reduce((s, item) => s + item.unitPrice * item.quantity, 0);
      const materialCost = lineItems.reduce((s, item) => s + item.materialCost * item.quantity, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      const laborCost = subtotal - materialCost;
      const profit = subtotal - materialCost;
      const marginPercent = subtotal > 0 ? (profit / subtotal) * 100 : 0;

      const payload = {
        template_type: templateType,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || null,
        client_address: clientAddress || null,
        project_description: projectDescription || null,
        line_items: JSON.parse(JSON.stringify(lineItems)),
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        material_cost: materialCost,
        labor_cost: laborCost,
        margin_percent: marginPercent,
        profit,
        status,
        valid_until: validUntil || null,
        notes: notes || null,
      };

      if (editingQuoteId) {
        const { error } = await supabase.from("quotes").update(payload).eq("id", editingQuoteId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("quotes").insert([{ ...payload, lead_id: selectedLeadId, created_by: user?.id }]);
        if (error) throw error;
      }
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: status === "sent" ? "Soumission envoyée!" : "Soumission sauvegardée!" });
      resetForm();
      setView("list");
    },
    onError: (error) => {
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setEditingQuoteId(null);
    setSelectedLeadId(null);
    setLeadSearch("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientAddress("");
    setProjectDescription("");
    setLineItems([]);
    setValidUntil("");
    setNotes("");
    setFormErrors({});
  };

  const handleSelectLead = (lead: any) => {
    setSelectedLeadId(lead.id);
    setClientName(lead.name);
    setClientEmail(lead.email);
    setClientPhone(lead.phone || "");
    setClientAddress(lead.address || "");
    setProjectDescription(lead.notes || "");
    // Pre-select template based on project type
    if (lead.project_type === "interior" || lead.project_type === "exterior" || lead.project_type === "commercial") {
      setTemplateType(lead.project_type);
      const tpl = templates.find((t) => t.type === lead.project_type);
      setLineItems(tpl?.defaultItems || []);
    }
    setView("template-select");
  };

  const handleSkipLeadSelect = () => {
    setSelectedLeadId(null);
    setView("template-select");
  };

  const handleSelectTemplate = (type: TemplateType) => {
    setTemplateType(type);
    const tpl = templates.find((t) => t.type === type);
    setLineItems(tpl?.defaultItems || []);
    setView("editor");
  };

  const handleEditQuote = (quote: any) => {
    setEditingQuoteId(quote.id);
    setTemplateType(quote.template_type);
    setClientName(quote.client_name);
    setClientEmail(quote.client_email);
    setClientPhone(quote.client_phone || "");
    setClientAddress(quote.client_address || "");
    setProjectDescription(quote.project_description || "");
    setLineItems(quote.line_items || []);
    setValidUntil(quote.valid_until || "");
    setNotes(quote.notes || "");
    setView("editor");
  };

  const subtotal = lineItems.reduce((s, item) => s + item.unitPrice * item.quantity, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <Button variant="ghost" size="icon" onClick={() => { setView("list"); resetForm(); }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {view === "list" ? "Soumissions" : view === "lead-select" ? "Sélectionner un prospect" : view === "template-select" ? "Nouveau type" : "Éditeur de soumission"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {view === "list" ? "Créez et gérez vos soumissions" : view === "lead-select" ? "Associez un prospect existant ou continuez sans" : view === "template-select" ? "Choisissez un template" : `Projet ${templateLabels[templateType]?.toLowerCase()}`}
              </p>
            </div>
          </div>
          {view === "list" && (
            isAdmin === true && (
              <Button variant="gold" onClick={() => setView("lead-select")} className="gap-2">
                <Plus className="w-4 h-4" /> Nouvelle soumission
              </Button>
            )
          )}
        </div>

        {/* List View */}
        {view === "list" && (
          <div className="space-y-3">
            {isLoading ? (
              <Card className="p-8 text-center text-muted-foreground">Chargement...</Card>
            ) : !quotes?.length ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Aucune soumission encore</p>
                {isAdmin === true && (
                  <Button variant="gold" className="mt-4 gap-2" onClick={() => setView("template-select")}>
                    <Plus className="w-4 h-4" /> Créer ma première soumission
                  </Button>
                )}
              </Card>
            ) : (
              quotes.map((q: any) => (
                <Card
                  key={q.id}
                  className={cn("p-4 border-border transition-colors", canModify(q.created_by) ? "hover:border-primary/30 cursor-pointer" : "opacity-80")}
                  onClick={() => canModify(q.created_by) && handleEditQuote(q)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{q.client_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {templateLabels[q.template_type]} • {new Date(q.created_at).toLocaleDateString("fr-CA")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isAdmin === true && (
                        <span className="font-semibold text-foreground">
                          {Number(q.total).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
                        </span>
                      )}
                      <Badge className={statusColors[q.status]}>{statusLabels[q.status]}</Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Lead Selection */}
        {view === "lead-select" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un prospect..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>
              <Button variant="outline" onClick={handleSkipLeadSelect} className="gap-2 whitespace-nowrap">
                Continuer sans prospect
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(leadsData ?? [])
                .filter((l) =>
                  l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
                  l.email.toLowerCase().includes(leadSearch.toLowerCase()) ||
                  (l.address ?? "").toLowerCase().includes(leadSearch.toLowerCase())
                )
                .map((lead) => (
                  <Card
                    key={lead.id}
                    className="p-4 border-border hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={() => handleSelectLead(lead)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground group-hover:bg-primary/20 transition-colors">
                        {lead.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                        {lead.address && (
                          <p className="text-xs text-muted-foreground truncate">{lead.address}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs border-border">
                          {templateLabels[lead.project_type] ?? lead.project_type}
                        </Badge>
                        {isAdmin === true && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {Number(lead.budget).toLocaleString()} $
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>

            {(leadsData ?? []).filter((l) =>
              l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
              l.email.toLowerCase().includes(leadSearch.toLowerCase())
            ).length === 0 && (
              <Card className="p-8 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun prospect trouvé</p>
                <Button variant="outline" className="mt-3" onClick={handleSkipLeadSelect}>
                  Créer sans prospect
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Template Selection */}
        {view === "template-select" && <QuoteTemplates onSelect={handleSelectTemplate} />}

        {/* Editor */}
        {view === "editor" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Client Info */}
              <Card className="p-5 border-border space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Informations client</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nom du client *" className={cn("bg-secondary/50 border-border", formErrors.clientName && "border-destructive")} />
                    {formErrors.clientName && <p className="text-xs text-destructive mt-0.5">{formErrors.clientName}</p>}
                  </div>
                  <div>
                    <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Courriel *" type="email" className={cn("bg-secondary/50 border-border", formErrors.clientEmail && "border-destructive")} />
                    {formErrors.clientEmail && <p className="text-xs text-destructive mt-0.5">{formErrors.clientEmail}</p>}
                  </div>
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Téléphone" className="bg-secondary/50 border-border" />
                  <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Adresse" className="bg-secondary/50 border-border" />
                </div>
                <Textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Description du projet" className="bg-secondary/50 border-border" rows={2} />
              </Card>

              {/* Line Items */}
              <Card className="p-5 border-border space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Détails de la soumission</h3>
                <QuoteLineItems items={lineItems} onChange={setLineItems} />
              </Card>

              {/* Notes & Validity */}
              <Card className="p-5 border-border space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Notes et validité</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="shrink-0 text-sm">Fin de validité:</Label>
                    <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="bg-secondary/50 border-border" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="shrink-0 text-sm">Dépôt exigé (%):</Label>
                    <Input type="number" min="0" max="100" value={depositPercent} onChange={(e) => setDepositPercent(Number(e.target.value))} className="bg-secondary/50 border-border w-24" />
                  </div>
                </div>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes additionnelles (conditions, exclusions...)" className="bg-secondary/50 border-border" rows={3} />
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={!clientName || !clientEmail} className="gap-2">
                  <Save className="w-4 h-4" /> Sauvegarder brouillon
                </Button>
                <Button variant="default" onClick={() => saveMutation.mutate("sent")} disabled={!clientName || !clientEmail || subtotal === 0} className="gap-2">
                  <Send className="w-4 h-4" /> Envoyer au client
                </Button>
                <QuotePdfGenerator
                  data={{ clientName, clientEmail, clientPhone, clientAddress, projectDescription, templateType, items: lineItems, taxRate, depositPercent, validUntil, notes }}
                  disabled={subtotal === 0}
                />
              </div>
            </div>

            {/* Right Sidebar - Margin Calculator */}
            <div className="space-y-4">
              {isAdmin === true && <MarginCalculator items={lineItems} taxRate={taxRate} />}

              {isAdmin === true && (
                <Card className="p-5 border-border space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Coûts matériaux</h3>
                  <p className="text-xs text-muted-foreground">Ajustez le coût matériau par unité pour chaque ligne</p>
                  {lineItems.map((item, i) => (
                    item.quantity > 0 && (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate flex-1">{item.name}</span>
                        <Input
                          type="number"
                          value={item.materialCost || ""}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[i] = { ...updated[i], materialCost: parseFloat(e.target.value) || 0 };
                            setLineItems(updated);
                          }}
                          className="w-24 bg-secondary/50 border-border text-sm"
                          step="0.01"
                        />
                      </div>
                    )
                  ))}
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Quotes;
