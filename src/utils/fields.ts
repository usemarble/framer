import type { ManagedCollectionFieldInput } from "framer-plugin";

export const dataSourceOptions = [
  { id: "posts", name: "Posts" },
  { id: "categories", name: "Categories" },
  { id: "tags", name: "Tags" },
  { id: "authors", name: "Authors" },
  { id: "media", name: "Media" },
] as const;

const fieldsByResource = {
  posts: [
    { id: "title", name: "Title", type: "string" },
    { id: "slug", name: "Slug", type: "string" },
    { id: "content", name: "Content", type: "formattedText" },
    { id: "featured", name: "Featured", type: "boolean" },
    { id: "coverImage", name: "Cover Image", type: "image" },
    { id: "publishedAt", name: "Published At", type: "date" },
    { id: "updatedAt", name: "Updated At", type: "date" },
  ],
  categories: [
    { id: "name", name: "Name", type: "string" },
    { id: "slug", name: "Slug", type: "string" },
    { id: "description", name: "Description", type: "string" },
  ],
  tags: [
    { id: "name", name: "Name", type: "string" },
    { id: "slug", name: "Slug", type: "string" },
    { id: "description", name: "Description", type: "string" },
  ],
  authors: [
    { id: "name", name: "Name", type: "string" },
    { id: "slug", name: "Slug", type: "string" },
    { id: "bio", name: "Bio", type: "string" },
    { id: "role", name: "Role", type: "string" },
    { id: "image", name: "Image", type: "image" },
  ],
  media: [
    { id: "name", name: "Name", type: "string" },
    { id: "type", name: "Type", type: "string" },
    { id: "preview", name: "Preview", type: "image" },
    { id: "file", name: "File", type: "file", allowedFileTypes: ["*"] },
    { id: "url", name: "URL", type: "link" },
    { id: "alt", name: "Alt Text", type: "string" },
    { id: "size", name: "Size", type: "number" },
    { id: "width", name: "Width", type: "number" },
    { id: "height", name: "Height", type: "number" },
    { id: "duration", name: "Duration", type: "number" },
    { id: "createdAt", name: "Created At", type: "date" },
    { id: "updatedAt", name: "Updated At", type: "date" },
  ],
} satisfies Record<string, ManagedCollectionFieldInput[]>;

export function getFieldsForResource(
  resourceId: string
): ManagedCollectionFieldInput[] {
  return fieldsByResource[resourceId as keyof typeof fieldsByResource] ?? [];
}
