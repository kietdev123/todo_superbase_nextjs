"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Todo = {
  id: string;
  owner_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type TodoListProps = {
  isAdmin: boolean;
  userId: string;
};

const todoColumns = "id, owner_id, title, completed, created_at, updated_at";

export function TodoList({ isAdmin, userId }: TodoListProps) {
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
        setError(
          "Không thể tải dữ liệu. Hãy kiểm tra migration và cấu hình Supabase.",
        );
      } else {
        setTodos((data ?? []) as Todo[]);
      }
      setLoading(false);
    }

    void loadTodos();

    return () => {
      active = false;
    };
  }, []);

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
    <>
      <form className="todo-form" onSubmit={createTodo}>
        <input
          aria-label="Tiêu đề todo mới"
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nhập công việc mới..."
          required
          value={title}
        />
        <button className="button" disabled={creating} type="submit">
          {creating ? "Đang thêm..." : "Thêm todo"}
        </button>
      </form>

      {error ? <p className="status-message">{error}</p> : null}

      {loading ? (
        <p className="todo-empty">Đang tải dữ liệu...</p>
      ) : todos.length === 0 ? (
        <p className="todo-empty">Chưa có công việc nào.</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li className="todo-item" key={todo.id}>
              <input
                aria-label={`Đánh dấu ${todo.title}`}
                checked={todo.completed}
                disabled={pendingId === todo.id}
                onChange={() => toggleTodo(todo)}
                type="checkbox"
              />
              <span className="todo-copy">
                <span className={todo.completed ? "todo-title-completed" : ""}>
                  {todo.title}
                </span>
                {isAdmin ? (
                  <small className="todo-owner">Owner: {todo.owner_id}</small>
                ) : null}
              </span>
              <button
                className="button button-danger"
                disabled={pendingId === todo.id}
                onClick={() => deleteTodo(todo.id)}
                type="button"
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

