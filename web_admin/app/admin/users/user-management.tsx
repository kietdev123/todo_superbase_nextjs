"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppRole = "super_admin" | "admin" | "user";

type ManagedUser = {
  user_id: string;
  email: string | null;
  role: AppRole;
  created_at: string;
  last_sign_in_at: string | null;
};

const roleOptions: AppRole[] = ["super_admin", "admin", "user"];

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, AppRole>>({});
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
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
      }
      setLoading(false);
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, []);

  async function updateRole(user: ManagedUser) {
    const newRole = draftRoles[user.user_id] ?? user.role;
    if (newRole === user.role) return;

    setPendingId(user.user_id);
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
      setPendingId(null);
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.user_id === user.user_id ? { ...item, role: newRole } : item,
      ),
    );
    setMessage(`Đã cập nhật role cho ${user.email ?? user.user_id}.`);
    setPendingId(null);
  }

  if (loading) {
    return <p className="todo-empty">Đang tải danh sách user...</p>;
  }

  return (
    <>
      {error ? <p className="status-message">{error}</p> : null}
      {message ? <p className="success-message">{message}</p> : null}

      <div className="table-scroll">
        <table className="management-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Ngày tạo</th>
              <th>Đăng nhập gần nhất</th>
              <th>Role</th>
              <th aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const selectedRole = draftRoles[user.user_id] ?? user.role;
              const pending = pendingId === user.user_id;

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
                    <select
                      aria-label={`Role của ${user.email ?? user.user_id}`}
                      disabled={pending}
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
                  </td>
                  <td>
                    <button
                      className="button button-compact"
                      disabled={pending || selectedRole === user.role}
                      onClick={() => updateRole(user)}
                      type="button"
                    >
                      {pending ? "Đang lưu..." : "Lưu"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
