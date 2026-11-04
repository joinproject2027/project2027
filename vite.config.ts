import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import rehypeToc from "./plugins/rehype-toc";

export default defineConfig({
  plugins: [
    mdx({
      remarkPlugins: [
        remarkGfm,
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: "frontmatter" }],
      ],
      // Footnotes ([^name]) are the pages' citations: a visible "Sources" heading, and short ids
      // (#fn-name rather than #user-content-fn-name), since the pages hold only our own writing.
      remarkRehypeOptions: {
        clobberPrefix: "",
        footnoteLabel: "Sources",
        footnoteLabelProperties: {},
        // U+FE0E keeps iOS from drawing the arrow as an emoji.
        footnoteBackContent: (_, rereference) => [
          { type: "text", value: "\u21A9\uFE0E" },
          ...(rereference > 1
            ? [{ type: "element" as const, tagName: "sup", properties: {}, children: [{ type: "text" as const, value: String(rereference) }] }]
            : []),
        ],
      },
      rehypePlugins: [
        rehypeSlug,
        rehypeToc,
        [
          rehypePrettyCode,
          {
            theme: {
              dark: "github-dark",
              light: "github-light",
            },
            keepBackground: false,
          },
        ],
      ],
    }),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
