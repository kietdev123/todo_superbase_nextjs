"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Circle, LoaderCircle, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Loading } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { useAppSettings } from "@/components/providers/app-settings-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Todo } from "@/types/todo";

type TodoListProps = {
  isAdmin: boolean;
  userId: string;
};

const todoColumns = "id, owner_id, title, completed, created_at, updated_at";

export function TodoList({ isAdmin, userId }: TodoListProps) {
  const { t } = useAppSettings();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTodos() {
      const supabase = createClient();
      const { data, error: loadError } = await supabase
        .from("todos")
        .select(todoColumns)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (loadError) {
        setError(t("todos.loadError"));
      } else {
        setTodos((data ?? []) as Todo[]);
      }
      setLoading(false);
    }

    void loadTodos();

    return () => {
      active = false;
    };
  }, [t]);

  async function createTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;

    setCreating(true);
    setError("");

    const supabase = createClient();
    const { data, error: createError } = await supabase
      .from("todos")
      .insert({ owner_id: userId, title: normalizedTitle })
      .select(todoColumns)
      .single();

    if (createError) {
      setError(createError.message);
      setCreating(false);
      return;
    }

    setTodos((current) => [data as Todo, ...current]);
    setTitle("");
    setCreating(false);
  }

  async function toggleTodo(todo: Todo) {
    setPendingId(todo.id);
    setError("");

    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("todos")
      .update({ completed: !todo.completed })
      .eq("id", todo.id)
      .select(todoColumns)
      .single();

    if (updateError) {
      setError(updateError.message);
      setPendingId(null);
      return;
    }

    const updated = data as Todo;
    setTodos((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setPendingId(null);
  }

  async function deleteTodo(id: string) {
    setPendingId(id);
    setError("");

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("todos")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      setPendingId(null);
      return;
    }

    setTodos((current) => current.filter((todo) => todo.id !== id));
    setPendingId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          isAdmin
            ? t("todos.description.admin")
            : t("todos.description.user")
        }
        eyebrow={t("todos.eyebrow")}
        title={t("todos.title")}
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={createTodo}>
            <Input
              aria-label={t("todos.newLabel")}
              className="flex-1"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("todos.placeholder")}
              required
              value={title}
            />
            <Button disabled={creating} type="submit">
              {creating ? <LoaderCircle className="animate-spin" /> : <Plus />}
              {creating ? t("todos.adding") : t("todos.add")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <Loading label={t("todos.loading")} />
        </Card>
      ) : todos.length === 0 ? (
        <EmptyState
          description={t("todos.emptyDescription")}
          title={t("todos.emptyTitle")}
        />
      ) : (
        <div className="space-y-3">
          {todos.map((todo) => (
            <Card className="transition-colors hover:border-primary/25" key={todo.id}>
              <CardContent className="flex items-center gap-3 p-4 sm:gap-4">
                <button
                  aria-label={`${t("todos.completed")}: ${todo.title}`}
                  className="shrink-0 rounded-full text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50"
                  disabled={pendingId === todo.id}
                  onClick={() => void toggleTodo(todo)}
                  type="button"
                >
                  {pendingId === todo.id ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : todo.completed ? (
                    <CheckCircle2 className="size-5 text-primary" />
                  ) : (
                    <Circle className="size-5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={
                      todo.completed
                        ? "break-words text-sm text-muted-foreground line-through"
                        : "break-words text-sm font-medium text-foreground"
                    }
                  >
                    {todo.title}
                  </p>
                  {isAdmin ? (
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      {t("todos.owner")}: {todo.owner_id}
                    </p>
                  ) : null}
                </div>

                <div className="hidden shrink-0 sm:block">
                  <StatusBadge
                    label={
                      todo.completed
                        ? t("todos.completed")
                        : t("todos.pending")
                    }
                    variant={todo.completed ? "success" : "neutral"}
                  />
                </div>

                <ConfirmDialog
                  cancelLabel={t("common.cancel")}
                  confirmLabel={t("todos.delete")}
                  description={t("todos.deleteDescription")}
                  destructive
                  onConfirm={() => deleteTodo(todo.id)}
                  title={t("todos.deleteTitle")}
                >
                  <Button
                    aria-label={`${t("todos.delete")}: ${todo.title}`}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={pendingId === todo.id}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 />
                  </Button>
                </ConfirmDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
