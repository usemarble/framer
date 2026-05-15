import {
  type FieldDataInput,
  framer,
  type ManagedCollection,
  type ManagedCollectionFieldInput,
  type ManagedCollectionItemInput,
  type ProtectedMethod,
} from "framer-plugin";
import {
  MARBLE_API_BASE,
  MAX_PAGINATION_PAGES,
  PLUGIN_KEYS,
} from "../constants";
import type { DataSource, MarbleItem } from "../types";
import { getFieldsForResource } from "./fields";
import { mapItemToFieldData } from "./mappers";
import { ensureUniqueSlug, MAX_SLUG_LENGTH, slugifyAndTruncate } from "./slug";
import { getValidatedNextPage } from "./url";

export async function getDataSource(
  dataSourceId: string,
  apiKey: string,
  abortSignal?: AbortSignal
): Promise<DataSource> {
  const allItems: MarbleItem[] = [];
  let page = 1;
  let reachedPaginationLimit = true;

  // Fetch all pages (Marble API max limit is 100 per page)
  for (let iteration = 0; iteration < MAX_PAGINATION_PAGES; iteration++) {
    const url = `${MARBLE_API_BASE}/${dataSourceId}?limit=100&page=${page}`;
    console.log(`[Marble] Fetching ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[Marble] API error (${response.status}):`, errorText);
      throw new Error(`Marble API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    let pageItems: MarbleItem[];
    if (Array.isArray(data)) {
      pageItems = data;
    } else if (dataSourceId in data && Array.isArray(data[dataSourceId])) {
      pageItems = data[dataSourceId];
    } else {
      const message = `API response missing expected key "${dataSourceId}". Got keys: ${Object.keys(data ?? {}).join(", ") || "none"}`;
      if (page === 1) {
        throw new Error(`Marble API error: ${message}`);
      }
      console.warn(`[Marble] ${message}`);
      pageItems = [];
    }

    allItems.push(...pageItems);
    console.log(
      `[Marble] Page ${page}: ${pageItems.length} items (${allItems.length} total)`
    );

    // Check if there are more pages
    if (pageItems.length === 0) {
      reachedPaginationLimit = false;
      break;
    }

    const nextPage = getValidatedNextPage(data?.pagination?.nextPage, page);
    if (!nextPage) {
      reachedPaginationLimit = false;
      break;
    }

    page = nextPage;
  }

  if (reachedPaginationLimit) {
    console.warn(
      `[Marble] Reached maximum pagination limit (${MAX_PAGINATION_PAGES} pages)`
    );
  }

  console.log(
    `[Marble] Fetched ${allItems.length} total items from "${dataSourceId}"`
  );

  const fields = getFieldsForResource(dataSourceId);
  const items: FieldDataInput[] = allItems.map((item) =>
    mapItemToFieldData(dataSourceId, item)
  );

  console.log(
    `[Marble] Mapped ${items.length} items with ${fields.length} fields`
  );

  return {
    id: dataSourceId,
    fields,
    items,
  };
}

export function mergeFieldsWithExistingFields(
  sourceFields: readonly ManagedCollectionFieldInput[],
  existingFields: readonly ManagedCollectionFieldInput[]
): ManagedCollectionFieldInput[] {
  return sourceFields.map((sourceField) => {
    const existingField = existingFields.find(
      (existingField) => existingField.id === sourceField.id
    );
    if (existingField) {
      return { ...sourceField, name: existingField.name };
    }
    return sourceField;
  });
}

function getStringFieldValue(
  item: FieldDataInput,
  fieldId: string
): string | null {
  const fieldValue = item[fieldId];
  return fieldValue && typeof fieldValue.value === "string"
    ? fieldValue.value
    : null;
}

function getMarbleItemId(item: FieldDataInput): string | null {
  const marbleId = item.__marbleId;
  return marbleId &&
    typeof marbleId === "object" &&
    "value" in marbleId &&
    typeof marbleId.value === "string"
    ? marbleId.value
    : null;
}

function getSyncedFieldData(
  item: FieldDataInput,
  fields: readonly ManagedCollectionFieldInput[]
): FieldDataInput {
  const fieldData: FieldDataInput = {};

  for (const [fieldName, value] of Object.entries(item)) {
    if (fieldName === "__marbleId" || fieldName === "slug") {
      continue;
    }
    const field = fields.find((field) => field.id === fieldName);
    if (field) {
      fieldData[field.id] = value;
    }
  }

  return fieldData;
}

export async function syncCollection(
  collection: ManagedCollection,
  dataSource: DataSource,
  fields: readonly ManagedCollectionFieldInput[],
  slugField: ManagedCollectionFieldInput
) {
  const items: ManagedCollectionItemInput[] = [];
  const unsyncedItems = new Set(await collection.getItemIds());
  const usedSlugs = new Set<string>();

  for (let i = 0; i < dataSource.items.length; i++) {
    const item = dataSource.items[i];
    if (!item) {
      throw new Error("Logic error");
    }

    const rawSlugValue = getStringFieldValue(item, slugField.id);
    if (!rawSlugValue) {
      console.warn(
        `Skipping item at index ${i} because it doesn't have a valid slug`
      );
      continue;
    }

    const baseSlug =
      slugField.id === "slug"
        ? rawSlugValue.slice(0, MAX_SLUG_LENGTH)
        : slugifyAndTruncate(rawSlugValue);

    const itemId = getMarbleItemId(item) ?? baseSlug;
    const slugValue = ensureUniqueSlug(baseSlug, usedSlugs, itemId);
    usedSlugs.add(slugValue);

    unsyncedItems.delete(slugValue);
    unsyncedItems.delete(itemId);

    items.push({
      id: itemId,
      slug: slugValue,
      draft: false,
      fieldData: getSyncedFieldData(item, fields),
    });
  }

  console.log(
    `[Marble] Syncing ${items.length} items, removing ${unsyncedItems.size} stale items`
  );

  await collection.removeItems(Array.from(unsyncedItems));
  await collection.addItems(items);

  console.log("[Marble] Sync complete");

  await collection.setPluginData(PLUGIN_KEYS.DATA_SOURCE_ID, dataSource.id);
  await collection.setPluginData(PLUGIN_KEYS.SLUG_FIELD_ID, slugField.id);
}

export const syncMethods = [
  "ManagedCollection.removeItems",
  "ManagedCollection.addItems",
  "ManagedCollection.setPluginData",
] as const satisfies ProtectedMethod[];

export async function syncExistingCollection(
  collection: ManagedCollection,
  previousDataSourceId: string | null,
  previousSlugFieldId: string | null,
  apiKey: string | null
): Promise<{ didSync: boolean }> {
  if (!(previousDataSourceId && apiKey)) {
    return { didSync: false };
  }

  if (framer.mode !== "syncManagedCollection") {
    return { didSync: false };
  }

  if (!framer.isAllowedTo(...syncMethods)) {
    return { didSync: false };
  }

  try {
    const dataSource = await getDataSource(previousDataSourceId, apiKey);
    const existingFields = await collection.getFields();

    const slugField =
      dataSource.fields.find((f) => f.id === previousSlugFieldId) ??
      dataSource.fields.find((f) => f.type === "string" && f.id === "slug") ??
      dataSource.fields.find((f) => f.type === "string");

    if (!slugField) {
      console.error("[Marble] No slug field available");
      return { didSync: false };
    }

    await syncCollection(collection, dataSource, existingFields, slugField);
    return { didSync: true };
  } catch (error) {
    console.error("[Marble] syncExistingCollection error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    framer.notify(`Marble sync failed: ${message}`, {
      variant: "error",
    });
    return { didSync: false };
  }
}
