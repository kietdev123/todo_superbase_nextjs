"use client";

import {
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  ListTodo,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppSettings } from "@/components/providers/app-settings-provider";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app";
import {
  navigationItems,
  type NavigationIcon,
} from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/auth";

const iconMap: Record<NavigationIcon, LucideIcon> = {
  dashboard: CircleGauge,
  todos: ListTodo,
  users: Users,
  roles: ShieldCheck,
};

type SidebarProps = {
  role: AppRole;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

export function Sidebar({
  role,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useAppSettings();
  const visibleItems = navigationItems.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <>
      {mobileOpen ? (
        <button
          aria-label={t("sidebar.close")}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-[width,transform] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shadow-none",
          collapsed ? "md:w-20" : "md:w-64",
          mobileOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <CheckSquare2 className="size-5" />
          </div>
          <div className={cn("min-w-0", collapsed && "md:hidden")}>
            <p className="truncate text-sm font-bold">{appConfig.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/55">
              Supabase Console
            </p>
          </div>
          <Button
            aria-label={t("sidebar.close")}
            className="ml-auto md:hidden"
            onClick={onCloseMobile}
            size="icon"
            variant="ghost"
          >
            <X />
          </Button>
        </div>

        <nav
          aria-label={t("sidebar.navigation")}
          className="flex-1 space-y-1 overflow-y-auto p-3"
        >
          {visibleItems.map((item) => {
            const Icon = iconMap[item.icon];
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground/68 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active &&
                    "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                  collapsed && "md:justify-center md:px-0",
                )}
                href={item.href}
                key={item.href}
                onClick={onCloseMobile}
                title={collapsed ? t(item.titleKey) : undefined}
              >
                <Icon className="size-5 shrink-0" />
                <span className={cn("truncate", collapsed && "md:hidden")}>
                  {t(item.titleKey)}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "mb-2 rounded-xl bg-sidebar-accent/65 px-3 py-2.5",
              collapsed && "md:px-1 md:text-center",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45",
                collapsed && "md:hidden",
              )}
            >
              {t("sidebar.version")}
            </p>
            <p className="mt-0.5 text-xs font-semibold">v{appConfig.version}</p>
          </div>
          <Button
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className="hidden w-full justify-center text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:flex"
            onClick={onToggleCollapsed}
            variant="ghost"
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
            <span className={cn(collapsed && "hidden")}>
              {t("sidebar.collapse")}
            </span>
          </Button>
        </div>
      </aside>
    </>
  );
}
