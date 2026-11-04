import type { Route } from "./+types/about";
import { mdxComponents } from "~/components/citations";
import { SiteHeader } from "~/components/site-header";
import { pageMeta } from "~/lib/meta";
import About, { frontmatter } from "../../content/about.mdx";
import "./plan.css";

const title = frontmatter.title ?? "About";

export const meta: Route.MetaFunction = () =>
  pageMeta({ title: `${title} | Project 2027`, description: frontmatter.description, path: "/about" });

/** Who's behind the project, written in content/about.mdx. */
export default function AboutPage() {
  return (
    <div className="plan-page">
      <SiteHeader />
      <main className="plan-layout">
        <article className="prose prose-xl prose-site">
          <h1>{title}</h1>
          <About components={mdxComponents} />
        </article>
      </main>
    </div>
  );
}
