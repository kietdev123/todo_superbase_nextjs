"use client";

import { FormEvent, useState } from "react";
import { CheckSquare2, LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAppSettings } from "@/components/providers/app-settings-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appConfig } from "@/config/app";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const { t } = useAppSettings();
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
      setError(t("login.error"));
      setPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <Card className="relative z-10 w-full max-w-md border-border/70 shadow-2xl shadow-primary/5">
      <CardHeader className="space-y-4 pb-5 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <CheckSquare2 className="size-6" />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {appConfig.name}
          </p>
          <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
          <CardDescription className="mt-2 leading-6">
            {t("login.description")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={login}>
          {error ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <label className="grid gap-2 text-sm font-medium">
            {t("login.email")}
            <Input
              autoComplete="email"
              name="email"
              placeholder="admin@example.com"
              required
              type="email"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {t("login.password")}
            <Input
              autoComplete="current-password"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>

          <Button className="mt-2 w-full" disabled={pending} type="submit">
            {pending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <LockKeyhole />
            )}
            {pending ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
