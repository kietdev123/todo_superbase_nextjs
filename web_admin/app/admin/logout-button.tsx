"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      className="button button-secondary"
      disabled={pending}
      onClick={logout}
      type="button"
    >
      {pending ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}
