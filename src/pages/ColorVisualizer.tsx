import { useState, useRef, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, PaintBucket, Palette, SlidersHorizontal, Image as ImageIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Chartes de couleurs factices pour l'exemple
const colorPalettes = {
  benjaminMoore: [
    { name: "Chantilly Lace", hex: "#F4F6F1", id: "OC-65" },
    { name: "Revere Pewter", hex: "#EBE6D9", id: "HC-172" },
    { name: "Hale Navy", hex: "#BEB9B1", id: "HC-154" },
    { name: "Kendall Charcoal", hex: "#7E7C73", id: "HC-166" },
  ],
  sherwinWilliams: [
    { name: "Alabaster", hex: "#ECEBE4", id: "SW 7008" },
    { name: "Agreeable Gray", hex: "#D1CBC1", id: "SW 7029" },
    { name: "Naval", hex: "#2F3D4C", id: "SW 6244" },
    { name: "Tricorn Black", hex: "#323334", id: "SW 6258" },
  ],
  sico: [
    { name: "Blanc Pur", hex: "#FDFDFD", id: "6000-11" },
    { name: "Gris Nébuleux", hex: "#C7C9C7", id: "6206-11" },
    { name: "Bleu Nuit", hex: "#2B3B4C", id: "6003-83" },
  ],
  dulux: [
    { name: "Natural White", hex: "#F2F1EA", id: "PN2F1" },
    { name: "Timeless", hex: "#E9E6DC", id: "PN2E1" },
    { name: "Tranquil Dawn", hex: "#E4DFD5", id: "45GY 76/014" },
  ]
};

const ColorVisualizer = () => {
  const [image, setImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#ffffff");
  const [activeBrand, setActiveBrand] = useState("benjaminMoore");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        toast({ title: "Image chargée", description: "Vous pouvez maintenant la colorier." });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        // Redimensionner le canvas pour correspondre à l'image
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
      };
      img.src = image;
    }
  }, [image]);

  const applyColor = () => {
    if (!image || !canvasRef.current) return;
    
    // Logique simplifiée de remplissage (Flood Fill ou Overlay)
    // Dans une version complète de production, cela nécessiterait un algorithme de détection de contour
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Pour l'instant, on applique un calque transparent avec la couleur choisie (mode simulation)
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = selectedColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Remettre l'opération par défaut
      ctx.globalCompositeOperation = "source-over";
      
      toast({
        title: "Couleur appliquée",
        description: "Simulation de la couleur sur la surface.",
      });
    }
  };

  const handleReset = () => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        ctx?.drawImage(img, 0, 0);
      };
      img.src = image;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col p-4 md:p-8 ml-0 md:ml-64 w-full md:w-[calc(100%-16rem)] overflow-x-hidden transition-all duration-300">
          
          <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Simulateur de Couleurs</h1>
              <p className="text-muted-foreground mt-1">
                Testez virtuellement les couleurs sur des photos de vos chantiers.
              </p>
            </div>
            
            {image && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Réinitialiser
                </Button>
                <Button onClick={applyColor} className="gap-2">
                  <PaintBucket className="h-4 w-4" />
                  Appliquer la couleur
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col border-border/50">
                <CardContent className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-muted/20">
                  {!image ? (
                    <div className="text-center flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg border-border/50 max-w-md w-full">
                      <ImageIcon className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Aucune photo chargée</h3>
                      <p className="text-sm text-muted-foreground mb-6 text-center">
                        Chargez une photo d'un mur ou d'une pièce pour commencer la simulation de peinture.
                      </p>
                      <Label htmlFor="image-upload" className="cursor-pointer">
                        <div className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 gap-2">
                          <Upload className="h-4 w-4" />
                          Sélectionner une photo
                        </div>
                        <Input 
                          id="image-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload}
                        />
                      </Label>
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <canvas 
                        ref={canvasRef} 
                        className="max-w-full max-h-full object-contain shadow-lg rounded-md"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Chartes de Couleurs
                  </CardTitle>
                  <CardDescription>
                    Choisissez une marque et une teinte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="benjaminMoore" onValueChange={setActiveBrand} className="w-full">
                    <TabsList className="grid grid-cols-2 mb-4 h-auto">
                      <TabsTrigger value="benjaminMoore" className="py-2">B. Moore</TabsTrigger>
                      <TabsTrigger value="sherwinWilliams" className="py-2">Sherwin</TabsTrigger>
                      <TabsTrigger value="sico" className="py-2">SICO</TabsTrigger>
                      <TabsTrigger value="dulux" className="py-2">Dulux</TabsTrigger>
                    </TabsList>
                    
                    {Object.entries(colorPalettes).map(([brand, colors]) => (
                      <TabsContent key={brand} value={brand} className="mt-0">
                        <div className="grid grid-cols-2 gap-3">
                          {colors.map((color) => (
                            <button
                              key={color.id}
                              onClick={() => setSelectedColor(color.hex)}
                              className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                                selectedColor === color.hex 
                                  ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              }`}
                            >
                              <div 
                                className="w-full h-12 rounded-md mb-2 shadow-sm border border-black/10"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="text-xs font-semibold truncate w-full text-center">{color.name}</span>
                              <span className="text-[10px] text-muted-foreground">{color.id}</span>
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  <div className="mt-8 pt-6 border-t">
                    <Label className="mb-3 block">Couleur sélectionnée (Code HEX)</Label>
                    <div className="flex gap-3">
                      <div 
                        className="w-10 h-10 rounded-md border shadow-sm shrink-0" 
                        style={{ backgroundColor: selectedColor }}
                      />
                      <Input 
                        value={selectedColor} 
                        onChange={(e) => setSelectedColor(e.target.value)}
                        placeholder="#FFFFFF" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5" />
                    Réglages
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Une fois la couleur simulée, vous pouvez l'enregistrer avec les informations du projet.
                  </p>
                  <Button className="w-full gap-2" variant="outline" disabled={!image}>
                    <Save className="h-4 w-4" />
                    Sauvegarder la simulation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

        </main>
      </div>
    </SidebarProvider>
  );
};

export default ColorVisualizer;
