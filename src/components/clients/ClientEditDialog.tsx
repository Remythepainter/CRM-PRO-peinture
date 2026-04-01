import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  satisfaction_rating: number | null;
  total_revenue: number;
  source: string | null;
}

interface Props {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClientEditDialog = ({ client, open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [address, setAddress] = useState(client.address || "");
  const [notes, setNotes] = useState(client.notes || "");
  const [satisfaction, setSatisfaction] = useState(client.satisfaction_rating || 0);
  const [totalRevenue, setTotalRevenue] = useState(String(client.total_revenue || 0));

  useEffect(() => {
    if (open) {
      setName(client.name);
      setEmail(client.email || "");
      setPhone(client.phone || "");
      setAddress(client.address || "");
      setNotes(client.notes || "");
      setSatisfaction(client.satisfaction_rating || 0);
      setTotalRevenue(String(client.total_revenue || 0));
    }
  }, [open, client]);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Le nom est requis");
      if (trimmedName.length > 100) throw new Error("Le nom doit faire moins de 100 caractères");
      
      const trimmedEmail = email.trim();
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new Error("Courriel invalide");
      }

      const { error } = await supabase
        .from("clients")
        .update({
          name: trimmedName,
          email: trimmedEmail || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          satisfaction_rating: satisfaction,
          total_revenue: parseFloat(totalRevenue) || 0,
        })
        .eq("id", client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", client.id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client mis à jour" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le client</DialogTitle>
          <DialogDescription>Modifiez les informations du client</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nom *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label>Courriel</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>Revenu total ($)</Label>
            <Input type="number" min="0" step="0.01" value={totalRevenue} onChange={(e) => setTotalRevenue(e.target.value)} />
          </div>
          <div>
            <Label>Satisfaction</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setSatisfaction(star === satisfaction ? 0 : star)}>
                  <Star className={cn("h-5 w-5 cursor-pointer transition-colors", star <= satisfaction ? "text-primary fill-primary" : "text-muted-foreground/30 hover:text-primary/50")} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientEditDialog;
