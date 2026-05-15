import type { Author } from "@usemarble/sdk/models/author";
import type { Category } from "@usemarble/sdk/models/category";
import type { Post } from "@usemarble/sdk/models/post";
import type { Tag } from "@usemarble/sdk/models/tag";
import type { FieldDataInput } from "framer-plugin";
import type { MarbleItem } from "../types";
import { sanitizeHtml } from "./sanitize";
import { isAllowedImageUrl } from "./url";

function mapPostToFieldData(post: Post): FieldDataInput {
  const fieldData: FieldDataInput = {
    __marbleId: { type: "string", value: post.id },
    title: { type: "string", value: post.title },
    slug: { type: "string", value: post.slug },
    content: {
      type: "formattedText",
      value: sanitizeHtml(post.content || ""),
      contentType: "html",
    },
    featured: { type: "boolean", value: post.featured ?? false },
  };

  if (post.publishedAt) {
    fieldData.publishedAt = { type: "date", value: String(post.publishedAt) };
  }

  if (post.updatedAt) {
    fieldData.updatedAt = { type: "date", value: String(post.updatedAt) };
  }

  if (post.coverImage && isAllowedImageUrl(post.coverImage)) {
    fieldData.coverImage = { type: "image", value: post.coverImage };
  }

  return fieldData;
}

function mapCategoryToFieldData(category: Category): FieldDataInput {
  return {
    __marbleId: { type: "string", value: category.id },
    name: { type: "string", value: category.name },
    slug: { type: "string", value: category.slug },
    description: { type: "string", value: category.description ?? "" },
  };
}

function mapTagToFieldData(tag: Tag): FieldDataInput {
  return {
    __marbleId: { type: "string", value: tag.id },
    name: { type: "string", value: tag.name },
    slug: { type: "string", value: tag.slug },
    description: { type: "string", value: tag.description ?? "" },
  };
}

function mapAuthorToFieldData(author: Author): FieldDataInput {
  const fieldData: FieldDataInput = {
    __marbleId: { type: "string", value: author.id },
    name: { type: "string", value: author.name },
    slug: { type: "string", value: author.slug },
    bio: { type: "string", value: author.bio ?? "" },
    role: { type: "string", value: author.role ?? "" },
  };

  if (author.image && isAllowedImageUrl(author.image)) {
    fieldData.image = { type: "image", value: author.image };
  }

  return fieldData;
}

export function mapItemToFieldData(
  resourceId: string,
  item: MarbleItem
): FieldDataInput {
  switch (resourceId) {
    case "posts":
      return mapPostToFieldData(item as Post);
    case "categories":
      return mapCategoryToFieldData(item as Category);
    case "tags":
      return mapTagToFieldData(item as Tag);
    case "authors":
      return mapAuthorToFieldData(item as Author);
    default:
      return {};
  }
}
