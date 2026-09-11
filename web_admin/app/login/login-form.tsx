"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("Email hoặc mật khẩu không đúng.");
      setPending(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="form-stack" onSubmit={login}>
      {error ? <p className="error-message">{error}</p> : null}

      <label className="field">
        Email
        <input
          autoComplete="email"
          name="email"
          placeholder="admin@example.com"
          required
          type="email"
        />
      </label>

      <label className="field">
        Mật khẩu
        <input
          autoComplete="current-password"
          minLength={6}
          name="password"
          required
          type="password"
        />
      </label>

      <button className="button" disabled={pending} type="submit">
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}

