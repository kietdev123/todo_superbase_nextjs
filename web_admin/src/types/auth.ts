export type AppRole = "super_admin" | "admin" | "user";

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
};
