"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";

import { Loading } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useAppSettings } from "@/components/providers/app-settings-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MessageKey } from "@/config/i18n";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/auth";

type AppPermission =
  | "todos.select_all"
  | "todos.update_all"
  | "todos.delete_all"
  | "users.read"
  | "users.update_role"
  | "users.update_fcm_token"
  | "roles.read"
  | "roles.update_permission"
  | "notifications.send";

type RolePermission = {
  role: AppRole;
  permission: AppPermission;
  enabled: boolean;
};

const roleOrder: AppRole[] = ["super_admin", "admin", "user"];

const permissionLabelKeys: Record<AppPermission, MessageKey> = {
  "todos.select_all": "permission.todos.select_all",
  "todos.update_all": "permission.todos.update_all",
  "todos.delete_all": "permission.todos.delete_all",
  "users.read": "permission.users.read",
  "users.update_role": "permission.users.update_role",
  "users.update_fcm_token": "permission.users.update_fcm_token",
  "roles.read": "permission.roles.read",
  "roles.update_permission": "permission.roles.update_permission",
  "notifications.send": "permission.notifications.send",
};

export function RoleManagement() {
  const { t } = useAppSettings();
  const [rows, setRows] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRolePermissions() {
      const supabase = createClient();
      const { data, error: loadError } = await supabase.rpc(
        "admin_list_role_permissions",
      );

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
      } else {
        setRows((data ?? []) as RolePermission[]);
      }
      setLoading(false);
    }

    void loadRolePermissions();

    return () => {
      active = false;
    };
  }, []);

  async function setPermission(row: RolePermission, enabled: boolean) {
    const key = `${row.role}:${row.permission}`;
    setPendingKey(key);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.rpc(
      "admin_set_role_permission",
      {
        target_role: row.role,
        target_permission: row.permission,
        permission_enabled: enabled,
      },
    );

    if (updateError) {
      setError(updateError.message);
      setPendingKey(null);
      return;
    }

    setRows((current) =>
      current.map((item) =>
        item.role === row.role && item.permission === row.permission
          ? { ...item, enabled }
          : item,
      ),
    );
    setPendingKey(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description={t("roles.description")}
        eyebrow={t("roles.eyebrow")}
        title={t("roles.title")}
      />

      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <Loading label={t("roles.loading")} />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {roleOrder.map((role) => (
            <Card key={role}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <CardTitle className="text-base">{role}</CardTitle>
                </div>
                {role === "super_admin" ? (
                  <StatusBadge label={t("roles.locked")} variant="success" />
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2">
                {rows
                  .filter((row) => row.role === role)
                  .map((row) => {
                    const key = `${row.role}:${row.permission}`;
                    const pending = pendingKey === key;

                    return (
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/40",
                          role === "super_admin" && "cursor-not-allowed opacity-75",
                        )}
                        key={row.permission}
                      >
                        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
                          <input
                            checked={row.enabled}
                            className="size-4 accent-primary"
                            disabled={role === "super_admin" || pending}
                            onChange={(event) =>
                              void setPermission(row, event.target.checked)
                            }
                            type="checkbox"
                          />
                          {pending ? (
                            <LoaderCircle className="absolute size-5 animate-spin text-primary" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-5">
                            {t(permissionLabelKeys[row.permission])}
                          </span>
                          <span className="mt-1 block break-all font-mono text-[11px] text-muted-foreground">
                            {row.permission}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
