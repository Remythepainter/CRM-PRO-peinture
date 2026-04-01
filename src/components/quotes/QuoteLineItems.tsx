import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

export interface LineItem {
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  materialCost: number;
}

interface QuoteLineItemsProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

const QuoteLineItems = ({ items, onChange }: QuoteLineItemsProps) => {
  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, { name: "", unit: "pi²", unitPrice: 0, quantity: 0, materialCost: 0 }]);
  };

  return (
    <div className="space-y-3">
      <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1">
        <div className="col-span-4">Description</div>
        <div className="col-span-1">Unité</div>
        <div className="col-span-2">Prix unitaire</div>
        <div className="col-span-2">Quantité</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-1" />
      </div>

      {items.map((item, i) => {
        const lineTotal = item.unitPrice * item.quantity;
        return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-12 md:col-span-4">
              <Input
                value={item.name}
                onChange={(e) => updateItem(i, "name", e.target.value)}
                placeholder="Description"
                className="bg-secondary/50 border-border text-sm"
              />
            </div>
            <div className="col-span-3 md:col-span-1">
              <Input
                value={item.unit}
                onChange={(e) => updateItem(i, "unit", e.target.value)}
                className="bg-secondary/50 border-border text-sm text-center"
              />
            </div>
            <div className="col-span-3 md:col-span-2">
              <Input
                type="number"
                value={item.unitPrice || ""}
                onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-secondary/50 border-border text-sm"
                step="0.01"
              />
            </div>
            <div className="col-span-3 md:col-span-2">
              <Input
                type="number"
                value={item.quantity || ""}
                onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="bg-secondary/50 border-border text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-2 text-right text-sm font-medium text-foreground pr-1">
              {lineTotal.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
            </div>
            <div className="col-span-1 flex justify-end">
              <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
        <Plus className="w-4 h-4 mr-1" /> Ajouter une ligne
      </Button>
    </div>
  );
};

export default QuoteLineItems;
