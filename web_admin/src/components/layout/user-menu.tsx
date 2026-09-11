"use client";

import { Languages, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import { useAppSettings } from "@/components/providers/app-settings-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { roleLabels } from "@/constants/roles";
import { createClient } from "@/lib/supabase/client";
import type { AppRole, AuthUser } from "@/types/auth";

function getInitials(user: AuthUser) {
  const source = user.name || user.email || "User";
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ user, role }: { user: AuthUser; role: AppRole }) {
  const router = useRouter();
  const { locale, setLocale, t } = useAppSettings();
  const { theme, setTheme } = useTheme();
  const displayName = user.name || user.email?.split("@")[0] || "User";

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t("header.account")}
          className="h-11 max-w-64 justify-start gap-3 rounded-xl px-2 sm:px-3"
          variant="ghost"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            {getInitials(user)}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-sm font-semibold">{displayName}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {roleLabels[role]}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email ?? t("header.signedIn")}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Languages className="size-3.5" />
          {t("header.language")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          onValueChange={(value) => setLocale(value === "en" ? "en" : "vi")}
          value={locale}
        >
          <DropdownMenuRadioItem value="vi">
            {t("header.vietnamese")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">
            {t("header.english")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("header.theme")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={setTheme} value={theme ?? "system"}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 size-4" />
            {t("header.light")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 size-4" />
            {t("header.dark")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 size-4" />
            {t("header.system")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onSelect={() => void logout()}
        >
          <LogOut />
          {t("header.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
