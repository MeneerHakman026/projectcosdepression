/**
 * Dot-path access into plain JSON content ("evidence.metrics.0.value"),
 * matching the paths used for validation errors (validation.toFieldErrors).
 */

export type ContentPath = string;

function segments(path: ContentPath): string[] {
  return path === "" ? [] : path.split(".");
}

export function getIn(value: unknown, path: ContentPath): unknown {
  let current = value;
  for (const key of segments(path)) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Returns a copy of `root` with the value at `path` replaced; untouched branches are shared. */
export function setIn<T>(root: T, path: ContentPath, next: unknown): T {
  const keys = segments(path);
  if (keys.length === 0) return next as T;

  const [head, ...rest] = keys;
  const container = root as unknown;
  const child = getIn(container, head);
  const updated = setIn(child, rest.join("."), next);

  if (Array.isArray(container)) {
    const copy = [...container];
    copy[Number(head)] = updated;
    return copy as T;
  }
  return { ...(container as Record<string, unknown>), [head]: updated } as T;
}

export function joinPath(...parts: (string | number)[]): ContentPath {
  return parts.filter((part) => part !== "").join(".");
}
