// Types for importing .mdx and .md files. Imports stay inside each block: a top-level import would
// turn this file into a module and these into augmentations that never match.

declare module "*.mdx" {
  import type { ComponentType } from "react";

  /** The YAML block between --- lines at the top of the file. */
  export const frontmatter: { title?: string; description?: string; [key: string]: unknown };
  /** The page's <h2> and <h3> headings, from plugins/rehype-toc.ts. */
  export const tableOfContents: { depth: 2 | 3; id: string; text: string }[];
  const Component: ComponentType<{ components?: Record<string, ComponentType<any>> }>;
  export default Component;
}

declare module "*.md" {
  import type { ComponentType } from "react";

  /** The YAML block between --- lines at the top of the file. */
  export const frontmatter: { title?: string; description?: string; [key: string]: unknown };
  /** The page's <h2> and <h3> headings, from plugins/rehype-toc.ts. */
  export const tableOfContents: { depth: 2 | 3; id: string; text: string }[];
  const Component: ComponentType<{ components?: Record<string, ComponentType<any>> }>;
  export default Component;
}
