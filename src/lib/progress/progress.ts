/**
 * Reading progress, stored only in this browser (no account, no server).
 * A page counts as read once the reader has scrolled through most of it.
 */
const KEY = 'course-progress-v1';

export function readDone(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

export function markDone(id: string): void {
  try {
    const s = readDone();
    s.add(id);
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    /* storage unavailable: progress is simply not kept */
  }
}

export function lastVisited(): string | null {
  try {
    return localStorage.getItem(`${KEY}:last`);
  } catch {
    return null;
  }
}

export function setLastVisited(id: string): void {
  try {
    localStorage.setItem(`${KEY}:last`, id);
  } catch {
    /* ignore */
  }
}
