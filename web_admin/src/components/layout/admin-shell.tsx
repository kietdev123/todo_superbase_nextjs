"use client";

import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import type { AppRole, AuthUser } from "@/types/auth";

export function AdminShell({
  children,
  user,
  role,
}: {
  children: ReactNode;
  user: AuthUser;
  role: AppRole;
}) {
  const {
    collapsed,
    mobileOpen,
    setMobileOpen,
    toggleCollapsed,
  } = useSidebar();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapsed={toggleCollapsed}
        role={role}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onOpenNavigation={() => setMobileOpen(true)}
          role={role}
          user={user}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
