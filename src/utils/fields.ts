import type { ManagedCollectionFieldInput } from "framer-plugin";

export const dataSourceOptions = [
  { id: "posts", name: "Posts" },
  { id: "categories", name: "Categories" },
  { id: "tags", name: "Tags" },
  { id: "authors", name: "Authors" },
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
} satisfies Record<string, ManagedCollectionFieldInput[]>;

export function getFieldsForResource(
  resourceId: string
): ManagedCollectionFieldInput[] {
  return fieldsByResource[resourceId as keyof typeof fieldsByResource] ?? [];
}
