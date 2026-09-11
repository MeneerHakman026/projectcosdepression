import "server-only";
import { sql } from "@/lib/db";
import { fetchEoiCount } from "./eoi";

export const RETENTION_DAYS = 14;

export type EoiSettings = {
  closesAt: Date | null;
  updatedAt: Date | null;
};

export type EoiStatus = "open" | "closed" | "scheduled_for_deletion" | "data_deleted";

export type EoiStatusInfo = {
  status: EoiStatus;
  closesAt: Date | null;
  deletionDate: Date | null;
};

type SettingsRow = {
  closes_at: string | Date | null;
  updated_at: string | Date | null;
};

function toDate(value: string | Date | null): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export async function getEoiSettings(): Promise<EoiSettings> {
  const rows = (await sql`SELECT closes_at, updated_at FROM eoi_settings WHERE id = 1`) as SettingsRow[];
  const row = rows[0];
  return {
    closesAt: toDate(row?.closes_at ?? null),
    updatedAt: toDate(row?.updated_at ?? null),
  };
}

export function computeDeletionDate(closesAt: Date | null): Date | null {
  if (!closesAt) return null;
  const deletionDate = new Date(closesAt);
  deletionDate.setUTCDate(deletionDate.getUTCDate() + RETENTION_DAYS);
  return deletionDate;
}

/**
 * Derives the four-way EOI status from the configured closing date and the
 * current record count:
 *  - open: no closing date set, or it's still in the future
 *  - closed: closing date has passed; retention window (14 days) running
 *  - scheduled_for_deletion: deletion date has passed but records still
 *    exist (the daily cron hasn't purged them yet)
 *  - data_deleted: deletion date has passed and no records remain
 */
export async function computeEoiStatus(): Promise<EoiStatusInfo> {
  const { closesAt } = await getEoiSettings();
  const deletionDate = computeDeletionDate(closesAt);
  const now = new Date();

  if (!closesAt || now < closesAt) {
    return { status: "open", closesAt, deletionDate };
  }

  if (deletionDate && now < deletionDate) {
    return { status: "closed", closesAt, deletionDate };
  }

  const count = await fetchEoiCount();
  return {
    status: count === 0 ? "data_deleted" : "scheduled_for_deletion",
    closesAt,
    deletionDate,
  };
}

export async function setEoiClosingDate(closesAt: Date | null): Promise<void> {
  await sql`
    INSERT INTO eoi_settings (id, closes_at, updated_at)
    VALUES (1, ${closesAt}, now())
    ON CONFLICT (id) DO UPDATE SET closes_at = EXCLUDED.closes_at, updated_at = now()
  `;
}
