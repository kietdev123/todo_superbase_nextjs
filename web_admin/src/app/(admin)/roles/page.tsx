import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RoleManagement } from "@/components/roles/role-management";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Roles" };
export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.isSuperAdmin) redirect("/dashboard");

  return <RoleManagement />;
}
