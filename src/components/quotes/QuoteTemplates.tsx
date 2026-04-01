import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Building2, Paintbrush } from "lucide-react";

export type TemplateType = "interior" | "exterior" | "commercial";

interface QuoteTemplatesProps {
  onSelect: (template: TemplateType) => void;
}

const templates = [
  {
    type: "interior" as TemplateType,
    icon: Home,
    title: "Intérieur",
    description: "Murs, plafonds, boiseries, cuisines, salles de bain",
    defaultItems: [
      { name: "Préparation des surfaces", unit: "pi²", unitPrice: 1.25, quantity: 0, materialCost: 0.15 },
      { name: "Peinture murs (2 couches)", unit: "pi²", unitPrice: 3.50, quantity: 0, materialCost: 0.85 },
      { name: "Peinture plafond", unit: "pi²", unitPrice: 3.00, quantity: 0, materialCost: 0.75 },
      { name: "Boiseries et moulures", unit: "pi lin.", unitPrice: 4.50, quantity: 0, materialCost: 1.20 },
      { name: "Protection et nettoyage", unit: "forfait", unitPrice: 150, quantity: 1, materialCost: 25 },
    ],
  },
  {
    type: "exterior" as TemplateType,
    icon: Paintbrush,
    title: "Extérieur",
    description: "Revêtement, balcons, clôtures, garages, cabanons",
    defaultItems: [
      { name: "Lavage à pression", unit: "pi²", unitPrice: 0.75, quantity: 0, materialCost: 0.05 },
      { name: "Grattage et ponçage", unit: "pi²", unitPrice: 1.50, quantity: 0, materialCost: 0.10 },
      { name: "Apprêt extérieur", unit: "pi²", unitPrice: 2.00, quantity: 0, materialCost: 0.95 },
      { name: "Peinture extérieure (2 couches)", unit: "pi²", unitPrice: 4.00, quantity: 0, materialCost: 1.25 },
      { name: "Calfeutrage et réparations mineures", unit: "forfait", unitPrice: 250, quantity: 1, materialCost: 45 },
    ],
  },
  {
    type: "commercial" as TemplateType,
    icon: Building2,
    title: "Commercial",
    description: "Bureaux, restaurants, commerces, entrepôts",
    defaultItems: [
      { name: "Protection du mobilier et équipements", unit: "forfait", unitPrice: 350, quantity: 1, materialCost: 50 },
      { name: "Préparation des surfaces", unit: "pi²", unitPrice: 1.50, quantity: 0, materialCost: 0.20 },
      { name: "Peinture murale commerciale (2 couches)", unit: "pi²", unitPrice: 4.50, quantity: 0, materialCost: 1.40 },
      { name: "Peinture plafond commercial", unit: "pi²", unitPrice: 3.75, quantity: 0, materialCost: 1.00 },
      { name: "Lignes et marquages spéciaux", unit: "pi lin.", unitPrice: 6.00, quantity: 0, materialCost: 1.50 },
      { name: "Nettoyage fin de chantier", unit: "forfait", unitPrice: 400, quantity: 1, materialCost: 35 },
    ],
  },
];

export { templates };

const QuoteTemplates = ({ onSelect }: QuoteTemplatesProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {templates.map((tpl) => (
        <Card
          key={tpl.type}
          className="p-6 border-border hover:border-primary/50 transition-all cursor-pointer group"
          onClick={() => onSelect(tpl.type)}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <tpl.icon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-foreground">{tpl.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>
            </div>
            <Button variant="outline" size="sm" className="mt-2">
              Créer une soumission
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default QuoteTemplates;
