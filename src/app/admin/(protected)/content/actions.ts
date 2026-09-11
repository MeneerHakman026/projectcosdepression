"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/session";
import { upsertSiteContent } from "@/lib/admin/content";

export async function saveContentValue(key: string, formData: FormData): Promise<void> {
  await requireAdminSession();
  const value = String(formData.get("value") ?? "");
  await upsertSiteContent(key, value);
  revalidatePath("/admin/content");
}

export async function createContentKey(formData: FormData): Promise<void> {
  await requireAdminSession();
  const key = String(formData.get("key") ?? "").trim();
  if (!key) return;
  const value = String(formData.get("value") ?? "");
  await upsertSiteContent(key, value);
  revalidatePath("/admin/content");
}
