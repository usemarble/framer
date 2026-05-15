import type { Author } from "@usemarble/sdk/models/author";
import type { Category } from "@usemarble/sdk/models/category";
import type { Post } from "@usemarble/sdk/models/post";
import type { Tag } from "@usemarble/sdk/models/tag";
import type {
  FieldDataInput,
  ManagedCollectionFieldInput,
} from "framer-plugin";

export type MarbleItem = Post | Category | Tag | Author;

export interface DataSource {
  fields: readonly ManagedCollectionFieldInput[];
  id: string;
  items: FieldDataInput[];
}
