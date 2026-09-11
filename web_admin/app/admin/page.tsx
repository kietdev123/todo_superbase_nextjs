import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { TodoList } from "./todo-list";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }

  return (
    <section className="todo-panel" aria-label="Danh sách todo">
      <header className="panel-heading">
        <div>
          <p className="eyebrow">Todo</p>
          <h1>Danh sách công việc</h1>
        </div>
      </header>

      <TodoList isAdmin={auth.isAdmin} userId={auth.user.id} />
    </section>
  );
}
