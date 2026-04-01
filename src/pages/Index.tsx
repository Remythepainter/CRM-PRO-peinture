import { useState } from "react";
import FollowUpSummary from "@/components/dashboard/FollowUpSummary";
import { motion } from "framer-motion";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import KpiCard from "@/components/dashboard/KpiCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import ConversionChart from "@/components/dashboard/ConversionChart";
import PipelineOverview from "@/components/dashboard/PipelineOverview";
import HotLeads from "@/components/dashboard/HotLeads";
import WeeklyHours from "@/components/dashboard/WeeklyHours";
import { DollarSign, TrendingUp, Clock, Target } from "lucide-react";
import { useMonthlyRevenue, usePipelineValue, useConversionRate, useClosingTime, type DashboardPeriod } from "@/hooks/useDashboardData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const periodLabels: Record<DashboardPeriod, string> = {
  month: "Ce mois",
  quarter: "Ce trimestre",
  year: "Cette année",
};

const fadeIn = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

const Dashboard = () => {
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const { isAdmin } = useUserRole();
  const { user } = useAuth();

  const revenue = useMonthlyRevenue(period);
  const pipeline = usePipelineValue(period);
  const conversion = useConversionRate(period);
  const closing = useClosingTime(period);

  const kpis = [
    { query: revenue, title: "Revenus", icon: DollarSign, fallbackValue: "—" },
    { query: pipeline, title: "Valeur pipeline", icon: TrendingUp, fallbackValue: "—" },
    { query: conversion, title: "Taux de conversion", icon: Target, fallbackValue: "—" },
    { query: closing, title: "Délai de fermeture", icon: Clock, fallbackValue: "—" },
  ];

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Utilisateur";

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
          {/* Header */}
          <motion.div variants={fadeIn} className="mb-8 bg-card rounded-2xl p-6 border-l-4 border-primary shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Bonjour, {firstName} 👋</h1>
              <p className="text-muted-foreground mt-2 text-lg">Voici un aperçu de vos chantiers et opérations aujourd'hui.</p>
            </div>
            <div className="hidden md:block p-4 bg-primary/10 rounded-full">
              <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </motion.div>

          {/* Period selector */}
          <motion.div variants={fadeIn} className="mb-6 flex justify-end">
            <Select value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {isAdmin === true && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map((kpi, i) => (
                <motion.div key={kpi.title} variants={fadeIn}>
                  <KpiCard
                    title={kpi.title}
                    value={kpi.query.isLoading ? "…" : kpi.query.data?.value ?? kpi.fallbackValue}
                    change={kpi.query.data?.change}
                    changeType={kpi.query.data?.changeType ?? "neutral"}
                    icon={kpi.icon}
                    delay={i * 100}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {isAdmin === true && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div variants={fadeIn}>
                <RevenueChart period={period} />
              </motion.div>
              <motion.div variants={fadeIn}>
                <ConversionChart period={period} />
              </motion.div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {isAdmin === true && (
              <motion.div variants={fadeIn}><PipelineOverview /></motion.div>
            )}
            {isAdmin === true && (
              <motion.div variants={fadeIn}><HotLeads /></motion.div>
            )}
            <motion.div variants={fadeIn}><WeeklyHours /></motion.div>
          </div>

          {isAdmin === true && (
            <motion.div variants={fadeIn} className="mt-6">
              <FollowUpSummary />
            </motion.div>
          )}

          {isAdmin !== true && (
            <motion.div variants={fadeIn} className="text-center py-8 text-muted-foreground text-sm">
              Contactez votre administrateur pour accéder aux rapports financiers détaillés.
            </motion.div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
