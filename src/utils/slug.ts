export const MAX_SLUG_LENGTH = 60;

export function slugifyAndTruncate(value: string): string {
  const slugified = value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slugified.slice(0, MAX_SLUG_LENGTH);
}
