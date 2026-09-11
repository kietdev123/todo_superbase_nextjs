import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppSettingsProvider } from "@/components/providers/app-settings-provider";
import { appConfig } from "@/config/app";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s · ${appConfig.name}`,
  },
  description: "Trang quản trị Supabase sử dụng Next.js App Router",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <AppSettingsProvider>{children}</AppSettingsProvider>
      </body>
    </html>
  );
}
