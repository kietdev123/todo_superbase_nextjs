"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppRole = "super_admin" | "admin" | "user";
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

const roleOptions: AppRole[] = ["super_admin", "admin", "user"];

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
      const { data, error: loadError } = await supabase.rpc(
        "admin_list_users",
      );

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

  async function updateRole(user: ManagedUser) {
    const newRole = draftRoles[user.user_id] ?? user.role;
    if (newRole === user.role) return;

    setPending({ userId: user.user_id, action: "role" });
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error: updateError } = await supabase.rpc(
      "admin_update_user_role",
      {
        target_user_id: user.user_id,
        new_role: newRole,
      },
    );

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
    setMessage(`Đã cập nhật role cho ${user.email ?? user.user_id}.`);
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
      newFcmToken
        ? `Đã cập nhật FCM token cho ${user.email ?? user.user_id}.`
        : `Đã xóa FCM token của ${user.email ?? user.user_id}.`,
    );
    setPending(null);
  }

  function openNotification(user: ManagedUser) {
    setError("");
    setMessage("");
    setNotificationTitle("Thông báo mới");
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
      `Đã gửi thông báo tới ${notificationTarget.email ?? notificationTarget.user_id}.`,
    );
    setPending(null);
    setNotificationTarget(null);
  }

  if (loading) {
    return <p className="todo-empty">Đang tải danh sách user...</p>;
  }

  return (
    <>
      {error && !notificationTarget ? (
        <p className="status-message">{error}</p>
      ) : null}
      {message ? <p className="success-message">{message}</p> : null}

      <div className="table-scroll">
        <table className="management-table user-management-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Ngày tạo</th>
              <th>Đăng nhập gần nhất</th>
              <th>Role</th>
              <th>FCM token và thông báo</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const selectedRole = draftRoles[user.user_id] ?? user.role;
              const selectedFcmToken = draftFcmTokens[user.user_id] ?? "";
              const rowPending = pending?.userId === user.user_id;
              const fcmTokenChanged =
                selectedFcmToken.trim() !== (user.fcm_token ?? "");

              return (
                <tr key={user.user_id}>
                  <td>
                    <span className="table-primary">
                      {user.email ?? "Không có email"}
                    </span>
                    <small>{user.user_id}</small>
                  </td>
                  <td>{new Date(user.created_at).toLocaleString("vi-VN")}</td>
                  <td>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString("vi-VN")
                      : "Chưa đăng nhập"}
                  </td>
                  <td>
                    <div className="table-control-group">
                      <select
                        aria-label={`Role của ${user.email ?? user.user_id}`}
                        disabled={rowPending}
                        onChange={(event) =>
                          setDraftRoles((current) => ({
                            ...current,
                            [user.user_id]: event.target.value as AppRole,
                          }))
                        }
                        value={selectedRole}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        className="button button-compact"
                        disabled={rowPending || selectedRole === user.role}
                        onClick={() => updateRole(user)}
                        type="button"
                      >
                        {isPending(user.user_id, "role")
                          ? "Đang lưu..."
                          : "Lưu role"}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="notification-controls">
                      <input
                        aria-label={`FCM token của ${user.email ?? user.user_id}`}
                        disabled={rowPending}
                        maxLength={4096}
                        onChange={(event) =>
                          setDraftFcmTokens((current) => ({
                            ...current,
                            [user.user_id]: event.target.value,
                          }))
                        }
                        placeholder="Dán FCM registration token"
                        type="text"
                        value={selectedFcmToken}
                      />
                      <div className="table-actions">
                        <button
                          className="button button-secondary button-compact"
                          disabled={rowPending || !fcmTokenChanged}
                          onClick={() => updateFcmToken(user)}
                          type="button"
                        >
                          {isPending(user.user_id, "fcm-token")
                            ? "Đang lưu..."
                            : "Lưu token"}
                        </button>
                        <button
                          className="button button-compact"
                          disabled={
                            rowPending || !user.fcm_token || fcmTokenChanged
                          }
                          onClick={() => openNotification(user)}
                          type="button"
                        >
                          Gửi thông báo
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {notificationTarget ? (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !pending) {
              setNotificationTarget(null);
            }
          }}
          role="presentation"
        >
          <section
            aria-labelledby="notification-dialog-title"
            aria-modal="true"
            className="modal-card"
            role="dialog"
          >
            <h2 id="notification-dialog-title">Gửi thông báo FCM</h2>
            <p className="subtitle">
              Người nhận: {notificationTarget.email ?? notificationTarget.user_id}
            </p>

            {error ? <p className="status-message">{error}</p> : null}

            <form className="form-stack" onSubmit={sendNotification}>
              <label className="field">
                Tiêu đề
                <input
                  autoFocus
                  maxLength={200}
                  onChange={(event) => setNotificationTitle(event.target.value)}
                  required
                  value={notificationTitle}
                />
              </label>
              <label className="field">
                Nội dung
                <textarea
                  maxLength={1000}
                  onChange={(event) => setNotificationBody(event.target.value)}
                  required
                  rows={5}
                  value={notificationBody}
                />
              </label>
              <div className="modal-actions">
                <button
                  className="button button-secondary"
                  disabled={Boolean(pending)}
                  onClick={() => setNotificationTarget(null)}
                  type="button"
                >
                  Hủy
                </button>
                <button className="button" disabled={Boolean(pending)} type="submit">
                  {isPending(notificationTarget.user_id, "notification")
                    ? "Đang gửi..."
                    : "Gửi thông báo"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
