import type { Route } from "./+types/contribute";
import { mdxComponents } from "~/components/citations";
import { SiteHeader } from "~/components/site-header";
import { pageMeta } from "~/lib/meta";
import Contribute, { frontmatter } from "../../content/contribute.mdx";
import "./plan.css";

const title = frontmatter.title ?? "Contribute";

export const meta: Route.MetaFunction = () =>
  pageMeta({ title: `${title} | Project 2027`, description: frontmatter.description, path: "/contribute" });

/** The ways to help, written in content/contribute.mdx. */
export default function ContributePage() {
  return (
    <div className="plan-page">
      <SiteHeader />
      <main className="plan-layout">
        <article className="prose prose-xl prose-site">
          <h1>{title}</h1>
          <Contribute components={mdxComponents} />
        </article>
      </main>
    </div>
  );
}
