import type { Route } from "./+types/plan";
import { mdxComponents } from "~/components/citations";
import { SiteHeader } from "~/components/site-header";
import { pageMeta } from "~/lib/meta";
import { nestHeadings, TableOfContents, type TocSection } from "~/components/table-of-contents";
import Plan, { frontmatter, tableOfContents } from "../../content/plan.mdx";
import "./plan.css";

const title = frontmatter.title ?? "The plan";

/**
 * The headings up to the FAQ are the plan itself, so the contents gather them into one section,
 * led by the introduction (which has no heading of its own, so it links to the title). The FAQ,
 * the implementers' notes and the sources follow, each with its own subheadings.
 */
const firstAfterPlan = tableOfContents.findIndex((entry) => entry.id === "common-concerns-and-faqs");
const planHeadings = firstAfterPlan === -1 ? [] : tableOfContents.slice(0, firstAfterPlan);
const contents: TocSection[] = [
  {
    id: "introduction",
    text: title,
    children: [{ id: "introduction", text: "Introduction" }, ...planHeadings.map(({ id, text }) => ({ id, text }))],
  },
  ...nestHeadings(tableOfContents.slice(planHeadings.length)),
];

export const meta: Route.MetaFunction = () =>
  pageMeta({ title: `${title} | Project 2027`, description: frontmatter.description, path: "/plan" });

/** The plan, written in content/plan.mdx. */
export default function PlanPage() {
  return (
    <div className="plan-page">
      <SiteHeader />
      <main className="plan-layout">
        <TableOfContents sections={contents} />
        <article className="prose prose-xl prose-site">
          <h1 id="introduction">{title}</h1>
          <Plan components={mdxComponents} />
        </article>
      </main>
    </div>
  );
}
