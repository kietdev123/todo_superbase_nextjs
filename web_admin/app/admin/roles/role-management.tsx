"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppRole = "super_admin" | "admin" | "user";

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

const permissionLabels: Record<AppPermission, string> = {
  "todos.select_all": "Xem todo của mọi user",
  "todos.update_all": "Cập nhật todo của mọi user",
  "todos.delete_all": "Xóa todo của mọi user",
  "users.read": "Xem danh sách user",
  "users.update_role": "Cập nhật role của user",
  "users.update_fcm_token": "Cập nhật FCM token của user",
  "roles.read": "Xem permission của role",
  "roles.update_permission": "Cập nhật permission của role",
  "notifications.send": "Gửi thông báo FCM",
};

export function RoleManagement() {
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

  if (loading) {
    return <p className="todo-empty">Đang tải cấu hình role...</p>;
  }

  return (
    <>
      {error ? <p className="status-message">{error}</p> : null}

      <div className="role-grid">
        {roleOrder.map((role) => (
          <section className="role-card" key={role}>
            <h2>{role}</h2>
            <div className="permission-list">
              {rows
                .filter((row) => row.role === role)
                .map((row) => {
                  const key = `${row.role}:${row.permission}`;

                  return (
                    <label className="permission-item" key={row.permission}>
                      <input
                        checked={row.enabled}
                        disabled={role === "super_admin" || pendingKey === key}
                        onChange={(event) =>
                          setPermission(row, event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span>
                        {permissionLabels[row.permission]}
                        <small>{row.permission}</small>
                      </span>
                    </label>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
