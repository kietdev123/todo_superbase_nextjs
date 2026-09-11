import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserManagement } from "@/components/users/user-management";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.isSuperAdmin) redirect("/dashboard");

  return <UserManagement />;
}
