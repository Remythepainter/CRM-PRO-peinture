import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useRevenueChartData, type DashboardPeriod } from "@/hooks/useDashboardData";
import { Loader2 } from "lucide-react";

const RevenueChart = ({ period = "month" }: { period?: DashboardPeriod }) => {
  const { data, isLoading } = useRevenueChartData(period);

  return (
    <Card className="border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold font-body">Revenus mensuels</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !data || data.every((d) => d.revenue === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-20">Aucun revenu enregistré</p>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 18%)" />
                <XAxis dataKey="month" stroke="hsl(220 10% 55%)" fontSize={12} />
                <YAxis stroke="hsl(220 10% 55%)" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220 13% 11%)",
                    border: "1px solid hsl(220 12% 18%)",
                    borderRadius: "8px",
                    color: "hsl(0 0% 95%)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} $`, ""]}
                />
                <Bar dataKey="revenue" fill="hsl(43 74% 49%)" radius={[4, 4, 0, 0]} name="Revenus" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
