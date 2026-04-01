import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { leadSchema } from "@/lib/validations";
import type { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSave: (data: Partial<Lead>) => Promise<void>;
  isSaving: boolean;
}

const LeadFormDialog = ({ open, onOpenChange, lead, onSave, isSaving }: LeadFormDialogProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("website");
  const [projectType, setProjectType] = useState("interior");
  const [budget, setBudget] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [status, setStatus] = useState("new");
  const [score, setScore] = useState("50");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setEmail(lead.email);
      setPhone(lead.phone || "");
      setAddress(lead.address || "");
      setSource(lead.source);
      setProjectType(lead.project_type);
      setBudget(String(lead.budget));
      setUrgency(lead.urgency);
      setStatus(lead.status);
      setScore(String(lead.score));
      setNotes(lead.notes || "");
    } else {
      setName(""); setEmail(""); setPhone(""); setAddress("");
      setSource("website"); setProjectType("interior"); setBudget("");
      setUrgency("medium"); setStatus("new"); setScore("50"); setNotes("");
    }
    setErrors({});
  }, [lead, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = leadSchema.safeParse({
      name, email, phone, address, source,
      project_type: projectType,
      budget: parseFloat(budget) || 0,
      urgency, status,
      score: parseInt(score) || 50,
      notes,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    await onSave({
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone || null,
      address: result.data.address || null,
      source: result.data.source,
      project_type: result.data.project_type,
      budget: result.data.budget,
      urgency: result.data.urgency,
      status: result.data.status,
      score: result.data.score,
      notes: result.data.notes || null,
    });
  };

  const isEditing = !!lead;
  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-destructive mt-0.5">{errors[field]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le prospect" : "Nouveau prospect"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les informations du prospect" : "Remplissez les informations du nouveau prospect"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Nom complet *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Marc Tremblay" className={errors.name ? "border-destructive" : ""} />
              <FieldError field="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Courriel *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="marc@email.com" className={errors.email ? "border-destructive" : ""} />
              <FieldError field="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="514-555-0101" className={errors.phone ? "border-destructive" : ""} />
              <FieldError field="phone" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="145 Rue Saint-Laurent, Montréal" className={errors.address ? "border-destructive" : ""} />
              <FieldError field="address" />
            </div>
            <div className="space-y-1.5">
              <Label>Source *</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Site web</SelectItem>
                  <SelectItem value="referral">Référence</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="door-to-door">Porte-à-porte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type de projet *</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interior">Intérieur</SelectItem>
                  <SelectItem value="exterior">Extérieur</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget ($)</Label>
              <Input id="budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="5000" min="0" step="100" className={errors.budget ? "border-destructive" : ""} />
              <FieldError field="budget" />
            </div>
            <div className="space-y-1.5">
              <Label>Urgence</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="high">Élevé</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nouveau</SelectItem>
                  <SelectItem value="contacted">Contacté</SelectItem>
                  <SelectItem value="qualified">Qualifié</SelectItem>
                  <SelectItem value="proposal">Soumission</SelectItem>
                  <SelectItem value="negotiation">Négociation</SelectItem>
                  <SelectItem value="won">Gagné</SelectItem>
                  <SelectItem value="lost">Perdu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score">Score (0-100)</Label>
              <Input id="score" type="number" value={score} onChange={(e) => setScore(e.target.value)} min="0" max="100" className={errors.score ? "border-destructive" : ""} />
              <FieldError field="score" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes sur le projet..." rows={2} className={errors.notes ? "border-destructive" : ""} />
              <FieldError field="notes" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" variant="gold" disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin" />}
              {isEditing ? "Enregistrer" : "Créer le prospect"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormDialog;
