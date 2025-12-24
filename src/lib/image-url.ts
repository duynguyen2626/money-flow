/**
 * Canonical helper for picking image URLs from entities.
 * Prefers image_url, falls back to logo_url (for backward compatibility if any remains),
 * and handles nulls/undefined gracefully.
 */
export function pickImageUrl(
  entity: { image_url?: string | null; logo_url?: string | null } | null | undefined
): string | null {
  if (!entity) return null;
  return entity.image_url ?? entity.logo_url ?? null;
}
