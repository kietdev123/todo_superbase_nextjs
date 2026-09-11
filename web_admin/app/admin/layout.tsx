import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

const roleLabels = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Quản trị công việc</p>
          <p className="admin-email">
            Đang đăng nhập: {auth.user.email} · {roleLabels[auth.role]}
          </p>
        </div>

        <LogoutButton />
      </header>

      <nav className="admin-nav" aria-label="Điều hướng quản trị">
        <Link href="/admin">Todo</Link>
        {auth.isSuperAdmin ? (
          <>
            <Link href="/admin/users">User</Link>
            <Link href="/admin/roles">Role</Link>
          </>
        ) : null}
      </nav>

      {children}
    </main>
  );
}
