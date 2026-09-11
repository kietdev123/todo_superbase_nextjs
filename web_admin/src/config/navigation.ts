import type { MessageKey } from "@/config/i18n";
import type { AppRole } from "@/types/auth";

export type NavigationIcon = "dashboard" | "todos" | "users" | "roles";

export type NavigationItem = {
  titleKey: MessageKey;
  href: string;
  icon: NavigationIcon;
  roles?: AppRole[];
};

export const navigationItems: NavigationItem[] = [
  {
    titleKey: "nav.dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    titleKey: "nav.todos",
    href: "/todos",
    icon: "todos",
  },
  {
    titleKey: "nav.users",
    href: "/users",
    icon: "users",
    roles: ["super_admin"],
  },
  {
    titleKey: "nav.roles",
    href: "/roles",
    icon: "roles",
    roles: ["super_admin"],
  },
];
