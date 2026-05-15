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

export function ensureUniqueSlug(
  slug: string,
  usedSlugs: Set<string>,
  fallback: string
): string {
  if (!(usedSlugs.has(slug) || slug.length === 0)) {
    return slug;
  }

  const fallbackSlug = slugifyAndTruncate(fallback);
  const suffixBase = fallbackSlug || "item";
  let counter = 0;

  while (true) {
    const suffix = counter === 0 ? `-${suffixBase.slice(0, 8)}` : `-${counter}`;
    const prefix = slug.slice(0, MAX_SLUG_LENGTH - suffix.length);
    const candidate = `${prefix}${suffix}`;

    if (!usedSlugs.has(candidate)) {
      return candidate;
    }

    counter += 1;
  }
}
