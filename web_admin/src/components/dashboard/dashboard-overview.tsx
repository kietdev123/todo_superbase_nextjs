"use client";

import { Activity, Database, PackageCheck } from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useAppSettings } from "@/components/providers/app-settings-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/config/app";
import { getHealthStatus } from "@/lib/api/health";

type BackendStatus = "checking" | "healthy" | "unavailable";

type StatusCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
};

function StatusCard({
  icon: Icon,
  title,
  description,
  children,
}: StatusCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DashboardOverview() {
  const { t } = useAppSettings();
  const [backendStatus, setBackendStatus] =
    useState<BackendStatus>("checking");

  useEffect(() => {
    const controller = new AbortController();

    getHealthStatus(controller.signal)
      .then((result) => {
        setBackendStatus(result.status === "ok" ? "healthy" : "unavailable");
      })
      .catch(() => {
        if (!controller.signal.aborted) setBackendStatus("unavailable");
      });

    return () => controller.abort();
  }, []);

  const backendLabel =
    backendStatus === "healthy"
      ? t("status.healthy")
      : backendStatus === "unavailable"
        ? t("status.unavailable")
        : t("status.checking");

  return (
    <div className="space-y-6">
      <PageHeader
        description={t("dashboard.description")}
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatusCard
          description={t("dashboard.supabaseDescription")}
          icon={Database}
          title={t("dashboard.supabase")}
        >
          <StatusBadge label={t("status.connected")} variant="success" />
        </StatusCard>

        <StatusCard
          description={t("dashboard.backendDescription")}
          icon={Activity}
          title={t("dashboard.backend")}
        >
          <StatusBadge
            label={backendLabel}
            variant={
              backendStatus === "healthy"
                ? "success"
                : backendStatus === "unavailable"
                  ? "danger"
                  : "warning"
            }
          />
        </StatusCard>

        <StatusCard
          description={t("dashboard.versionDescription")}
          icon={PackageCheck}
          title={t("dashboard.version")}
        >
          <p className="text-2xl font-bold tracking-tight">v{appConfig.version}</p>
        </StatusCard>
      </section>
    </div>
  );
}
