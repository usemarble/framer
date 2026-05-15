export const MARBLE_API_BASE = import.meta.env.DEV
  ? "/marble-api/v1"
  : "https://api.marblecms.com/v1";

export const MAX_PAGINATION_PAGES = 100;
export const MARBLE_IMAGE_HOSTS = new Set([
  "media.marblecms.com",
  "cdn.marblecms.com",
]);

export const PLUGIN_KEYS = {
  DATA_SOURCE_ID: "dataSourceId",
  API_KEY: "apiKey",
  SLUG_FIELD_ID: "slugFieldId",
} as const;
