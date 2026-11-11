export function readPreference(key: string) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}
export function writePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage may be disabled in embedded views. */
  }
}
