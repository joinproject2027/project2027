import type { Route } from "./+types/linux-licensing";
import { mdxComponents } from "~/components/citations";
import { SiteHeader } from "~/components/site-header";
import { pageMeta } from "~/lib/meta";
import Analysis, { frontmatter } from "../../content/linux-licensing.mdx";
import "./plan.css";

const title = frontmatter.title ?? "What if Linux cost as much as Windows?";

export const meta: Route.MetaFunction = () =>
  pageMeta({ title: `${title} | Project 2027`, description: frontmatter.description, path: "/plan/linux-licensing" });

/** The math behind the plan's estimate of Linux's worth, written in content/linux-licensing.mdx. */
export default function LinuxLicensingPage() {
  return (
    <div className="plan-page">
      <SiteHeader />
      <main className="plan-layout">
        <article className="prose prose-xl prose-site">
          <h1>{title}</h1>
          <Analysis components={mdxComponents} />
        </article>
      </main>
    </div>
  );
}
