import { useEffect, type ComponentProps } from "react";
import { Link, useLocation } from "react-router";
import "./citations.css";

/**
 * Marks the element the URL's #hash names with `data-target`. CSS's :target only follows the
 * browser's own jumps, and in-page links here go through the router (see `InPageLink`).
 */
function useTargetMark() {
  const { hash } = useLocation();
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    target?.setAttribute("data-target", "");
    return () => {
      target?.removeAttribute("data-target");
    };
  }, [hash]);
}

/**
 * A page's sources. Citations are written as Markdown footnotes: `claim.[^name]` in the text and
 * `[^name]: Publisher, [Title](url), date.` anywhere in the file. remark-gfm numbers them in the
 * order they're cited and collects them into a <section data-footnotes> at the end, which MDX
 * hands to this through `mdxComponents`.
 */
export function Citations(props: ComponentProps<"section">) {
  useTargetMark();
  return <section {...props} className="citations" />;
}

/**
 * A link to somewhere on the same page. A plain <a href="#id"> would make the router restore an
 * old scroll position instead of jumping; through the router, the jump lands and Back returns to
 * where the reader was.
 */
export function InPageLink({ href, ...props }: ComponentProps<"a"> & { href: `#${string}` }) {
  return <Link to={href} {...props} />;
}

/**
 * Components for an MDX page that has citations. Links within the site go through the router too,
 * so other pages open without a full reload.
 */
export const mdxComponents = {
  a: ({ href, ...props }: ComponentProps<"a">) =>
    href?.startsWith("#") || href?.startsWith("/") ? <Link to={href} {...props} /> : <a href={href} {...props} />,
  section: (props: ComponentProps<"section"> & { "data-footnotes"?: unknown }) =>
    props["data-footnotes"] ? <Citations {...props} /> : <section {...props} />,
};
