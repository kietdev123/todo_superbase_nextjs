import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { RoleManagement } from "./role-management";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }

  if (!auth.isSuperAdmin) {
    redirect("/admin");
  }

  return (
    <section className="todo-panel" aria-label="Quản lý role">
      <header className="panel-heading">
        <div>
          <p className="eyebrow">Super Admin</p>
          <h1>Quản lý role</h1>
          <p className="subtitle">
            Bật hoặc tắt các permission đã định nghĩa sẵn cho từng role.
            Permission của super_admin luôn được bật.
          </p>
        </div>
      </header>

      <RoleManagement />
    </section>
  );
}
