"use client";

import { FormEvent, useEffect, useState } from "react";
import { BellRing, LoaderCircle, Save } from "lucide-react";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Loading } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useAppSettings } from "@/components/providers/app-settings-provider";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appRoles } from "@/constants/roles";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/types/auth";

type PendingAction = "role" | "fcm-token" | "notification";

type ManagedUser = {
  user_id: string;
  email: string | null;
  role: AppRole;
  created_at: string;
  last_sign_in_at: string | null;
  fcm_token: string | null;
};

type PendingState = {
  userId: string;
  action: PendingAction;
};

type SendNotificationResponse = {
  message?: string;
  messageId?: string;
  error?: string;
};

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  const functionError = error as { message?: unknown; context?: unknown };

  if (functionError.context instanceof Response) {
    try {
      const result = (await functionError.context.clone().json()) as {
        error?: unknown;
      };
      if (typeof result.error === "string") return result.error;
    } catch {
      // Response không có JSON; dùng message mặc định bên dưới.
    }
  }

  return typeof functionError.message === "string"
    ? functionError.message
    : "Không thể gửi thông báo.";
}

export function UserManagement() {
  const { locale, t } = useAppSettings();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, AppRole>>({});
  const [draftFcmTokens, setDraftFcmTokens] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingState | null>(null);
  const [notificationTarget, setNotificationTarget] =
    useState<ManagedUser | null>(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      const supabase = createClient();
      const { data, error: loadError } = await supabase.rpc("admin_list_users");

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
      } else {
        const loadedUsers = (data ?? []) as ManagedUser[];
        setUsers(loadedUsers);
        setDraftRoles(
          Object.fromEntries(
            loadedUsers.map((user) => [user.user_id, user.role]),
          ),
        );
        setDraftFcmTokens(
          Object.fromEntries(
            loadedUsers.map((user) => [user.user_id, user.fcm_token ?? ""]),
          ),
        );
      }
      setLoading(false);
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, []);

  function isPending(userId: string, action: PendingAction) {
    return pending?.userId === userId && pending.action === action;
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString(locale === "vi" ? "vi-VN" : "en-US");
  }

  async function updateRole(user: ManagedUser) {
    const newRole = draftRoles[user.user_id] ?? user.role;
    if (newRole === user.role) return;

    setPending({ userId: user.user_id, action: "role" });
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error: updateError } = await supabase.rpc("admin_update_user_role", {
      target_user_id: user.user_id,
      new_role: newRole,
    });

    if (updateError) {
      setError(updateError.message);
      setPending(null);
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.user_id === user.user_id ? { ...item, role: newRole } : item,
      ),
    );
    setMessage(
      locale === "vi"
        ? `Đã cập nhật role cho ${user.email ?? user.user_id}.`
        : `Role updated for ${user.email ?? user.user_id}.`,
    );
    setPending(null);
  }

  async function updateFcmToken(user: ManagedUser) {
    const newFcmToken = (draftFcmTokens[user.user_id] ?? "").trim();
    if (newFcmToken === (user.fcm_token ?? "")) return;

    setPending({ userId: user.user_id, action: "fcm-token" });
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error: updateError } = await supabase.rpc(
      "admin_update_user_fcm_token",
      {
        target_user_id: user.user_id,
        new_fcm_token: newFcmToken || null,
      },
    );

    if (updateError) {
      setError(updateError.message);
      setPending(null);
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.user_id === user.user_id
          ? { ...item, fcm_token: newFcmToken || null }
          : item,
      ),
    );
    setDraftFcmTokens((current) => ({
      ...current,
      [user.user_id]: newFcmToken,
    }));
    setMessage(
      locale === "vi"
        ? `${newFcmToken ? "Đã cập nhật" : "Đã xóa"} FCM token của ${user.email ?? user.user_id}.`
        : `${newFcmToken ? "Updated" : "Removed"} the FCM token for ${user.email ?? user.user_id}.`,
    );
    setPending(null);
  }

  function openNotification(user: ManagedUser) {
    setError("");
    setMessage("");
    setNotificationTitle(t("users.defaultNotificationTitle"));
    setNotificationBody("");
    setNotificationTarget(user);
  }

  async function sendNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notificationTarget) return;

    const title = notificationTitle.trim();
    const body = notificationBody.trim();
    if (!title || !body) return;

    setPending({
      userId: notificationTarget.user_id,
      action: "notification",
    });
    setError("");
    setMessage("");

    const supabase = createClient();
    const { data, error: sendError } = await supabase.functions.invoke(
      "send-fcm-notification",
      {
        body: {
          userId: notificationTarget.user_id,
          title,
          body,
        },
      },
    );

    if (sendError) {
      setError(await getFunctionErrorMessage(sendError));
      setPending(null);
      return;
    }

    const responseData = data as SendNotificationResponse | null;
    if (responseData?.error) {
      setError(responseData.error);
      setPending(null);
      return;
    }

    setMessage(
      locale === "vi"
        ? `Đã gửi thông báo tới ${notificationTarget.email ?? notificationTarget.user_id}.`
        : `Notification sent to ${notificationTarget.email ?? notificationTarget.user_id}.`,
    );
    setPending(null);
    setNotificationTarget(null);
  }

  const columns: DataTableColumn<ManagedUser>[] = [
    {
      id: "email",
      header: t("users.email"),
      className: "min-w-56",
      cell: (user) => (
        <div className="max-w-64">
          <p className="truncate font-medium">
            {user.email ?? t("users.noEmail")}
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {user.user_id}
          </p>
        </div>
      ),
    },
    {
      id: "created-at",
      header: t("users.createdAt"),
      className: "min-w-40",
      cell: (user) => (
        <span className="text-muted-foreground">{formatDate(user.created_at)}</span>
      ),
    },
    {
      id: "last-sign-in",
      header: t("users.lastSignIn"),
      className: "min-w-40",
      cell: (user) => (
        <span className="text-muted-foreground">
          {user.last_sign_in_at
            ? formatDate(user.last_sign_in_at)
            : t("users.neverSignedIn")}
        </span>
      ),
    },
    {
      id: "role",
      header: t("users.role"),
      className: "min-w-56",
      cell: (user) => {
        const selectedRole = draftRoles[user.user_id] ?? user.role;
        const rowPending = pending?.userId === user.user_id;

        return (
          <div className="flex items-center gap-2">
            <select
              aria-label={`${t("users.role")}: ${user.email ?? user.user_id}`}
              className="h-9 min-w-28 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              disabled={rowPending}
              onChange={(event) =>
                setDraftRoles((current) => ({
                  ...current,
                  [user.user_id]: event.target.value as AppRole,
                }))
              }
              value={selectedRole}
            >
              {appRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <Button
              disabled={rowPending || selectedRole === user.role}
              onClick={() => void updateRole(user)}
              size="sm"
              type="button"
            >
              {isPending(user.user_id, "role") ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Save />
              )}
              {isPending(user.user_id, "role")
                ? t("users.saving")
                : t("users.saveRole")}
            </Button>
          </div>
        );
      },
    },
    {
      id: "fcm",
      header: t("users.fcm"),
      className: "min-w-[25rem]",
      cell: (user) => {
        const selectedFcmToken = draftFcmTokens[user.user_id] ?? "";
        const fcmTokenChanged =
          selectedFcmToken.trim() !== (user.fcm_token ?? "");
        const rowPending = pending?.userId === user.user_id;

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`FCM token: ${user.email ?? user.user_id}`}
                className="min-w-56 font-mono text-xs"
                disabled={rowPending}
                maxLength={4096}
                onChange={(event) =>
                  setDraftFcmTokens((current) => ({
                    ...current,
                    [user.user_id]: event.target.value,
                  }))
                }
                placeholder={t("users.tokenPlaceholder")}
                type="text"
                value={selectedFcmToken}
              />
              <StatusBadge
                label={user.fcm_token ? "FCM" : "No token"}
                variant={user.fcm_token ? "success" : "neutral"}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={rowPending || !fcmTokenChanged}
                onClick={() => void updateFcmToken(user)}
                size="sm"
                type="button"
                variant="outline"
              >
                {isPending(user.user_id, "fcm-token") ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Save />
                )}
                {isPending(user.user_id, "fcm-token")
                  ? t("users.saving")
                  : t("users.saveToken")}
              </Button>
              <Button
                disabled={rowPending || !user.fcm_token || fcmTokenChanged}
                onClick={() => openNotification(user)}
                size="sm"
                type="button"
              >
                <BellRing />
                {t("users.send")}
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description={t("users.description")}
        eyebrow={t("users.eyebrow")}
        title={t("users.title")}
      />

      {error && !notificationTarget ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <Loading label={t("users.loading")} />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={users}
              emptyState={
                <EmptyState
                  className="m-5"
                  description={t("users.emptyDescription")}
                  title={t("users.emptyTitle")}
                />
              }
              getRowId={(user) => user.user_id}
            />
          </CardContent>
        </Card>
      )}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !pending) setNotificationTarget(null);
        }}
        open={Boolean(notificationTarget)}
      >
        <AlertDialogContent>
          <form className="space-y-5" onSubmit={sendNotification}>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("users.sendTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("users.recipient")}: {notificationTarget?.email ?? notificationTarget?.user_id}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {error ? (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="space-y-4">
              <label className="grid gap-2 text-sm font-medium">
                {t("users.notificationTitle")}
                <Input
                  autoFocus
                  maxLength={200}
                  onChange={(event) => setNotificationTitle(event.target.value)}
                  required
                  value={notificationTitle}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {t("users.notificationBody")}
                <Textarea
                  maxLength={1000}
                  onChange={(event) => setNotificationBody(event.target.value)}
                  required
                  rows={5}
                  value={notificationBody}
                />
              </label>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(pending)} type="button">
                {t("common.cancel")}
              </AlertDialogCancel>
              <Button disabled={Boolean(pending)} type="submit">
                {pending?.action === "notification" ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <BellRing />
                )}
                {pending?.action === "notification"
                  ? t("users.sending")
                  : t("users.send")}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
