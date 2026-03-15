import {
    type FieldDataInput,
    framer,
    type ManagedCollection,
    type ManagedCollectionFieldInput,
    type ManagedCollectionItemInput,
    type ProtectedMethod,
} from "framer-plugin"
import type { Post } from "@usemarble/sdk/models/post"
import type { Category } from "@usemarble/sdk/models/category"
import type { Tag } from "@usemarble/sdk/models/tag"
import type { Author } from "@usemarble/sdk/models/author"

export const PLUGIN_KEYS = {
    DATA_SOURCE_ID: "dataSourceId",
    API_KEY: "apiKey",
} as const

// Use the Vite proxy to bypass CORS. Requests to /marble-api/* are proxied
// to https://api.marblecms.com/* by the dev server (see vite.config.ts).
const MARBLE_API_BASE = "/marble-api/v1"

const MAX_PAGINATION_PAGES = 100

export interface DataSource {
    id: string
    fields: readonly ManagedCollectionFieldInput[]
    items: FieldDataInput[]
}

export const dataSourceOptions = [
    { id: "posts", name: "Posts" },
    { id: "categories", name: "Categories" },
    { id: "tags", name: "Tags" },
    { id: "authors", name: "Authors" },
] as const

// --- Field definitions for each Marble CMS resource ---

const postFields: ManagedCollectionFieldInput[] = [
    { id: "title", name: "Title", type: "string" },
    { id: "content", name: "Content", type: "formattedText" },
    { id: "featured", name: "Featured", type: "boolean" },
    { id: "coverImage", name: "Cover Image", type: "image" },
    { id: "publishedAt", name: "Published At", type: "date" },
    { id: "updatedAt", name: "Updated At", type: "date" },
]

const categoryFields: ManagedCollectionFieldInput[] = [
    { id: "name", name: "Name", type: "string" },
    { id: "description", name: "Description", type: "string" },
]

const tagFields: ManagedCollectionFieldInput[] = [
    { id: "name", name: "Name", type: "string" },
    { id: "description", name: "Description", type: "string" },
]

const authorFields: ManagedCollectionFieldInput[] = [
    { id: "name", name: "Name", type: "string" },
    { id: "bio", name: "Bio", type: "string" },
    { id: "role", name: "Role", type: "string" },
    { id: "image", name: "Image", type: "image" },
]

function getFieldsForResource(resourceId: string): ManagedCollectionFieldInput[] {
    switch (resourceId) {
        case "posts":
            return postFields
        case "categories":
            return categoryFields
        case "tags":
            return tagFields
        case "authors":
            return authorFields
        default:
            return []
    }
}

// Types are imported from @usemarble/sdk/models
type MarbleItem = Post | Category | Tag | Author

// --- Image upload helper ---

const ALLOWED_IMAGE_HOSTS = ["cdn.marblecms.com", "images.marblecms.com", "media.marblecms.com"] as const

function isAllowedImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        return parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.some(host => host === parsed.hostname)
    } catch {
        return false
    }
}

async function uploadImageIfPresent(url: string | null | undefined): Promise<string | null> {
    if (!url || !isAllowedImageUrl(url)) return null

    try {
        const response = await fetch(url)
        if (!response.ok) return null

        const blob = await response.blob()
        const file = new File([blob], "image.jpg", { type: blob.type || "image/jpeg" })
        const asset = await framer.uploadImage(file)
        return asset.id
    } catch (error) {
        console.warn("Failed to upload image:", url, error)
        return null
    }
}

// --- Map API items to Framer field data ---

async function mapPostToFieldData(post: Post): Promise<FieldDataInput> {
    const fieldData: FieldDataInput = {
        title: { type: "string", value: post.title },
        slug: { type: "string", value: post.slug },
        content: {
            type: "formattedText",
            value: post.content || "",
            contentType: "html",
        },
        featured: { type: "boolean", value: post.featured ?? false },
    }

    if (post.publishedAt) {
        fieldData.publishedAt = { type: "date", value: String(post.publishedAt) }
    }

    if (post.updatedAt) {
        fieldData.updatedAt = { type: "date", value: String(post.updatedAt) }
    }

    const uploadedImage = await uploadImageIfPresent(post.coverImage)
    if (uploadedImage) {
        fieldData.coverImage = { type: "image", value: uploadedImage }
    }

    return fieldData
}

function mapCategoryToFieldData(category: Category): FieldDataInput {
    return {
        name: { type: "string", value: category.name },
        slug: { type: "string", value: category.slug },
        description: { type: "string", value: category.description ?? "" },
    }
}

function mapTagToFieldData(tag: Tag): FieldDataInput {
    return {
        name: { type: "string", value: tag.name },
        slug: { type: "string", value: tag.slug },
        description: { type: "string", value: tag.description ?? "" },
    }
}

async function mapAuthorToFieldData(author: Author): Promise<FieldDataInput> {
    const fieldData: FieldDataInput = {
        name: { type: "string", value: author.name },
        slug: { type: "string", value: author.slug },
        bio: { type: "string", value: author.bio ?? "" },
        role: { type: "string", value: author.role ?? "" },
    }

    const uploadedImage = await uploadImageIfPresent(author.image)
    if (uploadedImage) {
        fieldData.image = { type: "image", value: uploadedImage }
    }

    return fieldData
}

