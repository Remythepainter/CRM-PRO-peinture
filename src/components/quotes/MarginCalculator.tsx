import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Percent, AlertTriangle } from "lucide-react";
import type { LineItem } from "./QuoteLineItems";

interface MarginCalculatorProps {
  items: LineItem[];
  taxRate: number;
}

const MarginCalculator = ({ items, taxRate }: MarginCalculatorProps) => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalMaterialCost = items.reduce((sum, item) => sum + item.materialCost * item.quantity, 0);
  const laborCost = subtotal - totalMaterialCost;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  const profit = subtotal - totalMaterialCost;
  const marginPercent = subtotal > 0 ? (profit / subtotal) * 100 : 0;

  const marginColor = marginPercent >= 50 ? "text-success" : marginPercent >= 30 ? "text-primary" : "text-destructive";
  const marginBg = marginPercent >= 50 ? "bg-success" : marginPercent >= 30 ? "bg-primary" : "bg-destructive";

  return (
    <Card className="p-5 border-border space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Calculateur de marge
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sous-total</span>
          <span className="text-foreground font-medium">{subtotal.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Coût matériaux</span>
          <span className="text-foreground">{totalMaterialCost.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Main-d'œuvre nette</span>
          <span className="text-foreground">{laborCost.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
        </div>
        
        <div className="border-t border-border pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxes ({taxRate}%)</span>
            <span className="text-foreground">{taxAmount.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex justify-between">
            <span className="text-foreground font-semibold">Total</span>
            <span className="text-foreground font-bold text-lg">{total.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5" /> Marge
          </span>
          <span className={`text-lg font-bold ${marginColor}`}>{marginPercent.toFixed(1)}%</span>
        </div>
        <Progress value={Math.min(marginPercent, 100)} className={`h-2 ${marginBg}`} />

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Profit brut
          </span>
          <span className={`font-semibold ${marginColor}`}>{profit.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
        </div>

        {marginPercent < 30 && subtotal > 0 && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Marge faible! Visez au moins 30% pour couvrir les frais généraux.</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MarginCalculator;
export type { MarginCalculatorProps };
