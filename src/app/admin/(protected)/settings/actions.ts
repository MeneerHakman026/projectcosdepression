"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/session";
import { setEoiClosingDate } from "@/lib/admin/settings";

export type SettingsState = { error?: string; success?: boolean } | undefined;

export async function updateEoiClosingDate(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  await requireAdminSession();

  const raw = String(formData.get("closesAt") ?? "").trim();

  if (!raw) {
    await setEoiClosingDate(null);
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { success: true };
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Enter a valid date." };
  }

  await setEoiClosingDate(parsed);
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { success: true };
}
