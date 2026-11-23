/**
 * Safely coerces any unknown value (string, Error, API error object, etc.) into a plain string.
 * Prevents runtime crashes like `TypeError: e.toLowerCase is not a function` when error payloads are objects.
 */
export function toSafeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidate =
      obj.message ??
      obj.error_description ??
      obj.msg ??
      obj.details ??
      obj.error;

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }

    if (candidate && typeof candidate === 'object') {
      const nested = toSafeString(candidate, '');
      if (nested) return nested;
    }
  }

  return fallback;
}

/**
 * Safely coerces any value to a trimmed lowercase string.
 */
export function toSafeLower(value: unknown, fallback = ''): string {
  return toSafeString(value, fallback).trim().toLowerCase();
}
