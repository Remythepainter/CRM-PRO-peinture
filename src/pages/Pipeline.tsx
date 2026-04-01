import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { usePipelineDeals } from "@/hooks/useSupabaseData";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const fadeIn = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

const stages = [
  { key: "new", label: "Nouveau", color: "border-info" },
  { key: "contacted", label: "Contacté", color: "border-primary" },
  { key: "qualified", label: "Qualifié", color: "border-warning" },
  { key: "proposal", label: "Soumission", color: "border-orange-500" },
  { key: "negotiation", label: "Négociation", color: "border-warning" },
  { key: "won", label: "Gagné", color: "border-success" },
] as const;

  const projectLabels: Record<string, string> = {
    interior: "Peinture Intérieure",
    exterior: "Peinture Extérieure",
    commercial: "Projet Commercial",
    cabinet: "Armoires de cuisine",
    epoxy: "Plancher Époxy"
  };

const Pipeline = () => {
  const { data: pipelineDeals, isLoading } = usePipelineDeals();
  const { isAdmin } = useUserRole();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const deals = pipelineDeals ?? [];

  return (
    <AppLayout>
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
        <motion.div variants={fadeIn} className="mb-6">
          <h1 className="text-2xl font-bold">Pipeline de ventes</h1>
          <p className="text-muted-foreground text-sm mt-1">Suivez vos opportunités à travers le processus de vente</p>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            const totalValue = stageDeals.reduce((s, d) => s + Number(d.value), 0);

            return (
              <motion.div key={stage.key} variants={fadeIn}
                className={`min-w-[280px] flex-shrink-0 bg-card rounded-xl border-t-4 ${stage.color} border border-border`}>
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{stage.label}</h3>
                    <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                  </div>
                  {isAdmin === true && <p className="text-sm text-muted-foreground">{totalValue.toLocaleString()} $</p>}
                </div>
                <div className="p-3 space-y-2">
                  {stageDeals.map((deal) => (
                    <div key={deal.id} className="bg-secondary/50 rounded-lg p-3 hover:bg-secondary transition-colors">
                      <p className="font-medium text-sm">{deal.name}</p>
                      {isAdmin === true && <p className="text-lg font-bold mt-1">{Number(deal.value).toLocaleString()} $</p>}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span>{projectLabels[deal.project_type] ?? deal.project_type}</span>
                        {deal.expected_close && (
                          <span>{new Date(deal.expected_close).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}</span>
                        )}
                      </div>
                      <div className="h-1 rounded-full bg-muted mt-2">
                        <div className="h-full rounded-full gradient-primary" style={{ width: `${deal.probability}%` }} />
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Aucune opportunité</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Pipeline;
