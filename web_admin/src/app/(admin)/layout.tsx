import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/layout/admin-shell";
import { getAuthContext } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/login");
  }

  return (
    <AdminShell role={auth.role} user={auth.user}>
      {children}
    </AdminShell>
  );
}
