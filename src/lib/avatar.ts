export interface AvatarCarrier {
  avatar_url?: string | null;
  avatarUrl?: string | null;
  photoUrl?: string | null;
}

/**
 * Extracts a usable avatar image URL from any supported user/profile shape
 * (`avatar_url`, `avatarUrl`, or `photoUrl`).
 */
export function getAvatarUrl(user?: AvatarCarrier | null): string | undefined {
  if (!user) return undefined;
  const candidate = user.avatar_url || user.avatarUrl || user.photoUrl;
  if (typeof candidate !== 'string') return undefined;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Detects dead `.getPublicUrl()` URLs pointing into the private `student-documents` bucket
 * and returns the underlying storage object path so a signed URL can be resolved.
 */
export function extractPrivateStudentDocAvatarPath(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/\/storage\/v1\/object\/public\/student-documents\/([^?#]+)/i);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return null;
}
