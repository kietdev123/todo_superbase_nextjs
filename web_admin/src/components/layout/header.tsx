"use client";

import { Menu } from "lucide-react";

import { useAppSettings } from "@/components/providers/app-settings-provider";
import { Button } from "@/components/ui/button";
import type { AppRole, AuthUser } from "@/types/auth";
import { UserMenu } from "@/components/layout/user-menu";

export function Header({
  user,
  role,
  onOpenNavigation,
}: {
  user: AuthUser;
  role: AppRole;
  onOpenNavigation: () => void;
}) {
  const { t } = useAppSettings();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6">
      <Button
        aria-label={t("header.openMenu")}
        className="md:hidden"
        onClick={onOpenNavigation}
        size="icon"
        variant="ghost"
      >
        <Menu />
      </Button>
      <div className="hidden md:block" />
      <UserMenu role={role} user={user} />
    </header>
  );
}