async function mapItemToFieldData(resourceId: string, item: MarbleItem): Promise<FieldDataInput> {
    switch (resourceId) {
        case "posts":
            return mapPostToFieldData(item as Post)
        case "categories":
            return mapCategoryToFieldData(item as Category)
        case "tags":
            return mapTagToFieldData(item as Tag)
        case "authors":
            return mapAuthorToFieldData(item as Author)
        default:
            return {}
    }
}

// --- Main data fetching ---

export async function getDataSource(
    dataSourceId: string,
    apiKey: string,
    abortSignal?: AbortSignal
): Promise<DataSource> {
    const allItems: MarbleItem[] = []
    let page = 1

    // Fetch all pages (Marble API max limit is 100 per page)
    while (true) {
        const url = `${MARBLE_API_BASE}/${dataSourceId}?limit=100&page=${page}`
        console.log(`[Marble] Fetching ${url}`)

        const response = await fetch(url, {
            headers: {
                Authorization: apiKey,
            },
            signal: abortSignal,
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error")
            console.error(`[Marble] API error (${response.status}):`, errorText)
            throw new Error(`Marble API error (${response.status}): ${errorText}`)
        }

        const data = await response.json()

        let pageItems: MarbleItem[]
        if (Array.isArray(data)) {
            pageItems = data
        } else if (dataSourceId in data && Array.isArray(data[dataSourceId])) {
            pageItems = data[dataSourceId]
        } else {
            const message = `API response missing expected key "${dataSourceId}". Got keys: ${Object.keys(data ?? {}).join(", ") || "none"}`
            if (page === 1) {
                throw new Error(`Marble API error: ${message}`)
            }
            console.warn(`[Marble] ${message}`)
            pageItems = []
        }

        allItems.push(...pageItems)
        console.log(`[Marble] Page ${page}: ${pageItems.length} items (${allItems.length} total)`)

        // Check if there are more pages
        const nextPage = data?.pagination?.nextPage
        if (!nextPage || pageItems.length === 0) break
        if (page >= MAX_PAGINATION_PAGES) {
            console.warn(`[Marble] Reached maximum pagination limit (${MAX_PAGINATION_PAGES} pages)`)
            break
        }
        page = nextPage
    }

    console.log(`[Marble] Fetched ${allItems.length} total items from "${dataSourceId}"`)

    const fields = getFieldsForResource(dataSourceId)
    const items: FieldDataInput[] = await Promise.all(allItems.map(item => mapItemToFieldData(dataSourceId, item)))

    console.log(`[Marble] Mapped ${items.length} items with ${fields.length} fields`)

    return {
        id: dataSourceId,
        fields,
        items,
    }
}

export function mergeFieldsWithExistingFields(
    sourceFields: readonly ManagedCollectionFieldInput[],
    existingFields: readonly ManagedCollectionFieldInput[]
): ManagedCollectionFieldInput[] {
    return sourceFields.map(sourceField => {
        const existingField = existingFields.find(existingField => existingField.id === sourceField.id)
        if (existingField) {
            return { ...sourceField, name: existingField.name }
        }
        return sourceField
    })
}

export async function syncCollection(
    collection: ManagedCollection,
    dataSource: DataSource,
    fields: readonly ManagedCollectionFieldInput[]
) {
    const items: ManagedCollectionItemInput[] = []
    const unsyncedItems = new Set(await collection.getItemIds())

    for (let i = 0; i < dataSource.items.length; i++) {
        const item = dataSource.items[i]
        if (!item) throw new Error("Logic error")

        // Every Marble resource has a slug — use it directly
        const slugValue = item["slug"]
        if (!slugValue || typeof slugValue.value !== "string") {
            console.warn(`Skipping item at index ${i} because it doesn't have a valid slug`)
            continue
        }

        unsyncedItems.delete(slugValue.value)

        const fieldData: FieldDataInput = {}
        for (const [fieldName, value] of Object.entries(item)) {
            const field = fields.find(field => field.id === fieldName)

            // Field is in the data but skipped based on selected fields.
            if (!field) continue

            fieldData[field.id] = value
        }

        items.push({
            id: slugValue.value,
            slug: slugValue.value,
            draft: false,
            fieldData,
        })
    }

    console.log(`[Marble] Syncing ${items.length} items, removing ${unsyncedItems.size} stale items`)

    await collection.removeItems(Array.from(unsyncedItems))
    await collection.addItems(items)

    console.log(`[Marble] Sync complete`)

    await collection.setPluginData(PLUGIN_KEYS.DATA_SOURCE_ID, dataSource.id)
}

export const syncMethods = [
    "ManagedCollection.removeItems",
    "ManagedCollection.addItems",
    "ManagedCollection.setPluginData",
] as const satisfies ProtectedMethod[]

export async function syncExistingCollection(
    collection: ManagedCollection,
    previousDataSourceId: string | null,
    apiKey: string | null
): Promise<{ didSync: boolean }> {
    if (!previousDataSourceId || !apiKey) {
        return { didSync: false }
    }

    if (framer.mode !== "syncManagedCollection") {
        return { didSync: false }
    }

    if (!framer.isAllowedTo(...syncMethods)) {
        return { didSync: false }
    }

    try {
        const dataSource = await getDataSource(previousDataSourceId, apiKey)
        const existingFields = await collection.getFields()

        await syncCollection(collection, dataSource, existingFields)
        return { didSync: true }
    } catch (error) {
        console.error(`[Marble] syncExistingCollection error:`, error)
        const message = error instanceof Error ? error.message : "Unknown error"
        framer.notify(`Marble sync failed: ${message}`, {
            variant: "error",
        })
        return { didSync: false }
    }
}
