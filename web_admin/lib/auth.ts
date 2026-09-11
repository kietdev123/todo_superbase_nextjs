import { createClient } from "@/lib/supabase/server";

type AppClaims = {
  sub?: unknown;
  email?: unknown;
  user_role?: unknown;
};

export type AppRole = "super_admin" | "admin" | "user";

function getAppRole(value: unknown): AppRole {
  if (value === "super_admin" || value === "admin") {
    return value;
  }

  return "user";
}

export async function getAuthContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as AppClaims | undefined;

  if (error || typeof claims?.sub !== "string") {
    return null;
  }

  const role = getAppRole(claims.user_role);

  return {
    supabase,
    user: {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
    },
    role,
    isAdmin: role === "admin" || role === "super_admin",
    isSuperAdmin: role === "super_admin",
  };
}
