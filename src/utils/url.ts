export function hasAllowedScheme(
  url: string,
  allowedSchemes: readonly string[]
): boolean {
  try {
    const parsed = new URL(url);
    return allowedSchemes.includes(parsed.protocol.replace(":", ""));
  } catch {
    return false;
  }
}

export function isAllowedImageUrl(url: string): boolean {
  return hasAllowedScheme(url, ["https"]);
}

export function getValidatedNextPage(
  nextPage: unknown,
  currentPage: number
): number | null {
  if (
    typeof nextPage !== "number" ||
    !Number.isInteger(nextPage) ||
    nextPage <= currentPage
  ) {
    return null;
  }

  return nextPage;
}
