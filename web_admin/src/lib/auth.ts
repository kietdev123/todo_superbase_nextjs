import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/auth";

type AppClaims = {
  sub?: unknown;
  email?: unknown;
  user_role?: unknown;
  user_metadata?: unknown;
};

function getAppRole(value: unknown): AppRole {
  if (value === "super_admin" || value === "admin") {
    return value;
  }

  return "user";
}

function getUserName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return undefined;

  const values = metadata as Record<string, unknown>;
  const name = values.full_name ?? values.name ?? values.display_name;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
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
      name: getUserName(claims.user_metadata),
    },
    role,
    isAdmin: role === "admin" || role === "super_admin",
    isSuperAdmin: role === "super_admin",
  };
}
