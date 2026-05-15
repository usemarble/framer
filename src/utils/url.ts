import { MARBLE_IMAGE_HOSTS } from "../constants";

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

export function isAllowedMarbleImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" && MARBLE_IMAGE_HOSTS.has(parsed.hostname)
    );
  } catch {
    return false;
  }
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
