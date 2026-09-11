import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { UserManagement } from "./user-management";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }

  if (!auth.isSuperAdmin) {
    redirect("/admin");
  }

  return (
    <section className="todo-panel" aria-label="Quản lý user">
      <header className="panel-heading">
        <div>
          <p className="eyebrow">Super Admin</p>
          <h1>Quản lý user</h1>
          <p className="subtitle">
            Xem tài khoản và cập nhật role. User phải đăng nhập lại sau khi đổi
            role để nhận claim mới.
          </p>
        </div>
      </header>

      <UserManagement />
    </section>
  );
}
