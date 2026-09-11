"use client";

import { useEffect, useState } from "react";

const sidebarStorageKey = "todo-admin-sidebar-collapsed";

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCollapsed(window.localStorage.getItem(sidebarStorageKey) === "true");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const nextValue = !current;
      window.localStorage.setItem(sidebarStorageKey, String(nextValue));
      return nextValue;
    });
  }

  return {
    collapsed,
    mobileOpen,
    setMobileOpen,
    toggleCollapsed,
  };
}
