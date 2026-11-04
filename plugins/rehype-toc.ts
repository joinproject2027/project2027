/**
 * Exports an MDX page's section headings as `tableOfContents`, for the page to list beside it:
 *
 *   import Page, { tableOfContents } from "./page.mdx";
 *   // [{ depth: 2, id: "phase-1-build", text: "Phase 1: Build" }, ...]
 *
 * Runs after rehype-slug, which gives each heading its id. Takes <h2> and <h3>, including the
 * "Sources" heading remark-gfm adds above the footnotes.
 */

/** The parts of a hast node this plugin reads or writes. */
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  data?: unknown;
}

export interface TocEntry {
  depth: 2 | 3;
  id: string;
  text: string;
}

const DEPTHS: Record<string, TocEntry["depth"]> = { h2: 2, h3: 3 };

/** A heading's text, leaving out footnote numbers. */
function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  if (node.tagName === "sup") return "";
  return (node.children ?? []).map(textOf).join("");
}

/** An estree expression for a JSON-like value. */
function toEstree(value: unknown): object {
  if (Array.isArray(value)) return { type: "ArrayExpression", elements: value.map(toEstree) };
  if (value && typeof value === "object") {
    return {
      type: "ObjectExpression",
      properties: Object.entries(value).map(([key, item]) => ({
        type: "Property",
        kind: "init",
        method: false,
        shorthand: false,
        computed: false,
        key: { type: "Identifier", name: key },
        value: toEstree(item),
      })),
    };
  }
  return { type: "Literal", value };
}

/** An MDX `export const name = value` node. */
function esmExport(name: string, value: unknown): HastNode {
  return {
    type: "mdxjsEsm",
    value: "",
    data: {
      estree: {
        type: "Program",
        sourceType: "module",
        body: [
          {
            type: "ExportNamedDeclaration",
            specifiers: [],
            source: null,
            attributes: [],
            declaration: {
              type: "VariableDeclaration",
              kind: "const",
              declarations: [
                { type: "VariableDeclarator", id: { type: "Identifier", name }, init: toEstree(value) },
              ],
            },
          },
        ],
      },
    },
  };
}

export default function rehypeToc() {
  return (tree: HastNode) => {
    const entries: TocEntry[] = [];
    const visit = (node: HastNode) => {
      const depth = node.type === "element" ? DEPTHS[node.tagName ?? ""] : undefined;
      const id = node.properties?.id;
      if (depth && typeof id === "string") {
        entries.push({ depth, id, text: textOf(node).trim() });
        return;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
    (tree.children ??= []).push(esmExport("tableOfContents", entries));
  };
}
