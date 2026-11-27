"use client";

import { useSyncExternalStore } from "react";
import { SPLIT_VIEW_QUERY } from "./layout";

/**
 * How the open outcome is presented:
 *  - "split": inline, in the right-hand panel beside the index (wide screens)
 *  - "sheet": in a modal sheet over the index (tablets and phones)
 *  - "unknown": on the server and while hydrating. Both presentations are
 *    rendered and CSS shows the one that fits, so a deep link is correct
 *    before any JavaScript runs.
 */
export type EntryLayout = "split" | "sheet" | "unknown";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(SPLIT_VIEW_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getSnapshot = (): EntryLayout => (window.matchMedia(SPLIT_VIEW_QUERY).matches ? "split" : "sheet");
const getServerSnapshot = (): EntryLayout => "unknown";

export function useEntryLayout(): EntryLayout {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
