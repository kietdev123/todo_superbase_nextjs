import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TodoList } from "@/components/todos/todo-list";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = { title: "Todos" };
export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  return <TodoList isAdmin={auth.isAdmin} userId={auth.user.id} />;
}
