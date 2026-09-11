"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Circle, LoaderCircle, Plus, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Loading } from "@/components/common/loading";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { TablePagination } from "@/components/common/table-pagination";
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
  const { locale, t } = useAppSettings();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalTodos, setTotalTodos] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadTodos() {
      const rangeFrom = (page - 1) * pageSize;
      const supabase = createClient();
      const { data, error: loadError, count } = await supabase
        .from("todos")
        .select(todoColumns, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(rangeFrom, rangeFrom + pageSize - 1);

      if (!active) return;

      if (loadError) {
        setError(t("todos.loadError"));
      } else {
        setTodos((data ?? []) as Todo[]);
        setTotalTodos(count ?? 0);
      }
      setLoading(false);
    }

    void loadTodos();

    return () => {
      active = false;
    };
  }, [page, pageSize, reloadKey, t]);

  async function createTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;

    setCreating(true);
    setError("");

    const supabase = createClient();
    const { error: createError } = await supabase
      .from("todos")
      .insert({ owner_id: userId, title: normalizedTitle });

    if (createError) {
      setError(createError.message);
      setCreating(false);
      return;
    }

    setTitle("");
    setLoading(true);
    setPage(1);
    setReloadKey((current) => current + 1);
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

    const nextTotal = Math.max(0, totalTodos - 1);
    const nextPage =
      page > 1 && (page - 1) * pageSize >= nextTotal ? page - 1 : page;

    setLoading(true);
    setPage(nextPage);
    setReloadKey((current) => current + 1);
    setPendingId(null);
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString(locale === "vi" ? "vi-VN" : "en-US");
  }

  const columns: DataTableColumn<Todo>[] = [
    {
      id: "status",
      header: t("todos.status"),
      className: "min-w-44",
      cell: (todo) => (
        <button
          aria-label={`${t("todos.completed")}: ${todo.title}`}
          className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50"
          disabled={pendingId === todo.id}
          onClick={() => void toggleTodo(todo)}
          type="button"
        >
          {pendingId === todo.id ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : todo.completed ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : (
            <Circle className="size-4 text-muted-foreground" />
          )}
          <StatusBadge
            label={
              todo.completed ? t("todos.completed") : t("todos.pending")
            }
            variant={todo.completed ? "success" : "neutral"}
          />
        </button>
      ),
    },
    {
      id: "title",
      header: t("todos.todo"),
      className: "min-w-64",
      cell: (todo) => (
        <p
          className={
            todo.completed
              ? "max-w-xl break-words text-muted-foreground line-through"
              : "max-w-xl break-words font-medium text-foreground"
          }
        >
          {todo.title}
        </p>
      ),
    },
    ...(isAdmin
      ? [
          {
            id: "owner",
            header: t("todos.owner"),
            className: "min-w-64",
            cell: (todo: Todo) => (
              <span className="font-mono text-xs text-muted-foreground">
                {todo.owner_id}
              </span>
            ),
          },
        ]
      : []),
    {
      id: "created-at",
      header: t("todos.createdAt"),
      className: "min-w-44",
      cell: (todo) => (
        <span className="text-muted-foreground">{formatDate(todo.created_at)}</span>
      ),
    },
    {
      id: "actions",
      header: t("todos.actions"),
      className: "w-20 text-right",
      cell: (todo) => (
        <div className="flex justify-end">
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
        </div>
      ),
    },
  ];

  const pageCount = Math.max(1, Math.ceil(totalTodos / pageSize));
  const safePage = Math.min(page, pageCount);

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
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              className="rounded-none border-0"
              columns={columns}
              data={todos}
              emptyState={
                <EmptyState
                  className="m-5"
                  description={t("todos.emptyDescription")}
                  title={t("todos.emptyTitle")}
                />
              }
              getRowId={(todo) => todo.id}
            />
            {totalTodos > 0 ? (
              <TablePagination
                onPageChange={(nextPage) => {
                  setLoading(true);
                  setPage(nextPage);
                }}
                onPageSizeChange={(nextPageSize) => {
                  setLoading(true);
                  setPageSize(nextPageSize);
                  setPage(1);
                }}
                page={safePage}
                pageSize={pageSize}
                totalItems={totalTodos}
              />
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
