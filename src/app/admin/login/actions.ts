"use server";

import { redirect } from "next/navigation";
import { verifyAdminPassword } from "@/lib/admin/auth";
import { establishAdminSession } from "@/lib/admin/session";

export type LoginState = { error: string } | undefined;

export async function loginAdmin(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return {
      error:
        "Admin access isn't configured yet. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in the environment.",
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    return { error: "Incorrect password." };
  }

  await establishAdminSession(String(formData.get("editorName") ?? ""));
  redirect("/admin");
}
