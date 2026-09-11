import type { AppRole } from "@/types/auth";

export const appRoles: AppRole[] = ["super_admin", "admin", "user"];

export const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
};
